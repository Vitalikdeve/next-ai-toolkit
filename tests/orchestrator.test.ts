import { describe, it, expect, vi } from 'vitest';
import { ResilientAIOrchestrator } from '../src/orchestrator.js';

describe('ResilientAIOrchestrator', () => {
  it('should execute primary provider successfully', async () => {
    const orchestrator = new ResilientAIOrchestrator([
      {
        model: { id: 'primary-model', name: 'Primary', provider: 'google', maxTokens: 4096 },
        handler: async (prompt) => `Processed: ${prompt}`
      }
    ]);

    const result = await orchestrator.executeWithFallback('Hello AI');
    expect(result.content).toBe('Processed: Hello AI');
    expect(result.usedModelId).toBe('primary-model');
    expect(result.attemptsCount).toBe(1);
  });

  it('should failover to secondary provider if primary fails', async () => {
    const failingPrimary = vi.fn().mockRejectedValue(new Error('Rate Limit Exceeded (429)'));
    const secondaryHandler = vi.fn().mockResolvedValue('Fallback Success');

    const orchestrator = new ResilientAIOrchestrator([
      {
        model: { id: 'primary-model', name: 'Primary', provider: 'google', maxTokens: 4096 },
        handler: failingPrimary
      },
      {
        model: { id: 'secondary-model', name: 'Secondary', provider: 'mistral', maxTokens: 4096 },
        handler: secondaryHandler
      }
    ]);

    const result = await orchestrator.executeWithFallback('Test Prompt', { maxRetries: 0 });
    expect(result.content).toBe('Fallback Success');
    expect(result.usedModelId).toBe('secondary-model');
    expect(failingPrimary).toHaveBeenCalled();
    expect(secondaryHandler).toHaveBeenCalled();
  });
});
