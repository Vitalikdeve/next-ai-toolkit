# 🛡️ next-ai-toolkit

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Reliability-Circuit%20Breaker%20%2B%20Backoff-10B981?style=for-the-badge" alt="Reliability" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI/CD" />
  <img src="https://img.shields.io/badge/Version-v0.1.0--preview-F59E0B?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="License" />
</p>

A production-oriented AI reliability & orchestration toolkit for TypeScript, **Next.js** (App Router & Server Actions), and **Node.js** applications.

Instead of wrapping raw API calls, `next-ai-toolkit` provides resilience patterns for real-world AI applications: **multi-provider failover cascades**, **exponential backoff with jitter**, **circuit breakers for rate-limited endpoints**, **sub-cent token cost telemetry**, and **resilient SSE streaming**.

---

## ⚡ Core Features

- 🔄 **Multi-Provider Failover Cascades:** Automatic fallback routing across Google Gemini, OpenAI, Mistral, Anthropic, and DeepSeek when upstream models encounter rate limits or transient network errors.
- 🛑 **Integrated Circuit Breakers:** Prevents cascading latency spikes by automatically isolating broken or rate-limited endpoints (`CLOSED` → `OPEN` → `HALF_OPEN`).
- ⏳ **Exponential Backoff with Full Jitter:** Prevents thundering herd problems on retries with strict respect for `Retry-After` headers.
- ⚡ **AbortController & Timeout Support:** Cancel in-flight LLM requests and long sleep delays cleanly upon client disconnects.
- 📊 **Telemetry & Observability Hooks:** Capture `onAttempt`, `onFailover`, `onSuccess`, and `onCircuitOpen` events for Datadog, Sentry, or custom logs.
- 💰 **Token Cost Telemetry:** Real-time token estimation and USD financial cost calculation across popular models.
- 📡 **SSE Stream Transformer:** Convert async generators into robust `text/event-stream` responses with configurable keepalive heartbeats.
- 🧪 **Deterministic Mock Provider:** Unit-test complex AI pipelines without touching live API keys or spending cloud credits.

---

## 📦 Installation

> **Developer Preview (v0.1.0):** Available directly via GitHub repository.

```bash
# Install directly from GitHub
npm install github:Vitalikdeve/next-ai-toolkit

# Or clone and link locally for development
git clone https://github.com/Vitalikdeve/next-ai-toolkit.git
cd next-ai-toolkit
npm install
npm run build
```

---

## 🚀 Quick Start

### 1. Resilient Failover with Circuit Breakers & Backoff

```typescript
import { ResilientAIOrchestrator, RateLimitError } from '@vitalikdeve/next-ai-toolkit';

const orchestrator = new ResilientAIOrchestrator([
  {
    model: { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
    handler: async (prompt, options) => {
      // Primary provider
      return await callGoogleGemini(prompt, options?.signal);
    },
    circuitBreakerOptions: { failureThreshold: 3, recoveryTimeMs: 15000 }
  },
  {
    model: { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral' },
    handler: async (prompt, options) => {
      // Automatic fallback if Gemini hits rate limits (429) or timeouts
      return await callMistralAI(prompt, options?.signal);
    }
  }
]);

const result = await orchestrator.executeWithFallback('Analyze resume for ATS compliance', {
  timeoutMs: 6000,
  retryPolicy: { maxRetries: 2, initialDelayMs: 200, jitter: true },
  hooks: {
    onFailover: (from, to, reason) => console.warn(`🔄 Failover: ${from.name} -> ${to.name} (${reason.message})`),
    onAttemptSuccess: (model, durationMs) => console.log(`✅ Success via ${model.name} in ${durationMs}ms`)
  }
});

console.log('Result:', result.content);
console.log('Total Cost:', `$${result.estimatedCost.totalCost} USD`);
```

---

### 2. Next.js App Router SSE Streaming with Heartbeats

```typescript
// app/api/ai/stream/route.ts
import { AIStreamTransformer } from '@vitalikdeve/next-ai-toolkit';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  async function* generateChunks() {
    yield 'Analyzing professional summary...\n';
    yield 'Evaluating keyword density...\n';
    yield 'ATS Score calculated.\n';
  }

  const sseStream = AIStreamTransformer.createSSEStream(
    generateChunks(),
    'gemini-2.0-flash',
    'google',
    { heartbeatIntervalMs: 15000, signal: req.signal }
  );

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
```

---

### 3. Deterministic Testing with Mock Providers

```typescript
import { ResilientAIOrchestrator, createMockProvider } from '@vitalikdeve/next-ai-toolkit';
import { it, expect } from 'vitest';

it('should test failover without real API calls', async () => {
  const primary = createMockProvider(
    { id: 'gemini', name: 'Gemini', provider: 'google' },
    { failTimes: 1, failureError: new Error('Rate limit (429)') }
  );

  const fallback = createMockProvider(
    { id: 'mistral', name: 'Mistral', provider: 'mistral' },
    { responses: ['Mocked Success Response'] }
  );

  const orchestrator = new ResilientAIOrchestrator([primary.registration, fallback.registration]);
  const result = await orchestrator.executeWithFallback('Test', { retryPolicy: { maxRetries: 0 } });

  expect(result.content).toBe('Mocked Success Response');
  expect(result.usedModel.id).toBe('mistral');
});
```

---

## 🧪 Testing

```bash
npm test
```

---

## 📄 License
MIT © [Vitalik Zelianko](https://github.com/Vitalikdeve)
