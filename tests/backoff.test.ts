import { describe, it, expect } from 'vitest';
import { calculateBackoffDelay, sleepWithSignal } from '../src/backoff.js';
import { CancellationError } from '../src/errors.js';

describe('calculateBackoffDelay', () => {
  it('should calculate exponential delay without jitter', () => {
    const delay1 = calculateBackoffDelay(1, { initialDelayMs: 100, backoffFactor: 2, jitter: false });
    const delay2 = calculateBackoffDelay(2, { initialDelayMs: 100, backoffFactor: 2, jitter: false });
    const delay3 = calculateBackoffDelay(3, { initialDelayMs: 100, backoffFactor: 2, jitter: false });

    expect(delay1).toBe(100);
    expect(delay2).toBe(200);
    expect(delay3).toBe(400);
  });

  it('should cap delay at maxDelayMs', () => {
    const delay = calculateBackoffDelay(10, { initialDelayMs: 100, maxDelayMs: 1000, backoffFactor: 2, jitter: false });
    expect(delay).toBe(1000);
  });

  it('should generate jittered delay within [0, capped] bounds', () => {
    const delay = calculateBackoffDelay(3, { initialDelayMs: 100, backoffFactor: 2, jitter: true });
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(400);
  });
});

describe('sleepWithSignal', () => {
  it('should reject immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(sleepWithSignal(1000, controller.signal)).rejects.toThrow(CancellationError);
  });

  it('should abort in-flight sleep when signal aborts', async () => {
    const controller = new AbortController();
    const sleepPromise = sleepWithSignal(5000, controller.signal);

    setTimeout(() => controller.abort(), 20);

    await expect(sleepPromise).rejects.toThrow(CancellationError);
  });
});
