import { Module } from '@nestjs/common';
import { SenderController } from './sender.controller';
import { SenderService } from './sender.service';
import { BrokerConfig, BrokerModule, ConfigModule } from '../infrastructure';

@Module({
  imports: [
    BrokerModule,
    ConfigModule.forFeature(BrokerConfig, 'broker'),
  ],
  controllers: [SenderController],
  providers: [SenderService],
})
export class SenderModule { }
