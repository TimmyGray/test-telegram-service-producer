import { Module } from '@nestjs/common';
import { SenderModule } from './sender';
import { ConfigModule } from './infrastructure';

@Module({
  imports: [ConfigModule.forRoot(), SenderModule],
})
export class AppModule { }
