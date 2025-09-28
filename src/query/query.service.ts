import { Injectable, InternalServerErrorException } from '@nestjs/common';
import path from 'path';
import fs from 'fs/promises';
import { AiService } from 'src/ai/ai.service';
import { VectorDBService } from 'src/vector-db/vector-db.service';
import {
  ScoredPineconeRecord,
  RecordMetadata,
} from '@pinecone-database/pinecone';

@Injectable()
export class QueryService {
  constructor(
    private readonly aiService: AiService,
    private readonly vectorDbService: VectorDBService,
  ) {}

  private async getSttFromUserQuery(file: Express.Multer.File) {
    const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10mb
    if (file.size > MAX_BUFFER_SIZE) {
      const fileId = crypto.randomUUID();
      const filePath = path.join(process.cwd(), 'uploads', fileId + '.webm');
      await fs.writeFile(filePath, file.buffer);
      return this.aiService.query(filePath);
    } else {
      return this.aiService.query(file);
    }
  }

  async handleUserQuery(file: Express.Multer.File) {
    const userQuery = await this.getSttFromUserQuery(file);
    if (!userQuery) {
      throw new InternalServerErrorException(
        'Something went wrong! Please try again!',
      );
    }

    const queryEmbedding =
      await this.aiService.getEmbeddingWithTimer(userQuery);

    const matches =
      await this.vectorDbService.getRecordsWithTimer(queryEmbedding);

    const matchesWithContent = await this.getMatchedContents(matches);

    const prompt = this.getQueryPromptWithContext(
      matchesWithContent[0],
      userQuery,
    );

    const llmResponse = await this.aiService.llmPromptWithTimer(prompt)!;

    const audioContent = await this.aiService.ttsWithTimer(llmResponse!);

    const audioBuffer = audioContent?.parts?.[0]?.inlineData?.data;
    return { audioBuffer, userQuery, llmResponse };
  }

  private async getMatchedContents(
    matches: ScoredPineconeRecord<RecordMetadata>[],
  ) {
    const matchContentPromises = matches.map((match, i) => {
      return fs
        .readFile(path.join(process.cwd(), 'public', 'faq', match.id), 'utf-8')
        .then(
          (content) =>
            `Doc ${i + 1}, source is (${match.metadata?.source}):\ncontent is ${content}`,
        );
    });

    return Promise.all(matchContentPromises);
  }

  private getQueryPromptWithContext(context: string, userQuery: string) {
    const prompt = `
      You are a customer support assistant.

      Answer the user question using the context below.
      - Output must be in **plain text**. 
      - Do not use Markdown formatting (no **bold**, no lists, no headings, no links).
      - Include citations in parentheses like (from filename). 
      - If multiple sources contain the same info, list all relevant sources in one parentheses.
      - Generate output withing 300 characters
      Context:
      ${context}

      User question: ${userQuery}

      Answer:
      `;

    return prompt;
  }
}
