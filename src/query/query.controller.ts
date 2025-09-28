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

    const audioBuffer = await this.queryService.handleUserQuery(file);
    return res.send({ audioBuffer });
  }
}
