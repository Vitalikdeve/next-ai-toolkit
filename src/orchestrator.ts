import {
  ProviderRegistration,
  ExecutionOptions,
  ExecutionResult,
  ModelConfig
} from './types.js';
import {
  AIError,
  TimeoutError,
  CancellationError,
  AllProvidersFailedError,
  AttemptRecord,
  RateLimitError
} from './errors.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { calculateBackoffDelay, sleepWithSignal, DEFAULT_RETRY_POLICY } from './backoff.js';
import { TokenCostEstimator } from './cost-estimator.js';

interface ProviderEntry {
  registration: ProviderRegistration;
  circuitBreaker: CircuitBreaker;
}

export class ResilientAIOrchestrator {
  private entries: ProviderEntry[] = [];

  constructor(providers: ProviderRegistration[] = []) {
    providers.forEach(p => this.registerProvider(p));
  }

  registerProvider(provider: ProviderRegistration): this {
    this.entries.push({
      registration: provider,
      circuitBreaker: new CircuitBreaker(provider.circuitBreakerOptions)
    });
    return this;
  }

  getProviders(): ModelConfig[] {
    return this.entries.map(e => e.registration.model);
  }

  async executeWithFallback(prompt: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    if (this.entries.length === 0) {
      throw new AIError('No AI providers registered in ResilientAIOrchestrator.');
    }

    if (options.signal?.aborted) {
      throw new CancellationError();
    }

    const overallStartTime = Date.now();
    const attempts: AttemptRecord[] = [];
    const retryPolicy = { ...DEFAULT_RETRY_POLICY, ...options.retryPolicy };
    const hooks = options.hooks;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const model = entry.registration.model;
      const circuit = entry.circuitBreaker;

      // Skip provider if circuit breaker is OPEN
      if (!circuit.isAvailable()) {
        hooks?.onCircuitOpen?.(model);
        continue;
      }

      let attemptInProvider = 0;

      while (attemptInProvider <= retryPolicy.maxRetries) {
        attemptInProvider++;
        const attemptStartTime = Date.now();

        if (options.signal?.aborted) {
          throw new CancellationError(undefined, { modelId: model.id, provider: model.provider });
        }

        hooks?.onAttemptStart?.(model, attemptInProvider);

        try {
          // Execute with timeout if requested
          const timeoutMs = options.timeoutMs;
          const handlerPromise = entry.registration.handler(prompt, options);

          let content: string;

          if (timeoutMs && timeoutMs > 0) {
            let timerId: any;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timerId = setTimeout(() => {
                reject(new TimeoutError(timeoutMs, { modelId: model.id, provider: model.provider }));
              }, timeoutMs);
            });

            try {
              content = await Promise.race([handlerPromise, timeoutPromise]);
            } finally {
              clearTimeout(timerId);
            }
          } else {
            content = await handlerPromise;
          }

          const durationMs = Date.now() - attemptStartTime;
          circuit.recordSuccess();
          hooks?.onAttemptSuccess?.(model, durationMs, attemptInProvider);
          hooks?.onCircuitClose?.(model);

          attempts.push({
            modelId: model.id,
            provider: model.provider,
            attemptNumber: attemptInProvider,
            durationMs,
            success: true
          });

          // Telemetry and token estimation
          const promptTokens = TokenCostEstimator.estimateTokens(prompt);
          const completionTokens = TokenCostEstimator.estimateTokens(content);
          const cost = TokenCostEstimator.calculateCost(model.id, promptTokens, completionTokens, model.pricing);

          return {
            content,
            usedModel: model,
            totalDurationMs: Date.now() - overallStartTime,
            attempts,
            estimatedTokens: {
              prompt: promptTokens,
              completion: completionTokens,
              total: promptTokens + completionTokens
            },
            estimatedCost: cost
          };
        } catch (rawError: any) {
          const durationMs = Date.now() - attemptStartTime;
          const error: Error = rawError instanceof Error ? rawError : new Error(String(rawError));

          attempts.push({
            modelId: model.id,
            provider: model.provider,
            attemptNumber: attemptInProvider,
            durationMs,
            success: false,
            error
          });

          hooks?.onAttemptError?.(model, error, attemptInProvider);

          if (error instanceof CancellationError || options.signal?.aborted) {
            throw error;
          }

          // If max retries reached for this provider, trip breaker if needed & failover
          if (attemptInProvider > retryPolicy.maxRetries) {
            circuit.recordFailure();

            const nextEntry = this.entries[i + 1];
            if (nextEntry) {
              hooks?.onFailover?.(model, nextEntry.registration.model, error);
            }
            break;
          }

          // Calculate delay with backoff + jitter
          let delayMs = calculateBackoffDelay(attemptInProvider, retryPolicy);
          if (error instanceof RateLimitError && error.retryAfterMs) {
            delayMs = Math.max(delayMs, error.retryAfterMs);
          }

          try {
            await sleepWithSignal(delayMs, options.signal);
          } catch (cancelErr) {
            throw cancelErr;
          }
        }
      }
    }

    throw new AllProvidersFailedError(attempts);
  }
}
