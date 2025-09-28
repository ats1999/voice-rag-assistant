import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(app.get(MetricsInterceptor));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
