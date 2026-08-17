export type ErrorCategory = 'rate_limit' | 'timeout' | 'unavailable' | 'canceled' | 'validation' | 'unknown';

export class AIError extends Error {
  readonly category: ErrorCategory;
  readonly isRetryable: boolean;
  readonly modelId?: string;
  readonly provider?: string;
  readonly cause?: unknown;

  constructor(message: string, options: {
    category?: ErrorCategory;
    isRetryable?: boolean;
    modelId?: string;
    provider?: string;
    cause?: unknown;
  } = {}) {
    super(message);
    this.name = 'AIError';
    this.category = options.category ?? 'unknown';
    this.isRetryable = options.isRetryable ?? false;
    this.modelId = options.modelId;
    this.provider = options.provider;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends AIError {
  readonly retryAfterMs?: number;

  constructor(message: string, options: { retryAfterMs?: number; modelId?: string; provider?: string; cause?: unknown } = {}) {
    super(message, {
      category: 'rate_limit',
      isRetryable: true,
      modelId: options.modelId,
      provider: options.provider,
      cause: options.cause
    });
    this.name = 'RateLimitError';
    this.retryAfterMs = options.retryAfterMs;
  }
}

export class TimeoutError extends AIError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, options: { modelId?: string; provider?: string; cause?: unknown } = {}) {
    super(`Inference request timed out after ${timeoutMs}ms`, {
      category: 'timeout',
      isRetryable: true,
      modelId: options.modelId,
      provider: options.provider,
      cause: options.cause
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ProviderUnavailableError extends AIError {
  readonly statusCode?: number;

  constructor(message: string, options: { statusCode?: number; modelId?: string; provider?: string; cause?: unknown } = {}) {
    super(message, {
      category: 'unavailable',
      isRetryable: true,
      modelId: options.modelId,
      provider: options.provider,
      cause: options.cause
    });
    this.name = 'ProviderUnavailableError';
    this.statusCode = options.statusCode;
  }
}

export class CancellationError extends AIError {
  constructor(message: string = 'Inference request was canceled by user/AbortSignal', options: { modelId?: string; provider?: string } = {}) {
    super(message, {
      category: 'canceled',
      isRetryable: false,
      modelId: options.modelId,
      provider: options.provider
    });
    this.name = 'CancellationError';
  }
}

export interface AttemptRecord {
  modelId: string;
  provider: string;
  attemptNumber: number;
  durationMs: number;
  success: boolean;
  error?: Error;
}

export class AllProvidersFailedError extends AIError {
  readonly attempts: AttemptRecord[];

  constructor(attempts: AttemptRecord[]) {
    const summary = attempts
      .map(a => `[${a.provider}:${a.modelId}#${a.attemptNumber} in ${a.durationMs}ms - ${a.error?.message || 'Failed'}]`)
      .join(', ');

    super(`All configured AI providers failed. Attempts log: ${summary}`, {
      category: 'unavailable',
      isRetryable: false
    });
    this.name = 'AllProvidersFailedError';
    this.attempts = attempts;
  }
}
