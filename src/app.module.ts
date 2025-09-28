import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { QueryModule } from './query/query.module';
import { VectorDbModule } from './vector-db/vector-db.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsModule } from './metrics/metric.module';

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
    PrometheusModule.register({
      global: true,
      defaultMetrics: {
        enabled: true, // collect Node.js process metrics (CPU, memory, etc.)
      },
    }),
    MetricsModule,
  ],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
