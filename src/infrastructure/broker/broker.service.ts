import { IBrokerService } from "./broker.interface";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { MessagePublishError } from "./errors";
import { BrokerPublishResult } from "./broker.interface";
import { BrokerConfig } from "./broker.config";

const TRANSIENT_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ECONNABORTED",
]);

const TRANSIENT_ERROR_FRAGMENTS = [
    "connection failed",
    "unable to establish a connection to the broker",
    "broker not connected",
    "channel closed",
    "socket closed",
    "getaddrinfo",
    "network",
];

@Injectable()
export class BrokerService implements IBrokerService, OnModuleInit {
    private readonly logger = new Logger(BrokerService.name);

    constructor(
        private readonly amqpConnection: AmqpConnection,
        private readonly brokerConfig: BrokerConfig) { }

    onModuleInit(): void {
        const exchanges = this.brokerConfig.exchanges
            .map((exchange) => exchange.name)
            .join(', ');

        this.logger.log(
            `Broker service initialized. Exchanges: ${exchanges || 'none configured'}`,
        );
    }

    async publish(
        exchange: string,
        message: unknown,
        routingKey = '',
    ): Promise<BrokerPublishResult> {
        const maxAttempts = this.brokerConfig.retry?.maxAttempts ?? 3;
        const delayMs = this.brokerConfig.retry?.delayMs ?? 1000;

        this.logger.debug(
            `Publishing to ${exchange}:${routingKey || '<empty>'} with maxAttempts=${maxAttempts}`,
        );

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                if (!this.amqpConnection.connected) {
                    const disconnectedError = new Error(
                        'RabbitMQ connection is not established',
                    ) as NodeJS.ErrnoException;
                    disconnectedError.code = 'ECONNREFUSED';
                    throw disconnectedError;
                }

                const confirmed = await this.amqpConnection.publish(
                    exchange,
                    routingKey,
                    message,
                );

                if (!confirmed) {
                    throw new Error('Broker publish was not confirmed');
                }

                this.logger.log(
                    `Published message to ${exchange}:${routingKey || '<empty>'} on attempt ${attempt}`,
                );

                return {
                    confirmed,
                    attempts: attempt,
                };
            } catch (error) {
                const canRetry =
                    attempt < maxAttempts && this.isTransientConnectionError(error);

                if (!canRetry) {
                    this.logger.error(
                        `Publish failed for ${exchange}:${routingKey || '<empty>'} on attempt ${attempt}`,
                        error instanceof Error ? error.stack : undefined,
                    );
                    throw new MessagePublishError(attempt, error);
                }

                this.logger.warn(
                    `Publish attempt ${attempt} failed for ${exchange}:${routingKey}. Retrying in ${delayMs}ms`,
                );

                await this.delay(delayMs);
            }
        }

        throw new MessagePublishError(maxAttempts);
    }

    private isTransientConnectionError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        const maybeErrno = error as NodeJS.ErrnoException;
        const code = maybeErrno.code;

        if (code && TRANSIENT_ERROR_CODES.has(code)) {
            return true;
        }

        const normalizedMessage = error.message.toLowerCase();

        return TRANSIENT_ERROR_FRAGMENTS.some((fragment) =>
            normalizedMessage.includes(fragment),
        );
    }

    private async delay(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}