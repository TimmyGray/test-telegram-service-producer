import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../errors/app.error';

export class MessagePublishError extends AppError {
    constructor(
        attempts: number,
        cause?: unknown,
    ) {
        super(
            `Failed to publish message after ${attempts} attempt(s)`,
            'BROKER_PUBLISH_FAILED',
            HttpStatus.SERVICE_UNAVAILABLE,
            {
                attempts,
                cause: cause instanceof Error ? cause.message : 'Unknown error',
            },
        );

        this.name = MessagePublishError.name;
    }
}
