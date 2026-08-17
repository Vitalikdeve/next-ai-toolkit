import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '../src/prompt-builder.js';

describe('PromptBuilder', () => {
  it('should interpolate template parameters correctly', () => {
    const builder = new PromptBuilder<{ name: string; role: string }>(
      'Hello, my name is {{ name }} and I am a {{ role }}.'
    );
    const { prompt } = builder.render({ name: 'Alex', role: 'Full-Stack Developer' });
    expect(prompt).toBe('Hello, my name is Alex and I am a Full-Stack Developer.');
  });

  it('should maintain system prompt when configured', () => {
    const builder = new PromptBuilder<{ input: string }>('Input: {{ input }}')
      .setSystemPrompt('You are an expert technical interviewer.');
    const result = builder.render({ input: 'Explain React Server Components' });
    expect(result.systemPrompt).toBe('You are an expert technical interviewer.');
    expect(result.prompt).toBe('Input: Explain React Server Components');
  });
});
