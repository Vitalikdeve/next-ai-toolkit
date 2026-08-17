import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../src/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      samplingDurationMs: 5000
    });
  });

  it('should start in CLOSED state and be available', () => {
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.isAvailable()).toBe(true);
  });

  it('should trip to OPEN after reaching failure threshold', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.isAvailable()).toBe(true);

    breaker.recordFailure(); // 3rd failure
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.isAvailable()).toBe(false);
  });

  it('should reset failure count upon success', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();

    expect(breaker.getState()).toBe('CLOSED');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED'); // Only 1 failure now
  });
});
