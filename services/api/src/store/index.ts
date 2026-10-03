import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoRoomStore } from './dynamo';
import { MemoryRoomStore } from './memory';
import type { RoomStore } from './types';

/** DynamoDB when TABLE_NAME is set (production, or DynamoDB Local), memory otherwise. */
export function storeFromEnv(env: Record<string, string | undefined> = process.env): RoomStore {
  if (!env.TABLE_NAME) return new MemoryRoomStore();
  const client = new DynamoDBClient(env.DYNAMODB_ENDPOINT ? { endpoint: env.DYNAMODB_ENDPOINT } : {});
  return new DynamoRoomStore(env.TABLE_NAME, client);
}

export type { RoomStore } from './types';
