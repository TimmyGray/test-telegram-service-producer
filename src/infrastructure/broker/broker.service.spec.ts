import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BrokerConfig } from './broker.config';
import { MessagePublishError } from './errors';
import { BrokerService } from './broker.service';

describe('BrokerService', () => {
    let connected = true;
    type PublishFn = (
        exchange: string,
        routingKey: string,
        message: unknown,
    ) => Promise<boolean>;
    let publishMock: jest.Mock<PublishFn>;
    let service: BrokerService;

    beforeEach(() => {
        connected = true;
        publishMock = jest.fn<PublishFn>();

        const amqpConnection = {
            get connected() {
                return connected;
            },
            publish: publishMock,
        } as unknown as AmqpConnection;

        const brokerConfig = {
            uri: 'amqp://guest:guest@localhost:5672',
            exchanges: [{ name: 'topic.producer.send-message.consumer', type: 'topic' }],
            retry: {
                maxAttempts: 3,
                delayMs: 0,
            },
        } as BrokerConfig;

        service = new BrokerService(amqpConnection, brokerConfig);
    });

    it('should publish on first attempt when broker confirms', async () => {
        publishMock.mockResolvedValue(true);

        const result = await service.publish(
            'topic.producer.send-message.consumer',
            '{"hello":"world"}',
            'send-message',
        );

        expect(result).toEqual({ confirmed: true, attempts: 1 });
        expect(publishMock).toHaveBeenCalledTimes(1);
        expect(publishMock).toHaveBeenCalledWith(
            'topic.producer.send-message.consumer',
            'send-message',
            '{"hello":"world"}',
        );
    });

    it('should retry transient failures and then return success', async () => {
        const transientError = new Error('Socket closed unexpectedly') as NodeJS.ErrnoException;
        transientError.code = 'ECONNRESET';

        publishMock
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce(true);

        const result = await service.publish('exchange', 'payload', 'route');

        expect(result).toEqual({ confirmed: true, attempts: 2 });
        expect(publishMock).toHaveBeenCalledTimes(2);
    });

    it('should throw MessagePublishError when publish is not confirmed', async () => {
        publishMock.mockResolvedValue(false);

        await expect(service.publish('exchange', 'payload', 'route')).rejects.toMatchObject({
            name: MessagePublishError.name,
            errorCode: 'BROKER_PUBLISH_FAILED',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            details: {
                attempts: 1,
                cause: 'Broker publish was not confirmed',
            },
        });

        expect(publishMock).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-transient broker errors', async () => {
        publishMock.mockRejectedValue(new Error('Permission denied'));

        await expect(service.publish('exchange', 'payload', 'route')).rejects.toMatchObject({
            name: MessagePublishError.name,
            errorCode: 'BROKER_PUBLISH_FAILED',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            details: {
                attempts: 1,
                cause: 'Permission denied',
            },
        });

        expect(publishMock).toHaveBeenCalledTimes(1);
    });

    it('should honor configured maxAttempts for transient failures', async () => {
        const transientError = new Error('Socket closed unexpectedly') as NodeJS.ErrnoException;
        transientError.code = 'ECONNRESET';

        publishMock
            .mockRejectedValueOnce(transientError)
            .mockRejectedValueOnce(transientError)
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce(true);

        const customConfig = {
            uri: 'amqp://guest:guest@localhost:5672',
            exchanges: [{ name: 'topic.producer.send-message.consumer', type: 'topic' }],
            retry: {
                maxAttempts: 4,
                delayMs: 0,
            },
        } as BrokerConfig;

        const amqpConnection = {
            get connected() {
                return connected;
            },
            publish: publishMock,
        } as unknown as AmqpConnection;

        const serviceWithFourAttempts = new BrokerService(amqpConnection, customConfig);
        const result = await serviceWithFourAttempts.publish('exchange', 'payload', 'route');

        expect(result).toEqual({ confirmed: true, attempts: 4 });
        expect(publishMock).toHaveBeenCalledTimes(4);
    });

    it('should throw MessagePublishError after retries when connection stays down', async () => {
        connected = false;

        await expect(service.publish('exchange', 'payload', 'route')).rejects.toMatchObject({
            name: MessagePublishError.name,
            errorCode: 'BROKER_PUBLISH_FAILED',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            details: {
                attempts: 3,
                cause: 'RabbitMQ connection is not established',
            },
        });

        expect(publishMock).not.toHaveBeenCalled();
    });
});
