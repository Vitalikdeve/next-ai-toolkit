import { StreamChunk, AIProvider } from './types.js';
import { CancellationError } from './errors.js';

export interface SSEOptions {
  heartbeatIntervalMs?: number;
  signal?: AbortSignal;
}

export class AIStreamTransformer {
  /**
   * Converts an asynchronous iterable chunk generator into standard Server-Sent Events (SSE) Uint8Array stream
   */
  static createSSEStream(
    generator: AsyncIterable<string>,
    model: string,
    provider: AIProvider,
    options: SSEOptions = {}
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let heartbeatTimer: any = null;

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        if (options.signal?.aborted) {
          controller.error(new CancellationError());
          return;
        }

        const onAbort = () => {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          controller.error(new CancellationError());
        };

        options.signal?.addEventListener('abort', onAbort);

        if (options.heartbeatIntervalMs && options.heartbeatIntervalMs > 0) {
          heartbeatTimer = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch {
              clearInterval(heartbeatTimer);
            }
          }, options.heartbeatIntervalMs);
        }

        try {
          for await (const chunk of generator) {
            if (options.signal?.aborted) {
              throw new CancellationError();
            }

            const data: StreamChunk = {
              text: chunk,
              isComplete: false,
              model,
              provider
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }

          const completionChunk: StreamChunk = {
            text: '',
            isComplete: true,
            model,
            provider,
            finishReason: 'stop'
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          options.signal?.removeEventListener('abort', onAbort);
        }
      }
    });
  }
}
