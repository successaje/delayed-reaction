import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { AddressInfo } from 'node:net';
// dynalite ships no types; it's a pure-JS DynamoDB emulator used only in tests.
// @ts-expect-error untyped module
import dynalite from 'dynalite';

/** Starts an in-process DynamoDB emulator and creates the production table shape. */
export async function startDynamoLocal(table = 'delayed-reaction-test') {
  const server = dynalite({ createTableMs: 0, deleteTableMs: 0, updateTableMs: 0 });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const client = new DynamoDBClient({
    endpoint: `http://127.0.0.1:${port}`,
    region: 'local',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  await client.send(
    new CreateTableCommand({
      TableName: table,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
  return {
    client,
    table,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
