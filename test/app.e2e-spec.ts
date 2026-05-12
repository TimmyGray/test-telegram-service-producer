import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { GlobalExceptionFilter } from '../src/infrastructure/filters/global-exception.filter';
import { BrokerConfig } from '../src/infrastructure/broker/broker.config';
import { IBrokerService } from '../src/infrastructure/broker/broker.interface';
import { MessagePublishError } from '../src/infrastructure/broker/errors';
import { SenderController } from '../src/sender/sender.controller';
import { SenderService } from '../src/sender/sender.service';

const EXCHANGE_NAME = 'topic.producer.send-message.consumer';
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type BrokerPublishMock = (
  exchange: string,
  message: string,
  routingKey?: string,
) => Promise<{ confirmed: boolean; attempts: number }>;

describe('SenderController (e2e)', () => {
  let app: INestApplication<App>;
  let brokerServiceMock: { publish: jest.Mock<BrokerPublishMock> };

  beforeEach(async () => {
    brokerServiceMock = {
      publish: jest.fn<BrokerPublishMock>(async () => ({
        confirmed: true,
        attempts: 1,
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SenderController],
      providers: [
        SenderService,
        {
          provide: IBrokerService,
          useValue: brokerServiceMock,
        },
        {
          provide: BrokerConfig,
          useValue: {
            uri: 'amqp://guest:guest@localhost:5672',
            exchanges: [{ name: EXCHANGE_NAME, type: 'topic' }],
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  it('/v1/sender (POST) returns success', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/sender')
      .send({ userId: 123, text: 'Hello world' })
      .expect(201);

    const body = response.body as {
      status: string;
      message: string;
      eventId: string;
      attempts: number;
    };

    expect(body.status).toBe('success');
    expect(body.message).toBe('Message sent successfully');
    expect(body.eventId).toMatch(UUID_V4_REGEX);
    expect(body.attempts).toBe(1);
  });

  it('/v1/sender (POST) returns validation error payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/sender')
      .send({ userId: 'invalid', text: '' })
      .expect(400);

    const body = response.body as {
      statusCode: number;
      path: string;
      message: string | string[];
    };

    expect(body.statusCode).toBe(400);
    expect(body.path).toBe('/v1/sender');
    expect(Array.isArray(body.message)).toBe(true);
  });

  it('/v1/sender (POST) rejects unknown fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/sender')
      .send({ userId: 123, text: 'Hello world', unexpected: 'field' })
      .expect(400);

    const body = response.body as {
      statusCode: number;
      path: string;
      message: string | string[];
    };

    expect(body.statusCode).toBe(400);
    expect(body.path).toBe('/v1/sender');
    expect(Array.isArray(body.message)).toBe(true);
    expect((body.message as string[]).some((item) => item.includes('unexpected'))).toBe(true);
  });

  it('/v1/sender (POST) returns broker failure payload', async () => {
    brokerServiceMock.publish.mockRejectedValueOnce(
      new MessagePublishError(3, new Error('RabbitMQ connection is not established')),
    );

    const response = await request(app.getHttpServer())
      .post('/v1/sender')
      .send({ userId: 123, text: 'Hello world' })
      .expect(503);

    const body = response.body as {
      statusCode: number;
      path: string;
      message: string;
      errorCode?: string;
      details?: {
        attempts: number;
        cause: string;
      };
    };

    expect(body.statusCode).toBe(503);
    expect(body.path).toBe('/v1/sender');
    expect(body.message).toBe('Failed to publish message after 3 attempt(s)');
    expect(body.errorCode).toBe('BROKER_PUBLISH_FAILED');
    expect(body.details).toEqual({
      attempts: 3,
      cause: 'RabbitMQ connection is not established',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
