import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Content,
  createPartFromUri,
  createUserContent,
  GoogleGenAI,
} from '@google/genai';
import path from 'path';
import { validateModelResponse } from './util';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { withTimer } from '../metrics/timer.util';

@Injectable()
export class AiService {
  private readonly genAi: GoogleGenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectMetric('function_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {
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

  async getEmbeddingWithTimer(text: string) {
    return withTimer(
      this.histogram,
      { fn: 'ai.service.getEmbedding' },
      async () => {
        return this.getEmbedding(text);
      },
    );
  }

  async llmPrompt(prompt: string) {
    const response = await this.genAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    validateModelResponse(response);

    return response.candidates![0].content;
  }

  private async sttFromAudioFile(fileId: string) {
    const audioFile = await this.genAi.files.upload({
      file: path.join(process.cwd(), 'uploads', `${fileId}.webm`),
      config: { mimeType: 'audio/webm' },
    });

    return this.genAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: createUserContent([
        createPartFromUri(audioFile.uri!, audioFile.mimeType!),
        'Generate a transcript of the speech.',
      ]),
    });
  }

  private async sttFromAudioBuffer(file: Express.Multer.File) {
    const base64AudioFile = file.buffer.toString('base64');
    const contents = [
      { text: 'Generate a transcript of the speech.' },
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64AudioFile,
        },
      },
    ];

    return this.genAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });
  }

  private async stt(data: Express.Multer.File | string) {
    if (typeof data === 'string') {
      return this.sttFromAudioFile(data);
    }

    return this.sttFromAudioBuffer(data);
  }

  async tts(contents: Content) {
    const response = await this.genAi.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: contents.parts }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // voiceNames https://ai.google.dev/gemini-api/docs/speech-generation#voices
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      },
    });

    validateModelResponse(response);
    return response.candidates?.[0]?.content;
  }
  async query(data: Express.Multer.File | string): Promise<string | undefined> {
    const sttResponse = await this.stt(data);
    validateModelResponse(sttResponse);

    return sttResponse.candidates
      ?.map((candidate) => candidate.content?.parts)
      .flat()
      .filter((part) => part?.text)
      .map((part) => part?.text)
      .join(' ')
      .trim();
  }
}
