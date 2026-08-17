import { describe, it, expect } from 'vitest';
import { TokenCostEstimator } from '../src/cost-estimator.js';

describe('TokenCostEstimator', () => {
  it('should estimate token count from string correctly', () => {
    const text = 'Hello world, this is a test string for token estimation.';
    const tokens = TokenCostEstimator.estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(Math.ceil(text.length / 4));
  });

  it('should return 0 tokens for empty string', () => {
    expect(TokenCostEstimator.estimateTokens('')).toBe(0);
  });

  it('should calculate USD cost accurately based on standard pricing', () => {
    const cost = TokenCostEstimator.calculateCost('gpt-4o-mini', 1000, 500);
    expect(cost.promptCost).toBe(0.00015);
    expect(cost.completionCost).toBe(0.0003);
    expect(cost.totalCost).toBe(0.00045);
  });
});
