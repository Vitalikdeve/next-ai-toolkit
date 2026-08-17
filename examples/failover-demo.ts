import { ResilientAIOrchestrator, createMockProvider } from '../src/index.js';

// Setup primary provider with simulated rate limiting
const geminiProvider = createMockProvider(
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
  { failTimes: 2, failureError: new Error('Rate limit (429 Too Many Requests)') }
);

// Setup secondary provider
const mistralProvider = createMockProvider(
  { id: 'mistral-large', name: 'Mistral Large 2411', provider: 'mistral' },
  { responses: ['[Mistral] Generated optimized ATS keywords for Senior Full-Stack role.'] }
);

const orchestrator = new ResilientAIOrchestrator([
  geminiProvider.registration,
  mistralProvider.registration
]);

async function run() {
  console.log('--- Executing AI prompt with automatic failover ---');

  const result = await orchestrator.executeWithFallback('Analyze resume keywords', {
    timeoutMs: 5000,
    retryPolicy: { maxRetries: 1, initialDelayMs: 100, jitter: true },
    hooks: {
      onAttemptStart: (model, attempt) => console.log(`[Attempt ${attempt}] Calling ${model.name}...`),
      onAttemptError: (model, err) => console.log(`⚠️  ${model.name} failed: ${err.message}`),
      onFailover: (from, to, reason) => console.log(`🔄 Failover triggered from ${from.name} -> ${to.name}. Reason: ${reason.message}`),
      onAttemptSuccess: (model, duration) => console.log(`✅ Success from ${model.name} in ${duration}ms`)
    }
  });

  console.log('\nResult content:', result.content);
  console.log('Estimated Cost:', `$${result.estimatedCost.totalCost} USD`);
  console.log('Attempts History:', result.attempts);
}

run().catch(console.error);
