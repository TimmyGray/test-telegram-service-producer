export interface BrokerPublishRetryOptions {
    maxAttempts?: number;
    delayMs?: number;
}

export interface BrokerPublishResult {
    confirmed: boolean;
    attempts: number;
}

export abstract class IBrokerService {
    abstract publish(
        exchange: string,
        message: unknown,
        routingKey?: string,
    ): Promise<BrokerPublishResult>;
}