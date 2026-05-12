interface Exchange {
    name: string;
    type: string;
}

export abstract class BrokerConfig {
    abstract exchanges: Exchange[];
    abstract uri: string;
    abstract defaultPublishOptions?: BrokerPublishOptions;
    abstract retry?: BrokerRetryOptions;
}

export interface BrokerPublishOptions {
    persistent?: boolean;
}

export interface BrokerRetryOptions {
    maxAttempts?: number;
    delayMs?: number;
}

