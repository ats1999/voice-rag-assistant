import { Module } from '@nestjs/common';
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';
import { functionDurationSeconds } from './metric.provider';

@Module({
  providers: [
    MetricsInterceptor,
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1, 3, 5],
    }),
    functionDurationSeconds,
  ],
  exports: [MetricsInterceptor, functionDurationSeconds],
})
export class MetricsModule {}
