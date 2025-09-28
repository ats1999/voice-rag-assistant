import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from 'src/metrics/metric.module';

@Module({
  imports: [ConfigModule, MetricsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
