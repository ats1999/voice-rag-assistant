import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>() as any;
        const response = ctx.getResponse<Response>() as any;

        this.histogram.observe(
          {
            method: request.method,
            route: request.route?.path || request.url,
            status_code: response.statusCode,
          },
          (Date.now() - now) / 1000,
        );
      }),
    );
  }
}
