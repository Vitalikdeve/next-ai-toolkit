// app/api/ai/stream/route.ts (Next.js App Router)
import { AIStreamTransformer } from '../src/index.js';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  // Async generator yielding raw chunks from any AI model or pipeline
  async function* generateResumeOptimizationStream() {
    yield 'Step 1: Extracting skills from resume...\n';
    yield 'Step 2: Matching against target job description...\n';
    yield 'Step 3: Calculating ATS score: 94/100.\n';
    yield 'Optimization completed successfully.';
  }

  // Create standard SSE Uint8Array readable stream with 15s heartbeats
  const sseStream = AIStreamTransformer.createSSEStream(
    generateResumeOptimizationStream(),
    'gemini-2.0-flash',
    'google',
    { heartbeatIntervalMs: 15000 }
  );

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
