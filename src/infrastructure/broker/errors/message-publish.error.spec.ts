import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { MessagePublishError } from './message-publish.error';

describe('MessagePublishError', () => {
    it('should hide exchange and routing key in client-facing payload', () => {
        const error = new MessagePublishError(
            5,
            new Error('RabbitMQ connection is not established'),
        );

        expect(error.message).toBe('Failed to publish message after 5 attempt(s)');
        expect(error.errorCode).toBe('BROKER_PUBLISH_FAILED');
        expect(error.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(error.details).toEqual({
            attempts: 5,
            cause: 'RabbitMQ connection is not established',
        });
        expect(error.details).not.toHaveProperty('exchange');
        expect(error.details).not.toHaveProperty('routingKey');
    });
});
