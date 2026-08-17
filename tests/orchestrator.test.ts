import { describe, it, expect, vi } from 'vitest';
import { ResilientAIOrchestrator } from '../src/orchestrator.js';
import { createMockProvider } from '../src/mock-provider.js';
import { AllProvidersFailedError, TimeoutError } from '../src/errors.js';

describe('ResilientAIOrchestrator', () => {
  it('should successfully execute primary provider on first attempt', async () => {
    const primary = createMockProvider(
      { id: 'gemini-2.0-flash', name: 'Gemini Flash', provider: 'google' },
      { responses: ['Generated candidate summary'] }
    );

    const orchestrator = new ResilientAIOrchestrator([primary.registration]);
    const result = await orchestrator.executeWithFallback('Summarize candidate');

    expect(result.content).toBe('Generated candidate summary');
    expect(result.usedModel.id).toBe('gemini-2.0-flash');
    expect(result.attempts.length).toBe(1);
    expect(result.attempts[0].success).toBe(true);
    expect(result.estimatedTokens.total).toBeGreaterThan(0);
    expect(result.estimatedCost.totalCost).toBeGreaterThanOrEqual(0);
  });

  it('should retry primary provider with backoff and succeed', async () => {
    const primary = createMockProvider(
      { id: 'gemini-2.0-flash', name: 'Gemini Flash', provider: 'google' },
      { failTimes: 1, responses: ['Recovered response'] }
    );

    const orchestrator = new ResilientAIOrchestrator([primary.registration]);
    const result = await orchestrator.executeWithFallback('Test Prompt', {
      retryPolicy: { maxRetries: 2, initialDelayMs: 10, jitter: false }
    });

    expect(result.content).toBe('Recovered response');
    expect(primary.callCount()).toBe(2);
    expect(result.attempts.length).toBe(2);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[1].success).toBe(true);
  });

  it('should failover to secondary provider when primary exceeds retries', async () => {
    const primary = createMockProvider(
      { id: 'gemini-2.0-flash', name: 'Gemini Flash', provider: 'google' },
      { failTimes: 5, failureError: new Error('Rate limit (429)') }
    );

    const secondary = createMockProvider(
      { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral' },
      { responses: ['Mistral Fallback Success'] }
    );

    const onFailover = vi.fn();

    const orchestrator = new ResilientAIOrchestrator([
      primary.registration,
      secondary.registration
    ]);

    const result = await orchestrator.executeWithFallback('Complex prompt', {
      retryPolicy: { maxRetries: 1, initialDelayMs: 10, jitter: false },
      hooks: { onFailover }
    });

    expect(result.content).toBe('Mistral Fallback Success');
    expect(result.usedModel.id).toBe('mistral-large');
    expect(onFailover).toHaveBeenCalledTimes(1);
  });

  it('should throw AllProvidersFailedError if every provider fails', async () => {
    const primary = createMockProvider(
      { id: 'p1', name: 'Primary', provider: 'google' },
      { failTimes: 10 }
    );
    const secondary = createMockProvider(
      { id: 'p2', name: 'Secondary', provider: 'mistral' },
      { failTimes: 10 }
    );

    const orchestrator = new ResilientAIOrchestrator([
      primary.registration,
      secondary.registration
    ]);

    await expect(
      orchestrator.executeWithFallback('Test', {
        retryPolicy: { maxRetries: 0 }
      })
    ).rejects.toThrow(AllProvidersFailedError);
  });

  it('should trigger TimeoutError if provider exceeds timeout limit', async () => {
    const slowProvider = createMockProvider(
      { id: 'slow-model', name: 'Slow', provider: 'custom' },
      { delayMs: 500, responses: ['Too late'] }
    );

    const fallbackProvider = createMockProvider(
      { id: 'fast-model', name: 'Fast', provider: 'google' },
      { delayMs: 10, responses: ['Fast response'] }
    );

    const orchestrator = new ResilientAIOrchestrator([
      slowProvider.registration,
      fallbackProvider.registration
    ]);

    const result = await orchestrator.executeWithFallback('Prompt', {
      timeoutMs: 50,
      retryPolicy: { maxRetries: 0 }
    });

    expect(result.content).toBe('Fast response');
    expect(result.usedModel.id).toBe('fast-model');
  });
});
