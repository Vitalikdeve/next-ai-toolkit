export class PromptBuilder<TParams extends Record<string, any> = Record<string, any>> {
  private template: string;
  private systemPrompt?: string;

  constructor(template: string, systemPrompt?: string) {
    this.template = template;
    this.systemPrompt = systemPrompt;
  }

  setSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt;
    return this;
  }

  render(params: TParams): { prompt: string; systemPrompt?: string } {
    let rendered = this.template;

    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value ?? ''));
    }

    return {
      prompt: rendered,
      systemPrompt: this.systemPrompt
    };
  }
}
