import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SenderService } from './sender.service';
import { BrokerConfig } from '../infrastructure/broker/broker.config';
import { IBrokerService } from '../infrastructure/broker/broker.interface';
import { ExchangeNotFoundError } from '../infrastructure/broker/errors';
import type { BrokerPublishResult } from '../infrastructure/broker/broker.interface';
import type { ISenderEvent } from './sender.interface';

const EXCHANGE_NAME = 'topic.producer.send-message.consumer';
const ROUTING_KEY = 'send-message';

describe('SenderService', () => {
    let senderService: SenderService;

    const brokerService = {
        publish: jest.fn<
            (
                exchange: string,
                message: unknown,
                routingKey?: string,
            ) => Promise<BrokerPublishResult>
        >(),
    };

    beforeEach(async () => {
        brokerService.publish.mockReset();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                SenderService,
                {
                    provide: IBrokerService,
                    useValue: brokerService,
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

        senderService = moduleRef.get(SenderService);
    });

    it('should publish serialized JSON event', async () => {
        brokerService.publish.mockResolvedValue({ confirmed: true, attempts: 1 });

        const message = { userId: 42, text: 'Hello RabbitMQ' };
        const result = await senderService.sendMessage(message);

        expect(result.confirmed).toBe(true);
        expect(result.attempts).toBe(1);
        expect(result.eventId).toBeTruthy();

        expect(brokerService.publish).toHaveBeenCalledTimes(1);

        const [exchange, payload, routingKey] =
            brokerService.publish.mock.calls[0];

        expect(exchange).toBe(EXCHANGE_NAME);
        expect(routingKey).toBe(ROUTING_KEY);

        const event = payload as ISenderEvent;
        expect(event.eventId).toBe(result.eventId);
        expect(new Date(event.occurredAt).toString()).not.toBe('Invalid Date');
        expect(event.payload).toEqual(message);
    });

    it('should throw ExchangeNotFoundError when exchange is missing in config', async () => {
        const missingExchangeModule: TestingModule = await Test.createTestingModule({
            providers: [
                SenderService,
                {
                    provide: IBrokerService,
                    useValue: brokerService,
                },
                {
                    provide: BrokerConfig,
                    useValue: {
                        uri: 'amqp://guest:guest@localhost:5672',
                        exchanges: [{ name: 'another.exchange', type: 'topic' }],
                    },
                },
            ],
        }).compile();

        const serviceWithMissingExchange = missingExchangeModule.get(SenderService);

        await expect(
            serviceWithMissingExchange.sendMessage({ userId: 1, text: 'test' }),
        ).rejects.toBeInstanceOf(ExchangeNotFoundError);

        expect(brokerService.publish).not.toHaveBeenCalled();
    });
});
