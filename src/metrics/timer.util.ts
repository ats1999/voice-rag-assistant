import { Histogram } from 'prom-client';

export function withTimer<T>(
  histogram: Histogram<string>,
  labels: Record<string, string>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const end = histogram.startTimer(labels);
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(() => end()) as Promise<T>;
    }
    end();
    return Promise.resolve(result);
  } catch (e) {
    end();
    throw e;
  }
}
