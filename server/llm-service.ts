import type { LLMProvider, AnalysisResponse } from "../shared/profiler-schema";

export interface LLMConfig {
  apiKey: string;
  model: string;
  endpoint: string;
}

export class LLMService {
  private configs: Record<LLMProvider, LLMConfig> = {
    zhi1: { // OpenAI
      apiKey: process.env.OPENAI_API_KEY || "",
      model: "gpt-4o",
      endpoint: "https://api.openai.com/v1/chat/completions"
    },
    zhi2: { // Anthropic
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: "claude-sonnet-4-20250514",
      endpoint: "https://api.anthropic.com/v1/messages"
    },
    zhi3: { // DeepSeek
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      model: "deepseek-chat",
      endpoint: "https://api.deepseek.com/v1/chat/completions"
    },
    zhi4: { // Perplexity
      apiKey: process.env.PERPLEXITY_API_KEY || "",
      model: "llama-3.1-sonar-small-128k-online",
      endpoint: "https://api.perplexity.ai/chat/completions"
    }
  };

  async sendRequest(
    provider: LLMProvider,
    prompt: string,
    systemMessage: string = ""
  ): Promise<string> {
    const config = this.configs[provider];
    
    if (!config.apiKey) {
      throw new Error(`API key not configured for ${provider}`);
    }

    switch (provider) {
      case "zhi1": // OpenAI
        return this.sendOpenAIRequest(config, prompt, systemMessage);
      case "zhi2": // Anthropic
        return this.sendAnthropicRequest(config, prompt, systemMessage);
      case "zhi3": // DeepSeek
        return this.sendDeepSeekRequest(config, prompt, systemMessage);
      case "zhi4": // Perplexity
        return this.sendPerplexityRequest(config, prompt, systemMessage);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async sendOpenAIRequest(config: LLMConfig, prompt: string, systemMessage: string): Promise<string> {
    const messages = [];
    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private async sendAnthropicRequest(config: LLMConfig, prompt: string, systemMessage: string): Promise<string> {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        system: systemMessage || "You are a helpful assistant.",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }

  private async sendDeepSeekRequest(config: LLMConfig, prompt: string, systemMessage: string): Promise<string> {
    const messages = [];
    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private async sendPerplexityRequest(config: LLMConfig, prompt: string, systemMessage: string): Promise<string> {
    const messages = [];
    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
        max_tokens: 4000,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  // Get provider display name
  getProviderName(provider: LLMProvider): string {
    const names = {
      zhi1: "ZHI 1",
      zhi2: "ZHI 2", 
      zhi3: "ZHI 3",
      zhi4: "ZHI 4"
    };
    return names[provider];
  }

  // Check if provider is available
  isProviderAvailable(provider: LLMProvider): boolean {
    return !!this.configs[provider].apiKey;
  }

  // Get available providers
  getAvailableProviders(): LLMProvider[] {
    return Object.keys(this.configs).filter(provider => 
      this.isProviderAvailable(provider as LLMProvider)
    ) as LLMProvider[];
  }
}