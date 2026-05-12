import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { BrokerConfig } from "./broker.config";
import { ConfigModule } from "../config";
import { IBrokerService } from "./broker.interface";
import { BrokerService } from "./broker.service";

@Module({
    imports: [
        RabbitMQModule.forRootAsync({
            imports: [ConfigModule.forFeature(BrokerConfig, 'broker')],
            inject: [BrokerConfig],
            useFactory: (broker: BrokerConfig) => ({
                uri: broker.uri,
                exchanges: broker.exchanges,
                enableControllerDiscovery: true,
                connectionInitOptions: { wait: false },
                defaultPublishOptions: {
                    persistent: broker.defaultPublishOptions?.persistent ?? true,
                },
                connectionManagerOptions: {
                    connectionOptions: {
                        clientProperties: {
                            connection_name: 'test-telegram-service-producer',
                        }
                    }
                }
            }),
        }),
    ],
    providers: [BrokerService, { provide: IBrokerService, useExisting: BrokerService }],
    exports: [RabbitMQModule, IBrokerService],
})
export class BrokerModule { }
