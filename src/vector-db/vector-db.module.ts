import { Module } from '@nestjs/common';
import { VectorDBService } from './vector-db.service';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from 'src/metrics/metric.module';

@Module({
  imports: [ConfigModule, MetricsModule],
  providers: [VectorDBService],
  exports: [VectorDBService],
})
export class VectorDbModule {}
