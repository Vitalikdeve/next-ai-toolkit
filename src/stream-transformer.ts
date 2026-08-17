import { StreamChunk, AIProvider } from './types.js';

export class AIStreamTransformer {
  /**
   * Converts async text chunk stream into standard Server-Sent Events (SSE) data stream
   */
  static createSSEStream(
    generator: AsyncIterable<string>,
    model: string,
    provider: AIProvider
  ): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of generator) {
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
            provider
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
  }
}
