import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

jest.mock('@google/genai', () => {
  return {
    GenAIClient: jest.fn().mockImplementation(() => ({
      models: {
        embedContent: jest.fn().mockImplementation(({ contents }) => {
          return Promise.resolve({
            embeddings: Array(1536).fill(0.01),
          });
        }),
      },
    })),
  };
});

@Injectable()
export class EmbeddingService {
  private readonly genAi: GoogleGenAI;
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_KEY');
    this.genAi = new GoogleGenAI({
      apiKey,
    });
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.genAi.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
    });

    if (!response.embeddings || !response.embeddings.values) {
      // should not occur
      throw new HttpException(
        'Something went wrong! Please try again!',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return response.embeddings[0].values!;
  }
}
