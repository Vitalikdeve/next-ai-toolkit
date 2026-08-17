import { ModelConfig, ProviderRegistration, ExecutionOptions } from './types.js';
import { TimeoutError, CancellationError } from './errors.js';
import { sleepWithSignal } from './backoff.js';

export interface MockBehavior {
  responses?: string[];
  failTimes?: number;
  failureError?: Error;
  delayMs?: number;
}

export function createMockProvider(
  model: ModelConfig,
  behavior: MockBehavior = {}
): { registration: ProviderRegistration; callCount: () => number; reset: () => void } {
  let callCount = 0;
  let remainingFailures = behavior.failTimes ?? 0;
  const responses = behavior.responses ?? ['Mock response'];

  const handler = async (prompt: string, options?: ExecutionOptions): Promise<string> => {
    callCount++;

    if (behavior.delayMs && behavior.delayMs > 0) {
      if (options?.timeoutMs && behavior.delayMs > options.timeoutMs) {
        await sleepWithSignal(options.timeoutMs, options?.signal);
        throw new TimeoutError(options.timeoutMs, { modelId: model.id, provider: model.provider });
      }
      await sleepWithSignal(behavior.delayMs, options?.signal);
    }

    if (options?.signal?.aborted) {
      throw new CancellationError(undefined, { modelId: model.id, provider: model.provider });
    }

    if (remainingFailures > 0) {
      remainingFailures--;
      throw behavior.failureError ?? new Error(`Simulated transient error on ${model.id}`);
    }

    const responseIndex = (callCount - 1) % responses.length;
    return responses[responseIndex];
  };

  return {
    registration: {
      model,
      handler
    },
    callCount: () => callCount,
    reset: () => {
      callCount = 0;
      remainingFailures = behavior.failTimes ?? 0;
    }
  };
}
