import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { AiModule } from 'src/ai/ai.module';
import { VectorDbModule } from 'src/vector-db/vector-db.module';

@Module({
  imports: [AiModule, VectorDbModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
