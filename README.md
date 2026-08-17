# 🚀 next-ai-toolkit

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zero%20Dependencies-Lightweight-10B981?style=for-the-badge" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI/CD" />
  <img src="https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge" alt="License" />
</p>

A production-ready, ultra-lightweight TypeScript toolkit for building resilient AI-powered applications in **Next.js** (App Router & Server Actions) and **Node.js**.

---

## ✨ Features

- 🔄 **Multi-Provider Resilient Failover:** Automatically cascade prompt execution across multiple LLM providers (Gemini, OpenAI, Mistral, Anthropic) if a provider hits rate-limits, timeouts, or network degradation.
- ⚡ **Stream SSE Transformers:** Standardize raw asynchronous generators into production-grade Server-Sent Events (`text/event-stream`).
- 💰 **Token & Cost Telemetry:** Real-time token estimation and exact USD financial cost calculation across all major LLM models.
- 📝 **Type-Safe Prompt Builder:** Clean interpolation of runtime variables with template system prompts.
- 🧪 **100% Tested:** Comprehensive test suite powered by Vitest and GitHub Actions CI matrix testing.

---

## 📦 Installation

```bash
npm install @vitalikdeve/next-ai-toolkit
# or
pnpm add @vitalikdeve/next-ai-toolkit
# or
yarn add @vitalikdeve/next-ai-toolkit
```

---

## 🚀 Quick Start

### 1. Resilient Multi-Provider Failover Orchestrator

```typescript
import { ResilientAIOrchestrator } from '@vitalikdeve/next-ai-toolkit';

const orchestrator = new ResilientAIOrchestrator([
  {
    model: { id: 'gemini-2.0-flash', name: 'Gemini Flash', provider: 'google', maxTokens: 8192 },
    handler: async (prompt) => {
      // Call Google Gemini API
      return await callGemini(prompt);
    }
  },
  {
    model: { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral', maxTokens: 4096 },
    handler: async (prompt) => {
      // Automatic fallback if Gemini encounters rate-limits or network errors
      return await callMistral(prompt);
    }
  }
]);

const response = await orchestrator.executeWithFallback('Analyze resume keywords', {
  timeoutMs: 8000,
  maxRetries: 1
});

console.log(response.content);
console.log(`Executed by: ${response.usedModelId} in ${response.durationMs}ms`);
```

---

### 2. Token & USD Cost Estimator

```typescript
import { TokenCostEstimator } from '@vitalikdeve/next-ai-toolkit';

const prompt = "Please optimize this software engineer resume for ATS systems...";
const promptTokens = TokenCostEstimator.estimateTokens(prompt);
const completionTokens = 450;

const cost = TokenCostEstimator.calculateCost('gpt-4o-mini', promptTokens, completionTokens);

console.log(`Estimated Total Cost: $${cost.totalCost} USD`);
```

---

### 3. Server-Sent Events (SSE) Streaming in Next.js App Router

```typescript
// app/api/ai/stream/route.ts
import { AIStreamTransformer } from '@vitalikdeve/next-ai-toolkit';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  async function* generateChunks() {
    yield "Analyzing candidate experience...";
    yield "Calculating ATS compatibility score...";
    yield "Optimization complete!";
  }

  const sseStream = AIStreamTransformer.createSSEStream(generateChunks(), 'gemini-2.0-flash', 'google');

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## 🧪 Testing

```bash
npm test
```

---

## 📄 License
MIT © [Vitalik Zelianko](https://github.com/Vitalikdeve)
