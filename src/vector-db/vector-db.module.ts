import { Module } from '@nestjs/common';
import { VectorDBService } from './vector-db.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [VectorDBService],
  exports: [VectorDBService],
})
export class VectorDbModule {}
