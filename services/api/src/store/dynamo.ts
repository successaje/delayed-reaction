import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { sortKey, type PositionReport } from '@delayed-reaction/core';
import type {
  StoredPrediction,
  StoredResult,
  ReactionQuery,
  ReactionQueryResult,
  RoomStore,
  StoredReaction,
  StoredRoom,
  StoredViewer,
} from './types';

/**
 * Single-table DynamoDB store.
 *
 *   PK            SK                          item
 *   ROOM#<code>   META                        room, plus `seq` and `viewerCount` counters
 *   ROOM#<code>   VIEWER#<id>                 viewer, including the last position report
 *   ROOM#<code>   RX#<positionKey>#<id>       reaction, range-queried by match position
 *   ROOM#<code>   RXID#<id>                   idempotency guard pointing at the reaction's SK
 *   ROOM#<code>   PRED#<viewerId>             "Call it" prediction
 *   ROOM#<code>   RESULT                      final score, first writer wins
 *
 *   GSI1: GSI1PK = ROOM#<code>, GSI1SK = seq  (reactions by insertion order)
 *
 * Every item carries `expiresAt` (epoch seconds) for DynamoDB TTL.
 *
 * Invariants rely on single-item conditional writes rather than transactions: the room code is
 * claimed by a conditional put on META, the viewer cap by a conditional counter update, and
 * reaction idempotency by a conditional put on the RXID guard. A crash between two writes can
 * leave a counter one high or a sequence number unused, which is harmless.
 */
export class DynamoRoomStore implements RoomStore {
  private readonly doc: DynamoDBDocumentClient;

  constructor(
    private readonly table: string,
    client: DynamoDBClient = new DynamoDBClient({}),
    /**
     * Reactions are written just after their sequence number is allocated, so a query can
     * briefly see a later number before an earlier write lands. Holding the cursor this many
     * numbers back trades a few duplicate deliveries (clients de-duplicate) for no misses.
     */
    private readonly seqSafetyMargin = 3,
  ) {
    this.doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async createRoom(room: StoredRoom, host: StoredViewer): Promise<boolean> {
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.table,
          Item: { PK: pk(room.code), SK: 'META', ...room, seq: 0, viewerCount: 1 },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false;
      throw error;
    }
    await this.putViewer(host, room.expiresAt);
    return true;
  }

  async getRoom(code: string): Promise<StoredRoom | null> {
    const { Item } = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { PK: pk(code), SK: 'META' } }),
    );
    return Item ? toRoom(Item) : null;
  }

  async listViewers(code: string): Promise<StoredViewer[]> {
    const items = await this.queryAll({
      TableName: this.table,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': pk(code), ':prefix': 'VIEWER#' },
    });
    return items.map(toViewer).sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async getViewer(code: string, viewerId: string): Promise<StoredViewer | null> {
    const { Item } = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { PK: pk(code), SK: viewerSk(viewerId) } }),
    );
    return Item ? toViewer(Item) : null;
  }

  async addViewer(viewer: StoredViewer, maxViewers: number): Promise<'ok' | 'full'> {
    let expiresAt: number;
    try {
      const { Attributes } = await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { PK: pk(viewer.roomCode), SK: 'META' },
          UpdateExpression: 'ADD viewerCount :one',
          ConditionExpression: 'attribute_exists(PK) AND viewerCount < :max',
          ExpressionAttributeValues: { ':one': 1, ':max': maxViewers },
          ReturnValues: 'ALL_NEW',
        }),
      );
      expiresAt = Number(Attributes?.expiresAt);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return 'full';
      throw error;
    }
    await this.putViewer(viewer, expiresAt);
    return 'ok';
  }

  async updateReport(code: string, viewerId: string, report: PositionReport): Promise<void> {
    try {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { PK: pk(code), SK: viewerSk(viewerId) },
          UpdateExpression: 'SET #report = :report',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeNames: { '#report': 'report' },
          ExpressionAttributeValues: { ':report': report },
        }),
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
    }
  }

  async addReaction(
    reaction: Omit<StoredReaction, 'seq'>,
  ): Promise<{ reaction: StoredReaction; created: boolean }> {
    const existing = await this.findReaction(reaction.roomCode, reaction.id);
    if (existing) return { reaction: existing, created: false };

    const { Attributes } = await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { PK: pk(reaction.roomCode), SK: 'META' },
        UpdateExpression: 'ADD seq :one',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: { ':one': 1 },
        ReturnValues: 'ALL_NEW',
      }),
    );
    const seq = Number(Attributes?.seq);
    const expiresAt = Number(Attributes?.expiresAt);
    const stored: StoredReaction = { ...reaction, seq };
    const sk = reactionSk(stored);

    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.table,
          Item: { PK: pk(reaction.roomCode), SK: `RXID#${reaction.id}`, reactionSk: sk, expiresAt },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
    } catch (error) {
      // Lost a race with a retry of the same reaction: return the one that won.
      if (error instanceof ConditionalCheckFailedException) {
        const winner = await this.findReaction(reaction.roomCode, reaction.id);
        if (winner) return { reaction: winner, created: false };
      }
      throw error;
    }
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          PK: pk(reaction.roomCode),
          SK: sk,
          GSI1PK: pk(reaction.roomCode),
          GSI1SK: seq,
          posKey: sortKey(reaction.position),
          ...stored,
          expiresAt,
        },
      }),
    );
    return { reaction: stored, created: true };
  }

  async queryReactions(code: string, query: ReactionQuery): Promise<ReactionQueryResult> {
    const room = await this.doc.send(
      new GetCommand({
        TableName: this.table,
        Key: { PK: pk(code), SK: 'META' },
        ProjectionExpression: 'seq',
      }),
    );
    const latestSeq = Number(room.Item?.seq ?? 0);

    // `~` sorts after every id character, so it makes an exclusive lower and inclusive upper bound.
    const lower = query.afterKey === null ? 'RX#' : `RX#${query.afterKey}~`;
    const upper = `RX#${query.untilKey}~`;
    const byPosition =
      lower < upper
        ? await this.queryAll({
            TableName: this.table,
            KeyConditionExpression: 'PK = :pk AND SK BETWEEN :lo AND :hi',
            ExpressionAttributeValues: { ':pk': pk(code), ':lo': lower, ':hi': upper },
          })
        : [];

    const bySeq =
      query.afterKey === null || latestSeq <= query.afterSeq
        ? []
        : await this.queryAll({
            TableName: this.table,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :after',
            FilterExpression: 'posKey <= :until',
            ExpressionAttributeValues: {
              ':pk': pk(code),
              ':after': query.afterSeq,
              ':until': query.untilKey,
            },
          });

    const unique = new Map<string, StoredReaction>();
    for (const item of [...byPosition, ...bySeq]) unique.set(item.id as string, toReaction(item));
    const reactions = [...unique.values()].sort(
      (a, b) => sortKey(a.position).localeCompare(sortKey(b.position)) || a.seq - b.seq,
    );
    return {
      reactions,
      seenSeq: Math.max(query.afterSeq, latestSeq - this.seqSafetyMargin),
    };
  }

  async putPrediction(code: string, prediction: StoredPrediction): Promise<void> {
    const room = await this.getRoom(code);
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: pk(code), SK: `PRED#${prediction.viewerId}`, ...prediction, expiresAt: room?.expiresAt },
      }),
    );
  }

  async listPredictions(code: string): Promise<StoredPrediction[]> {
    const items = await this.queryAll({
      TableName: this.table,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': pk(code), ':prefix': 'PRED#' },
    });
    return items
      .map((i) => ({
        viewerId: i.viewerId as string,
        home: Number(i.home),
        away: Number(i.away),
        createdAt: Number(i.createdAt),
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async getResult(code: string): Promise<StoredResult | null> {
    const { Item } = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { PK: pk(code), SK: 'RESULT' } }),
    );
    return Item
      ? {
          home: Number(Item.home),
          away: Number(Item.away),
          position: Item.position as StoredResult['position'],
          setBy: Item.setBy as string,
        }
      : null;
  }

  async setResult(code: string, result: StoredResult): Promise<StoredResult> {
    const room = await this.getRoom(code);
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.table,
          Item: { PK: pk(code), SK: 'RESULT', ...result, expiresAt: room?.expiresAt },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
      return result;
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) throw error;
      return (await this.getResult(code))!;
    }
  }

  private async putViewer(viewer: StoredViewer, expiresAt: number): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: pk(viewer.roomCode), SK: viewerSk(viewer.id), ...viewer, expiresAt },
      }),
    );
  }

  private async findReaction(code: string, id: string): Promise<StoredReaction | null> {
    const guard = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { PK: pk(code), SK: `RXID#${id}` } }),
    );
    const sk = guard.Item?.reactionSk as string | undefined;
    if (!sk) return null;
    const { Item } = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { PK: pk(code), SK: sk } }),
    );
    return Item ? toReaction(Item) : null;
  }

  private async queryAll(input: QueryCommandInput): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const page = await this.doc.send(new QueryCommand({ ...input, ExclusiveStartKey: start }));
      items.push(...(page.Items ?? []));
      start = page.LastEvaluatedKey;
    } while (start);
    return items;
  }
}

const pk = (code: string) => `ROOM#${code}`;
const viewerSk = (id: string) => `VIEWER#${id}`;
const reactionSk = (r: Pick<StoredReaction, 'position' | 'id'>) => `RX#${sortKey(r.position)}#${r.id}`;

function toRoom(item: Record<string, unknown>): StoredRoom {
  return {
    code: item.code as string,
    title: item.title as string,
    sport: item.sport as StoredRoom['sport'],
    programId: (item.programId as string | undefined) ?? null,
    hostId: item.hostId as string,
    createdAt: Number(item.createdAt),
    expiresAt: Number(item.expiresAt),
  };
}

function toViewer(item: Record<string, unknown>): StoredViewer {
  return {
    id: item.id as string,
    roomCode: item.roomCode as string,
    name: item.name as string,
    color: item.color as string,
    clockSource: item.clockSource as StoredViewer['clockSource'],
    linkedTo: (item.linkedTo as string | undefined) ?? null,
    deviceLabel: (item.deviceLabel as string | undefined) ?? null,
    joinedAt: Number(item.joinedAt),
    tokenHash: item.tokenHash as string,
    report: (item.report as PositionReport | undefined) ?? null,
  };
}

function toReaction(item: Record<string, unknown>): StoredReaction {
  return {
    id: item.id as string,
    roomCode: item.roomCode as string,
    viewerId: item.viewerId as string,
    position: item.position as StoredReaction['position'],
    body: item.body as StoredReaction['body'],
    createdAt: Number(item.createdAt),
    seq: Number(item.seq),
  };
}
