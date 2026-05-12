import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppError } from '../errors/app.error';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
    let filter: GlobalExceptionFilter;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        filter = new GlobalExceptionFilter();
        jsonMock = jest.fn();
        statusMock = jest.fn(() => ({ json: jsonMock }));
    });

    function createHost(url = '/v1/sender'): ArgumentsHost {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ method: 'POST', url }),
                getResponse: () => ({ status: statusMock }),
            }),
        } as unknown as ArgumentsHost;
    }

    it('should return AppError payload including errorCode and details', () => {
        const error = new AppError(
            'Broker unavailable',
            'BROKER_PUBLISH_FAILED',
            HttpStatus.SERVICE_UNAVAILABLE,
            { attempts: 3, cause: 'RabbitMQ connection is not established' },
        );

        filter.catch(error, createHost());

        expect(statusMock).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);

        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                path: '/v1/sender',
                message: 'Broker unavailable',
                errorCode: 'BROKER_PUBLISH_FAILED',
                details: {
                    attempts: 3,
                    cause: 'RabbitMQ connection is not established',
                },
                timestamp: expect.any(String),
            }),
        );
    });

    it('should return HttpException message without AppError fields', () => {
        const error = new HttpException('Validation failed', HttpStatus.BAD_REQUEST);

        filter.catch(error, createHost('/v1/sender'));

        expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.BAD_REQUEST,
                path: '/v1/sender',
                message: 'Validation failed',
                timestamp: expect.any(String),
            }),
        );

        const payload = jsonMock.mock.calls[0][0] as Record<string, unknown>;
        expect(payload).not.toHaveProperty('errorCode');
        expect(payload).not.toHaveProperty('details');
    });

    it('should return generic error message for unknown Error', () => {
        const error = new Error('Unexpected failure');

        filter.catch(error, createHost('/v1/sender'));

        expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                path: '/v1/sender',
                message: 'Unexpected failure',
                timestamp: expect.any(String),
            }),
        );
    });

    it('should return fallback message for non-error throwables', () => {
        filter.catch('panic', createHost('/v1/sender'));

        expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                path: '/v1/sender',
                message: 'Internal server error',
                timestamp: expect.any(String),
            }),
        );
    });
});
