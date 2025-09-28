import {
  Pinecone,
  RecordMetadata,
  RecordValues,
  ScoredPineconeRecord,
} from '@pinecone-database/pinecone';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withTimer } from 'src/metrics/timer.util';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';

@Injectable()
export class VectorDBService {
  private readonly pineCode: Pinecone;
  constructor(
    private readonly configService: ConfigService,
    @InjectMetric('function_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {
    const apiKey = this.configService.get<string>('PINE_CODE_API_KEY')!;
    this.pineCode = new Pinecone({
      apiKey,
    });
  }

  async getRecords(
    embedding: RecordValues,
  ): Promise<ScoredPineconeRecord<RecordMetadata>[]> {
    const host = this.configService.get<string>('PINE_CODE_INDEX_HOST');

    const namespace = this.pineCode.index('rag', host).namespace('__default__');

    const { matches } = await namespace.query({
      topK: 3,
      vector: embedding,
      includeMetadata: true,
    });

    return matches;
  }

  async getRecordsWithTimer(
    embedding: RecordValues,
  ): Promise<ScoredPineconeRecord<RecordMetadata>[]> {
    return withTimer(
      this.histogram,
      { fn: 'vector-db.service.getRecords' },
      async () => {
        return this.getRecords(embedding);
      },
    );
  }
}
