export type AIProvider = 'openai' | 'google' | 'anthropic' | 'mistral' | 'custom';

export interface ModelPricing {
  promptTokenPricePerMillion: number;
  completionTokenPricePerMillion: number;
}

export interface ModelConfig {
  id: string;
  provider: AIProvider;
  name: string;
  maxTokens: number;
  pricing?: ModelPricing;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  model: string;
  provider: AIProvider;
  finishReason?: string;
}

export interface ExecutionOptions {
  timeoutMs?: number;
  maxRetries?: number;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export type LLMHandler = (prompt: string, options?: ExecutionOptions) => Promise<string>;

export interface ProviderRegistration {
  model: ModelConfig;
  handler: LLMHandler;
}
