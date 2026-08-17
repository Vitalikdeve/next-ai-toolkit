import { CircuitBreakerOptions } from './types.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureTimestamps: number[] = [];
  private nextAttemptTimestamp: number = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  private readonly samplingDurationMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.recoveryTimeMs = options.recoveryTimeMs ?? 15000;
    this.samplingDurationMs = options.samplingDurationMs ?? 60000;
  }

  getState(): CircuitState {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now >= this.nextAttemptTimestamp) {
        this.state = 'HALF_OPEN';
      }
    }

    return this.state;
  }

  isAvailable(): boolean {
    const currentState = this.getState();
    return currentState === 'CLOSED' || currentState === 'HALF_OPEN';
  }

  recordSuccess(): void {
    this.state = 'CLOSED';
    this.failureTimestamps = [];
    this.nextAttemptTimestamp = 0;
  }

  recordFailure(): void {
    const now = Date.now();
    // Prune expired failures outside the sampling window
    this.failureTimestamps = this.failureTimestamps.filter(t => now - t <= this.samplingDurationMs);
    this.failureTimestamps.push(now);

    if (this.state === 'HALF_OPEN' || this.failureTimestamps.length >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTimestamp = now + this.recoveryTimeMs;
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureTimestamps = [];
    this.nextAttemptTimestamp = 0;
  }
}
