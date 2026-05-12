import { HttpStatus } from '@nestjs/common';

export class AppError extends Error {
    constructor(
        message: string,
        public readonly errorCode: string,
        public readonly statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = AppError.name;
    }
}
