import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof AppError
          ? exception.statusCode
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);
    const errorCode = this.resolveErrorCode(exception);
    const details = this.resolveDetails(exception);

    this.logger.error(
      `${request.method} ${request.url} failed with ${status}: ${Array.isArray(message) ? message.join(', ') : message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(errorCode ? { errorCode } : {}),
      ...(details ? { details } : {}),
    });
  }

  private resolveMessage(exception: unknown): string | string[] {
    if (exception instanceof AppError) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return exceptionResponse;
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const maybeMessage = (exceptionResponse as { message?: unknown })
          .message;

        if (typeof maybeMessage === 'string') {
          return maybeMessage;
        }

        if (Array.isArray(maybeMessage)) {
          return maybeMessage.filter(
            (item): item is string => typeof item === 'string',
          );
        }
      }

      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private resolveErrorCode(exception: unknown): string | undefined {
    if (exception instanceof AppError) {
      return exception.errorCode;
    }

    return undefined;
  }

  private resolveDetails(
    exception: unknown,
  ): Record<string, unknown> | undefined {
    if (exception instanceof AppError) {
      return exception.details;
    }

    return undefined;
  }
}
