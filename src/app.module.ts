import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { QueryModule } from './query/query.module';
import { VectorDbModule } from './vector-db/vector-db.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env vars available everywhere
    }),
    AiModule,
    QueryModule,
    VectorDbModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
  ],
  providers: [AppService],
})
export class AppModule {}
