export class PromptBuilder<TParams extends Record<string, any> = Record<string, any>> {
  private template: string;
  private systemPrompt?: string;
  private requiredVariables: Set<string> = new Set();

  constructor(template: string, systemPrompt?: string) {
    this.template = template;
    this.systemPrompt = systemPrompt;
    this.extractTemplateVariables();
  }

  private extractTemplateVariables(): void {
    const matches = this.template.matchAll(/{{\\s*([a-zA-Z0-9_]+)\\s*}}/g);
    for (const match of matches) {
      if (match[1]) {
        this.requiredVariables.add(match[1]);
      }
    }
  }

  setSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt;
    return this;
  }

  getRequiredVariables(): string[] {
    return Array.from(this.requiredVariables);
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
