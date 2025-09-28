import {
  BadRequestException,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueryService } from './query.service';
import express from 'express';

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('audio'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: express.Response,
  ) {
    if (!file) {
      throw new BadRequestException('Audio is missing from request.');
    }

    try {
      const data = await this.queryService.handleUserQuery(file);
      return res.send(data);
    } catch (error: any) {
      if (error.status === 429 || error.status === 503) {
        const errorMessage = JSON.parse(error.message);
        return res.status(error.status).send(errorMessage.error.message);
      }

      throw error;
    }
  }
}
