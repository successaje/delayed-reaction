import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Distribution, ViewerProtocolPolicy, CachePolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import { existsSync } from 'node:fs';
import path from 'node:path';

export interface DelayedReactionStackProps extends StackProps {
  readonly webOrigin: string;
}

const root = path.resolve(__dirname, '../..');

/**
 * Everything the product needs in AWS:
 *  - a single DynamoDB table (rooms, viewers, reactions) with TTL and an insertion-order index,
 *  - the Hono API as one Lambda behind an HTTP API,
 *  - match media in a private S3 bucket served through CloudFront.
 */
export class DelayedReactionStack extends Stack {
  constructor(scope: Construct, id: string, props: DelayedReactionStackProps) {
    super(scope, id, props);

    const table = new Table(this, 'Rooms', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: AttributeType.NUMBER },
    });

    const media = new Bucket(this, 'Media', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const cdn = new Distribution(this, 'MediaCdn', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(media),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
    });
    // Demo media is generated locally by scripts/fetch-demo-media.sh (it isn't in git).
    const mediaDir = path.join(root, 'apps/web/public/media');
    if (existsSync(mediaDir)) {
      new BucketDeployment(this, 'MediaUpload', {
        sources: [Source.asset(mediaDir)],
        destinationBucket: media,
        distribution: cdn,
        memoryLimit: 1024,
      });
    }

    const api = new Function(this, 'Api', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'lambda.handler',
      code: Code.fromAsset(path.join(root, 'services/api/dist')),
      memorySize: 512,
      timeout: Duration.seconds(10),
      logGroup: new LogGroup(this, 'ApiLogs', {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        TABLE_NAME: table.tableName,
        MEDIA_BASE_URL: `https://${cdn.distributionDomainName}/`,
        CORS_ORIGINS: props.webOrigin,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });
    table.grantReadWriteData(api);

    const http = new HttpApi(this, 'HttpApi', {
      defaultIntegration: new HttpLambdaIntegration('ApiIntegration', api),
    });

    new CfnOutput(this, 'ApiUrl', { value: http.apiEndpoint });
    new CfnOutput(this, 'MediaUrl', { value: `https://${cdn.distributionDomainName}/` });
    new CfnOutput(this, 'TableName', { value: table.tableName });
  }
}
