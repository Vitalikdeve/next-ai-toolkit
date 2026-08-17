import { AttemptRecord } from './errors.js';

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'mistral' | 'deepseek' | 'custom';

export interface ModelPricing {
  promptTokenPricePerMillion: number;
  completionTokenPricePerMillion: number;
}

export interface ModelConfig {
  id: string;
  provider: AIProvider;
  name: string;
  maxTokens?: number;
  pricing?: ModelPricing;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeMs?: number;
  samplingDurationMs?: number;
}

export interface TelemetryHooks {
  onAttemptStart?: (model: ModelConfig, attempt: number) => void;
  onAttemptSuccess?: (model: ModelConfig, durationMs: number, attempt: number) => void;
  onAttemptError?: (model: ModelConfig, error: Error, attempt: number) => void;
  onFailover?: (fromModel: ModelConfig, toModel: ModelConfig, reason: Error) => void;
  onCircuitOpen?: (model: ModelConfig) => void;
  onCircuitClose?: (model: ModelConfig) => void;
}

export interface ExecutionOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  retryPolicy?: Partial<RetryPolicy>;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  hooks?: TelemetryHooks;
}

export type LLMHandler = (prompt: string, options?: ExecutionOptions) => Promise<string>;

export interface ProviderRegistration {
  model: ModelConfig;
  handler: LLMHandler;
  circuitBreakerOptions?: CircuitBreakerOptions;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  model: string;
  provider: AIProvider;
  finishReason?: string;
}

export interface CostBreakdown {
  promptCost: number;
  completionCost: number;
  totalCost: number;
}

export interface ExecutionResult {
  content: string;
  usedModel: ModelConfig;
  totalDurationMs: number;
  attempts: AttemptRecord[];
  estimatedTokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  estimatedCost: CostBreakdown;
}
