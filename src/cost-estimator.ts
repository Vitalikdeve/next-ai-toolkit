import { ModelPricing, CostBreakdown } from './types.js';

export const STANDARD_PRICING_TABLE: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { promptTokenPricePerMillion: 2.50, completionTokenPricePerMillion: 10.00 },
  'gpt-4o-mini': { promptTokenPricePerMillion: 0.15, completionTokenPricePerMillion: 0.60 },
  'o1': { promptTokenPricePerMillion: 15.00, completionTokenPricePerMillion: 60.00 },
  'o3-mini': { promptTokenPricePerMillion: 1.10, completionTokenPricePerMillion: 4.40 },

  // Anthropic
  'claude-3-5-sonnet': { promptTokenPricePerMillion: 3.00, completionTokenPricePerMillion: 15.00 },
  'claude-3-5-haiku': { promptTokenPricePerMillion: 0.80, completionTokenPricePerMillion: 4.00 },

  // Google Gemini
  'gemini-2.0-flash': { promptTokenPricePerMillion: 0.10, completionTokenPricePerMillion: 0.40 },
  'gemini-1.5-pro': { promptTokenPricePerMillion: 1.25, completionTokenPricePerMillion: 5.00 },
  'gemini-1.5-flash': { promptTokenPricePerMillion: 0.075, completionTokenPricePerMillion: 0.30 },

  // Mistral
  'mistral-large': { promptTokenPricePerMillion: 2.00, completionTokenPricePerMillion: 6.00 },
  'mistral-small': { promptTokenPricePerMillion: 0.20, completionTokenPricePerMillion: 0.60 },

  // DeepSeek
  'deepseek-chat': { promptTokenPricePerMillion: 0.14, completionTokenPricePerMillion: 0.28 },
  'deepseek-reasoner': { promptTokenPricePerMillion: 0.55, completionTokenPricePerMillion: 2.19 }
};

export class TokenCostEstimator {
  /**
   * Approximate token count from string (heuristic: ~4 characters per token for English/Code)
   */
  static estimateTokens(text: string): number {
    if (!text || text.length === 0) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate precise financial cost in USD for prompt and completion tokens
   */
  static calculateCost(
    modelId: string,
    promptTokens: number,
    completionTokens: number,
    customPricing?: ModelPricing
  ): CostBreakdown {
    const pricing = customPricing || STANDARD_PRICING_TABLE[modelId] || {
      promptTokenPricePerMillion: 1.0,
      completionTokenPricePerMillion: 2.0
    };

    const promptCost = (promptTokens / 1_000_000) * pricing.promptTokenPricePerMillion;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionTokenPricePerMillion;
    const totalCost = promptCost + completionCost;

    return {
      promptCost: Number(promptCost.toFixed(6)),
      completionCost: Number(completionCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6))
    };
  }
}
