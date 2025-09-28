import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const functionDurationSeconds = makeHistogramProvider({
  name: 'function_duration_seconds',
  help: 'Duration of function calls in seconds',
  labelNames: ['fn'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 3, 5, 10, 15, 20, 30, 40, 50],
});
