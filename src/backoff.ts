import { RetryPolicy } from './types.js';
import { CancellationError } from './errors.js';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  initialDelayMs: 300,
  maxDelayMs: 5000,
  backoffFactor: 2,
  jitter: true
};

export function calculateBackoffDelay(
  attempt: number,
  policy: Partial<RetryPolicy> = {}
): number {
  const merged: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy };
  const exponential = merged.initialDelayMs * Math.pow(merged.backoffFactor, attempt - 1);
  const capped = Math.min(exponential, merged.maxDelayMs);

  if (!merged.jitter) {
    return Math.floor(capped);
  }

  // Full Jitter: random value between 0 and capped delay to prevent thundering herds
  return Math.floor(Math.random() * capped);
}

export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new CancellationError());
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new CancellationError());
    };

    signal?.addEventListener('abort', onAbort);
  });
}
