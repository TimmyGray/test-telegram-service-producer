import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../errors/app.error';

export class ExchangeNotFoundError extends AppError {
    constructor(public readonly exchangeName: string) {
        super(
            `Exchange ${exchangeName} not found in broker configuration`,
            'BROKER_EXCHANGE_NOT_FOUND',
            HttpStatus.INTERNAL_SERVER_ERROR,
            { exchangeName },
        );
        this.name = ExchangeNotFoundError.name;
    }
}
