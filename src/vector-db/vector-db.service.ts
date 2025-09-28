import {
  Pinecone,
  RecordMetadata,
  RecordValues,
  ScoredPineconeRecord,
} from '@pinecone-database/pinecone';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorDBService {
  private readonly pineCode: Pinecone;
  constructor(private readonly configService: ConfigService) {
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
}
