import type { LLMProviderType } from "../../shared/schema.js";
import { ReplitConnectors } from "@replit/connectors-sdk";

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class LLMService {
  private connectors?: ReplitConnectors;

  private getDefaultTreeMode() {
    return {
      enabled: true,
      style: "tractatus",
      shortParagraphs: 2,
      mediumParagraphs: 8,
      comprehensiveParagraphs: 32,
    };
  }

  private configs: Record<LLMProviderType, LLMConfig> = {
    zhi1: {
      apiKey: process.env.OPENAI_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
    },
    zhi2: {
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.anthropic.com", 
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    },
    zhi3: {
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    },
    zhi4: {
      apiKey: process.env.PERPLEXITY_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.perplexity.ai",
      model: "sonar-pro",
    },
    zhi5: {
      apiKey: process.env.XAI_API_KEY || "",
      baseUrl: "https://api.x.ai/v1",
      model: process.env.XAI_MODEL || "grok-4.20-non-reasoning-latest",
    },
  };

  async *streamResponse(
    provider: LLMProviderType,
    messages: Array<{ role: string; content: string }>,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<string, void, unknown> {
    const config = this.configs[provider];
    
    if (!config.apiKey && provider !== "zhi5") {
      const providerKeys: Record<Exclude<LLMProviderType, "zhi5">, string> = {
        zhi1: "OPENAI_API_KEY",
        zhi2: "ANTHROPIC_API_KEY",
        zhi3: "DEEPSEEK_API_KEY",
        zhi4: "PERPLEXITY_API_KEY",
      };
      throw new Error(`${provider.toUpperCase()} is not configured. Add ${providerKeys[provider]} to this deployment's secrets.`);
    }

    const controller = new AbortController();
    let timedOut = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdleTimeout = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 60000);
    };
    resetIdleTimeout();

    try {
      let headers: Record<string, string>;
      let requestBody: any;
      let endpoint: string;

      // Configure request based on provider
      switch (provider) {
        case "zhi1": // OpenAI
          headers = {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          };
          requestBody = {
            model: config.model,
            messages,
            stream: true,
          };
          if (config.model === "gpt-6-luna") {
            requestBody.reasoning_effort = "none";
          }
          endpoint = `${config.baseUrl}/chat/completions`;
          break;

        case "zhi2": // Anthropic
          headers = {
            "x-api-key": config.apiKey,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          };
          requestBody = {
            model: config.model,
            messages,
            stream: true,
            max_tokens: 4000,
          };
          endpoint = `${config.baseUrl}/v1/messages`;
          break;

        case "zhi3": // DeepSeek
          headers = {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          };
          requestBody = {
            model: config.model,
            messages,
            stream: true,
          };
          endpoint = `${config.baseUrl}/chat/completions`;
          break;

        case "zhi4": // Perplexity
          headers = {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          };
          requestBody = {
            model: config.model,
            messages,
            stream: true,
          };
          endpoint = `${config.baseUrl}/chat/completions`;
          break;

        case "zhi5": // Grok (xAI)
          headers = {
            "Content-Type": "application/json",
          };
          if (config.apiKey) {
            headers.Authorization = `Bearer ${config.apiKey}`;
          }
          requestBody = {
            model: config.model,
            messages,
            stream: true,
          };
          endpoint = `${config.baseUrl}/chat/completions`;
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const options = {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      };
      // Self-hosted deployments use XAI_API_KEY. In Replit, the connected xAI
      // account supplies credentials without exposing a key to the application.
      let response: Response;
      if (provider === "zhi5" && !config.apiKey) {
        try {
          response = await (this.connectors ??= new ReplitConnectors()).proxy(
            "xai", "/v1/chat/completions", options
          );
        } catch (error) {
          if (timedOut) throw error;
          throw new Error("ZHI 5 could not access the xAI connection. In a self-hosted Coolify deployment, set XAI_API_KEY in the app's secrets. In Replit, reconnect xAI.");
        }
      } else {
        response = await fetch(endpoint, options);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = ''; // Buffer to handle incomplete chunks

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer for next iteration
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (!data) continue;
              if (data === '[DONE]') {
                return;
              }

              let parsed: any;
              try {
                parsed = JSON.parse(data);
              } catch {
                console.error(`Invalid streaming JSON from ${provider}`);
                continue;
              }
              if (parsed.error || parsed.type === "error") {
                throw new Error(parsed.error?.message || parsed.message || "The AI provider reported a streaming error.");
              }
              const content = this.extractContentFromResponse(parsed, provider);
              if (content) {
                resetIdleTimeout();
                onChunk?.(content);
                yield content;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (timedOut) {
        throw new Error("The AI provider sent no new text for 60 seconds. The request was stopped instead of leaving you waiting. Try another engine.");
      }
      console.error(`Streaming error for ${provider}:`, error);
      throw error;
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }
  }

  private buildScaffoldPrompt(title: string, textContent: string, additionalContext?: string): string {
    const treeMode = this.getDefaultTreeMode();
    return `${title}

Use this scaffold before writing the answer.
If the answer would be longer than 2 paragraphs, you must first produce a compact outline with numbered sections and then write under those headings.
Do not repeat the same point in different words.
Do not ramble.
Do not produce more than one sentence per bullet in the scaffold.
Use Tractatus tree style.
Short answers must be exactly ${treeMode.shortParagraphs} paragraphs.
Medium answers must be exactly ${treeMode.mediumParagraphs} paragraphs.
Comprehensive answers must be exactly ${treeMode.comprehensiveParagraphs} paragraphs.

STRUCTURE:
1. Thesis
2. Evidence / reasoning
3. Implications / caveats

TEXT:
${textContent}
${additionalContext ? `\nCONTEXT:\n${additionalContext}` : ""}
`;
  }

  private extractContentFromResponse(parsed: any, provider: LLMProviderType): string | null {
    switch (provider) {
      case "zhi1": // OpenAI
      case "zhi3": // DeepSeek  
      case "zhi4": // Perplexity
      case "zhi5": // Grok
        return parsed.choices?.[0]?.delta?.content || null;
        
      case "zhi2": // Anthropic
        // Anthropic has different response format
        if (parsed.type === "content_block_delta") {
          return parsed.delta?.text || null;
        }
        return null;
        
      default:
        return null;
    }
  }

  // Create MICRO psychological prompt - ULTRA CONCISE
  createMicropsychologicalPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    return `MICRO PSYCHOLOGICAL - ONE SENTENCE PER QUESTION THEN VERDICT

TEXT: ${textContent}
${additionalContext ? `\nCONTEXT: ${additionalContext}` : ''}

For each question: 1 sentence assessment, then VERDICT: [Assessment type]

${questions.map((q, i) => `${i + 1}. ${q}\nAnswer: [1 sentence] VERDICT: [Healthy/Defended/Fragmented/Integrated/Other]`).join('\n\n')}

NO elaboration. NO scoring. Sentence + verdict for each.`;
  }

  // Create MICRO psychopathological prompt - ULTRA CONCISE
  createMicropsychopathologicalPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    return `MICRO PSYCHOPATHOLOGICAL - ONE SENTENCE PER QUESTION THEN VERDICT

TEXT: ${textContent}
${additionalContext ? `\nCONTEXT: ${additionalContext}` : ''}

For each question: 1 sentence assessment, then VERDICT: [Category]

${questions.map((q, i) => `${i + 1}. ${q}\nAnswer: [1 sentence] VERDICT: [Clear/Distorted/Delusional/Organized/Fragmented]`).join('\n\n')}

NO elaboration. NO scoring. Sentence + verdict for each.`;
  }

  // Comprehensive Psychological Questions
  getComprehensivePsychologicalQuestions(): string[] {
    return [
      ...this.getMicropsychologicalQuestions(),
      "WHAT ATTACHMENT PATTERNS ARE SUGGESTED BY THE ARGUMENTATION STYLE?",
      "DOES THE AUTHOR DISPLAY MATURE OR IMMATURE DEFENSE MECHANISMS?",
      "IS THERE EVIDENCE OF EMOTIONAL REGULATION OR DYSREGULATION?",
      "WHAT LEVEL OF EMPATHY IS DEMONSTRATED TOWARD OPPOSING VIEWPOINTS?",
      "DOES THE WORK SUGGEST HIGH OR LOW EMOTIONAL QUOTIENT?",
      "IS THERE EVIDENCE OF PROJECTION OR PSYCHOLOGICAL INSIGHT?",
      "WHAT PERSONALITY TRAITS EMERGE FROM THE COMMUNICATION PATTERNS?",
      "DOES THE AUTHOR SHOW CAPACITY FOR PSYCHOLOGICAL GROWTH?"
    ];
  }

  // Psychopathological Questions
  getPsychopathologicalQuestions(): string[] {
    return [
      "ARE THERE SIGNS OF COGNITIVE DISTORTIONS OR CLEAR THINKING?",
      "DOES THE REASONING SUGGEST PATHOLOGICAL OR HEALTHY MENTAL PROCESSES?",
      "IS THERE EVIDENCE OF PARANOID THINKING OR APPROPRIATE SKEPTICISM?",
      "DOES THE WORK DISPLAY GRANDIOSITY OR APPROPRIATE SELF-ASSESSMENT?",
      "ARE THERE SIGNS OF DELUSIONAL THINKING OR REALITY-BASED REASONING?",
      "DOES THE AUTHOR SHOW CAPACITY FOR LOGICAL COHERENCE?",
      "IS THERE EVIDENCE OF OBSESSIVE-COMPULSIVE PATTERNS IN THE REASONING?",
      "DOES THE WORK SUGGEST MANIC OR BALANCED MENTAL STATES?",
      "ARE THERE SIGNS OF DISSOCIATION OR INTEGRATED THINKING?",
      "DOES THE REASONING SUGGEST PSYCHOTIC OR NEUROTIC ORGANIZATION?"
    ];
  }

  // Comprehensive Psychopathological Questions  
  getComprehensivePsychopathologicalQuestions(): string[] {
    return [
      ...this.getPsychopathologicalQuestions(),
      "WHAT LEVEL OF REALITY TESTING IS DEMONSTRATED?",
      "ARE THERE SIGNS OF THOUGHT DISORDER OR ORGANIZED COGNITION?",
      "DOES THE WORK SUGGEST PERSONALITY DISORDER TRAITS?",
      "IS THERE EVIDENCE OF IMPULSE CONTROL OR DYSCONTROL?",
      "DOES THE REASONING SUGGEST BORDERLINE OR INTEGRATED FUNCTIONING?",
      "ARE THERE SIGNS OF ANTISOCIAL OR PROSOCIAL ORIENTATION?",
      "DOES THE WORK DISPLAY PSYCHOPATHIC OR EMPATHIC CHARACTERISTICS?",
      "IS THERE EVIDENCE OF DEVELOPMENTAL TRAUMA IMPACT ON COGNITION?"
    ];
  }

  // Micro Cognitive Questions (1/4 of comprehensive - 8 questions)
  getMicrocognitiveQuestions(): string[] {
    return [
      "IS IT INSIGHTFUL?",
      "DOES IT DEVELOP POINTS?",
      "ARE THE IDEAS ARRANGED HIERARCHICALLY OR MERELY SEQUENTIALLY?",
      "IS IT ORGANIC OR FORCED?",
      "IS IT REAL OR PHONY?",
      "DO SENTENCES EXHIBIT COMPLEX INTERNAL LOGIC?",
      "ARE NEW STATEMENTS GENERATED FROM OLD ONES OR JUST ADDED?",
      "IS IT ACTUALLY INTELLIGENT OR PRESUMPTION-INTELLIGENT?"
    ];
  }

  // Micro Psychological Questions (1/4 of comprehensive - 4-5 questions)
  getMicropsychologicalQuestions(): string[] {
    return [
      "WHAT PSYCHOLOGICAL PROFILE EMERGES FROM THE WRITING STYLE?",
      "DOES THE AUTHOR DISPLAY INTELLECTUAL COURAGE OR INTELLECTUAL COWARDICE?",
      "IS THERE EVIDENCE OF PSYCHOLOGICAL RIGIDITY OR FLEXIBILITY?",
      "DOES THE WRITING SUGGEST NARCISSISTIC OR HUMBLE TENDENCIES?",
      "WHAT LEVEL OF PSYCHOLOGICAL SOPHISTICATION IS DISPLAYED?"
    ];
  }

  // Micro Psychopathological Questions (1/4 of comprehensive - 4-5 questions)
  getMicropsychopathologicalQuestions(): string[] {
    return [
      "ARE THERE SIGNS OF COGNITIVE DISTORTIONS OR CLEAR THINKING?",
      "DOES THE REASONING SUGGEST PATHOLOGICAL OR HEALTHY MENTAL PROCESSES?",
      "ARE THERE SIGNS OF DELUSIONAL THINKING OR REALITY-BASED REASONING?",
      "DOES THE AUTHOR SHOW CAPACITY FOR LOGICAL COHERENCE?",
      "DOES THE REASONING SUGGEST PSYCHOTIC OR NEUROTIC ORGANIZATION?"
    ];
  }

  // MBTI Questions (Normal) - DISTINCT, NOT REPETITIVE
  getMBTIQuestions(): string[] {
    return [
      "ENERGY SOURCE - Does the author draw energy from internal analysis and independent thinking, or from interaction and external feedback?",
      "INFORMATION GATHERING - What type of information dominates? Specific facts/details/experience, or broader patterns/connections/possibilities?",
      "DECISION CRITERIA - When evaluating ideas, does the author prioritize logical consistency and objective principles, or human impact and alignment with values?",
      "LIFESTYLE PREFERENCE - Is the approach structured, planned, and conclusive, or exploratory, adaptive, and open to multiple outcomes?",
      "FOCUS OF ATTENTION - Does the author dwell on inner meanings and implications, or external realities and immediate contexts?",
      "HOW IDEAS DEVELOP - Do ideas emerge from synthesis of many angles and possibilities (breadth), or from deep analysis of core principles (depth)?",
      "CONFLICT RESOLUTION - Are conflicts resolved through logical argument/winning the point, or through seeking understanding and harmony?",
      "CERTAINTY COMFORT - Does the author seek definitive answers and closure, or accept ambiguity and remain open to revision?",
      "LANGUAGE STYLE - Is language precise, technical, and efficient, or evocative, rich, and focused on nuance?",
      "RISK ORIENTATION - Does the author prefer proven methods and established tradition, or experimentation and novel approaches?"
    ];
  }

  // Comprehensive MBTI Questions (Extended with deeper analysis) - 20 distinct questions
  getComprehensiveMBTIQuestions(): string[] {
    return [
      // Core 10 questions
      ...this.getMBTIQuestions(),
      
      // Extended 10 - addressing different analysis angles
      "COMPLEXITY TOLERANCE - Does the author embrace intricate, multi-layered problems or prefer clear-cut, straightforward issues?",
      "PROBLEM-SOLVING APPROACH - When faced with a problem, does the author brainstorm multiple solutions first or narrow down to the best one immediately?",
      "SOCIAL ENERGY DISPLAY - Is the author's writing collaborative and inviting readers in, or independent and self-contained?",
      "FUTURE ORIENTATION - Does the text emphasize what could be (possibilities, potential) or what is (current reality, facts)?",
      "CONSISTENCY IMPORTANCE - How important is maintaining logical consistency versus adapting positions based on new information?",
      "CRITICISM RESPONSE - When encountering opposing views, does the author seek to refute them or understand them?",
      "DETAIL LEVEL - Does the author get lost in specifics or gloss over them to see the bigger picture?",
      "SPONTANEITY COMFORT - Is the writing planned and deliberate or improvisational and reactive?",
      "VALUE EXPRESSION - Are personal values explicitly stated and central, or implicit and secondary to facts?",
      "WORLD VIEW - Is the world fundamentally chaotic (requiring constant adaptation) or orderly (requiring clear systems)?"
    ];
  }

  // Micro MBTI Questions (1/4 of comprehensive - 5 questions)
  getMicroMBTIQuestions(): string[] {
    return [
      "ENERGY SOURCE - Does the author draw energy from internal analysis and independent thinking, or from interaction and external feedback?",
      "INFORMATION GATHERING - What type of information dominates? Specific facts/details/experience, or broader patterns/connections/possibilities?",
      "DECISION CRITERIA - When evaluating ideas, does the author prioritize logical consistency and objective principles, or human impact and alignment with values?",
      "CERTAINTY COMFORT - Does the author seek definitive answers and closure, or accept ambiguity and remain open to revision?",
      "LANGUAGE STYLE - Is language precise, technical, and efficient, or evocative, rich, and focused on nuance?"
    ];
  }

  createMBTIPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `MBTI ANALYSIS - VERDICTS ONLY

For each question, give ONE sentence of evidence followed by the VERDICT letter.

TEXT: ${textContent}

${additionalContext ? `CONTEXT: ${additionalContext}` : ''}

QUESTIONS (Format: Evidence sentence. VERDICT: [Letter])
`;

    questions.forEach((q, i) => {
      prompt += `\n${i + 1}. ${q}\nAnswer format: [1 sentence evidence] VERDICT: [I/E/S/N/T/F/J/P]`;
    });

    prompt += `\n\nEVERY answer must have a VERDICT line or it's invalid.`;

    return prompt;
  }

  createScaffoldedAnalysisPrompt(
    analysisType: string,
    textContent: string,
    additionalContext?: string
  ): string {
    return this.buildScaffoldPrompt(
      `SCAFFOLDED ${analysisType.toUpperCase()} ANALYSIS`,
      textContent,
      additionalContext
    );
  }

  createMBTIFinalPrompt(textContent: string, analysisResults: string[]): string {
    return `MBTI TYPE - STATE IT NOW

Based on these analysis results, state the MBTI type and why in exactly 3 sentences.

ANALYSIS RESULTS:
${analysisResults.join('\n')}

FORMAT:
**TYPE: [4-letter code]**
**WHY:** [Exactly 3 sentences explaining the reasoning]

Do NOT repeat analysis. Do NOT hedge. State the type and move on.`;
  }

  createMicroMBTIPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    return `MICRO MBTI - ONE SENTENCE PER QUESTION THEN VERDICT

TEXT: ${textContent}
${additionalContext ? `\nCONTEXT: ${additionalContext}` : ''}

For each question: 1 sentence evidence, then VERDICT: [letter]

${questions.map((q, i) => `${i + 1}. ${q}\nAnswer: [1 sentence] VERDICT: [I/E/S/N/T/F/J/P]`).join('\n\n')}

NO elaboration. NO hedging. Sentence + verdict for each.`;
  }

  createMicroMBTIFinalPrompt(textContent: string, analysisResults: string[]): string {
    return `MICRO MBTI - STATE THE TYPE. 2 SENTENCES MAX.

ANALYSIS RESULTS:
${analysisResults.join('\n')}

FORMAT:
**TYPE: [4-letter code]**
**REASON:** [2 sentences, no hedging, no repeating analysis]

Done.`;
  }
}
