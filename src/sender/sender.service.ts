import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BrokerConfig } from '../infrastructure/broker/broker.config';
import { IBrokerService } from '../infrastructure/broker/broker.interface';
import { ExchangeNotFoundError } from '../infrastructure/broker/errors';
import {
  IMessage,
  ISendMessageResult,
  ISenderEvent,
  ISenderService,
} from './sender.interface';

const EXCHANGE_NAME = 'topic.producer.send-message.consumer';
const ROUTING_KEY = 'send-message';


@Injectable()
export class SenderService implements ISenderService {
  private readonly logger = new Logger(SenderService.name);

  constructor(
    private readonly brokerService: IBrokerService,
    private readonly brokerConfig: BrokerConfig) { }

  async sendMessage(message: IMessage): Promise<ISendMessageResult> {
    if (
      !this.brokerConfig.exchanges.some(
        (exchange) => exchange.name === EXCHANGE_NAME,
      )
    ) {
      this.logger.error(
        `Exchange ${EXCHANGE_NAME} is not configured in broker settings`,
      );
      throw new ExchangeNotFoundError(EXCHANGE_NAME);
    }

    const eventId = randomUUID();

    const event: ISenderEvent = {
      eventId,
      occurredAt: new Date().toISOString(),
      payload: message,
    };

    this.logger.log(
      `Publishing eventId=${eventId} to ${EXCHANGE_NAME}:${ROUTING_KEY}`,
    );

    const publishResult = await this.brokerService.publish(
      EXCHANGE_NAME,
      JSON.stringify(event),
      ROUTING_KEY,
    );

    this.logger.log(
      `Event eventId=${eventId} published after ${publishResult.attempts} attempt(s)`,
    );

    return {
      eventId,
      confirmed: publishResult.confirmed,
      attempts: publishResult.attempts,
    };
  }
}

