import { ExecutionOptions, ProviderRegistration } from './types.js';

export interface OrchestratorResult {
  content: string;
  usedModelId: string;
  usedProvider: string;
  attemptsCount: number;
  durationMs: number;
}

export class ResilientAIOrchestrator {
  private providers: ProviderRegistration[] = [];

  constructor(providers: ProviderRegistration[] = []) {
    this.providers = providers;
  }

  registerProvider(provider: ProviderRegistration): this {
    this.providers.push(provider);
    return this;
  }

  async executeWithFallback(prompt: string, options: ExecutionOptions = {}): Promise<OrchestratorResult> {
    if (this.providers.length === 0) {
      throw new Error('No AI providers registered in ResilientAIOrchestrator.');
    }

    const startTime = Date.now();
    const maxRetries = options.maxRetries ?? 1;
    const errors: Array<{ model: string; error: any }> = [];

    for (let i = 0; i < this.providers.length; i++) {
      const current = this.providers[i];
      let retryCount = 0;

      while (retryCount <= maxRetries) {
        try {
          const timeoutPromise = options.timeoutMs
            ? new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${options.timeoutMs}ms`)), options.timeoutMs)
              )
            : null;

          const executionPromise = current.handler(prompt, options);

          const result = timeoutPromise
            ? await Promise.race([executionPromise, timeoutPromise])
            : await executionPromise;

          return {
            content: result,
            usedModelId: current.model.id,
            usedProvider: current.model.provider,
            attemptsCount: errors.length + retryCount + 1,
            durationMs: Date.now() - startTime
          };
        } catch (err) {
          retryCount++;
          if (retryCount > maxRetries) {
            errors.push({ model: current.model.id, error: err });
            break;
          }
        }
      }
    }

    throw new Error(
      `All AI providers failed. Tried ${this.providers.length} models. Errors: ${JSON.stringify(
        errors.map(e => ({ model: e.model, message: (e.error as Error)?.message || String(e.error) }))
      )}`
    );
  }
}
