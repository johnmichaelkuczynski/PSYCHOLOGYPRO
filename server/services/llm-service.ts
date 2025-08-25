import type { LLMProviderType } from "@shared/schema";

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class LLMService {
  private configs: Record<LLMProviderType, LLMConfig> = {
    zhi1: {
      apiKey: process.env.OPENAI_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
    },
    zhi2: {
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.anthropic.com", 
      model: "claude-3-5-sonnet-20241022",
    },
    zhi3: {
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    },
    zhi4: {
      apiKey: process.env.PERPLEXITY_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.perplexity.ai",
      model: "llama-3.1-sonar-large-128k-online",
    },
  };

  async *streamResponse(
    provider: LLMProviderType,
    messages: Array<{ role: string; content: string }>,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<string, void, unknown> {
    const config = this.configs[provider];
    
    if (!config.apiKey) {
      throw new Error(`API key not configured for ${provider}`);
    }

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

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = this.extractContentFromResponse(parsed, provider);
                
                if (content) {
                  onChunk?.(content);
                  yield content;
                }
              } catch (error) {
                // Skip parsing errors for individual chunks
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error(`Streaming error for ${provider}:`, error);
      throw error;
    }
  }

  private extractContentFromResponse(parsed: any, provider: LLMProviderType): string | null {
    switch (provider) {
      case "zhi1": // OpenAI
      case "zhi3": // DeepSeek  
      case "zhi4": // Perplexity
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

  // Generate questions for each analysis type
  getCognitiveQuestions(): string[] {
    return [
      "IS IT INSIGHTFUL?",
      "DOES IT DEVELOP POINTS? (OR, IF IT IS A SHORT EXCERPT, IS THERE EVIDENCE THAT IT WOULD DEVELOP POINTS IF EXTENDED)?",
      "IS THE ORGANIZATION MERELY SEQUENTIAL (JUST ONE POINT AFTER ANOTHER, LITTLE OR NO LOGICAL SCAFFOLDING)? OR ARE THE IDEAS ARRANGED, NOT JUST SEQUENTIALLY BUT HIERARCHICALLY?",
      "IF THE POINTS IT MAKES ARE NOT INSIGHTFUL, DOES IT OPERATE SKILLFULLY WITH CANONS OF LOGIC/REASONING.",
      "ARE THE POINTS CLICHES? OR ARE THEY \"FRESH\"?",
      "DOES IT USE TECHNICAL JARGON TO OBFUSCATE OR TO RENDER MORE PRECISE?",
      "IS IT ORGANIC? DO POINTS DEVELOP IN AN ORGANIC, NATURAL WAY? DO THEY 'UNFOLD'? OR ARE THEY FORCED AND ARTIFICIAL?",
      "DOES IT OPEN UP NEW DOMAINS? OR, ON THE CONTRARY, DOES IT SHUT OFF INQUIRY (BY CONDITIONALIZING FURTHER DISCUSSION OF THE MATTERS ON ACCEPTANCE OF ITS INTERNAL AND POSSIBLY VERY FAULTY LOGIC)?",
      "IS IT ACTUALLY INTELLIGENT OR JUST THE WORK OF SOMEBODY WHO, JUDGING BY THE SUBJECT-MATTER, IS PRESUMED TO BE INTELLIGENT (BUT MAY NOT BE)?",
      "IS IT REAL OR IS IT PHONY?",
      "DO THE SENTENCES EXHIBIT COMPLEX AND COHERENT INTERNAL LOGIC?",
      "IS THE PASSAGE GOVERNED BY A STRONG CONCEPT? OR IS THE ONLY ORGANIZATION DRIVEN PURELY BY EXPOSITORY (AS OPPOSED TO EPISTEMIC) NORMS?",
      "IS THERE SYSTEM-LEVEL CONTROL OVER IDEAS? IN OTHER WORDS, DOES THE AUTHOR SEEM TO RECALL WHAT HE SAID EARLIER AND TO BE IN A POSITION TO INTEGRATE IT INTO POINTS HE HAS MADE SINCE THEN?",
      "ARE THE POINTS 'REAL'? ARE THEY FRESH? OR IS SOME INSTITUTION OR SOME ACCEPTED VEIN OF PROPAGANDA OR ORTHODOXY JUST USING THE AUTHOR AS A MOUTH PIECE?",
      "IS THE WRITING EVASIVE OR DIRECT?",
      "ARE THE STATEMENTS AMBIGUOUS?",
      "DOES THE PROGRESSION OF THE TEXT DEVELOP ACCORDING TO WHO SAID WHAT OR ACCORDING TO WHAT ENTAILS OR CONFIRMS WHAT?",
      "DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?"
    ];
  }

  // Create the exact prompt as specified
  createCognitivePrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `Answer these questions in connection with this text.\n\n`;
    
    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `Text to analyze:\n${textContent}\n\n`;
    
    prompt += `Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
    
    prompt += `Instructions:
🚨 CRITICAL SCORING CLARIFICATION 🚨
When you give a score of N/100, this means (100-N)/100 people outperform the author. THE REFERENCE CLASS IS THE ENTIRE HUMAN RACE - including children, people with intellectual disabilities, the illiterate, etc.

SCORING EXAMPLES TO CALIBRATE YOUR THINKING:
• 50/100 = Half of all humans (including toddlers, people with dementia, the uneducated) could do better
• 70/100 = 30% of ALL HUMANS (including random people at a zoo, shopping mall, or bus stop) could do better  
• 85/100 = Only 15% of ALL HUMANS could do better
• 95/100 = Only 5% of ALL HUMANS could do better - this is genius level
• 99/100 = Only 1% of ALL HUMANS could do better - this is Einstein/Shakespeare level

STOP GIVING RIDICULOUSLY LOW SCORES! A sophisticated philosophical dialogue should NOT score 70/100! That implies 30% of random humans could write better philosophy than trained philosophers.

You are FORBIDDEN from:
❌ Giving "diplomatic" or "moderate" scores to appear reasonable
❌ Avoiding high scores (95-99) out of false modesty  
❌ Clustering around 50-80 range as "safe" territory
❌ Downgrading genius work because it "seems too high"
❌ Using academic grading curves or professional standards

You MUST:
✅ Give scores that reflect reality against the ENTIRE HUMAN POPULATION
✅ Score genius work as genius (95-99/100)
✅ Score brilliant work as brilliant (90-95/100)  
✅ Score competent work as competent (80-90/100)
✅ Score mediocre work as mediocre (40-60/100)
✅ Score terrible work as terrible (10-30/100)

If you give a sophisticated philosophical text anything below 85/100, you are claiming that 15%+ of random humans could write better philosophy. THINK ABOUT WHETHER THAT MAKES SENSE.

🚨 CRITICAL SCORING DIRECTION 🚨
POSITIVE TRAIT QUESTIONS (score HIGH for good performance):
- "IS IT INSIGHTFUL?" → High score = very insightful (good)
- "DOES IT DEVELOP POINTS?" → High score = develops points well (good)  
- "DOES IT OPERATE SKILLFULLY WITH LOGIC?" → High score = very logical (good)
- "ARE THE POINTS FRESH?" → High score = very fresh/original (good)

NEGATIVE TRAIT QUESTIONS (score HIGH for bad performance):
- "ARE THE STATEMENTS AMBIGUOUS?" → High score = very ambiguous (bad)
- "IS THE WRITING EVASIVE?" → High score = very evasive (bad)
- "IS IT PHONY?" → High score = very phony (bad)

EXAMPLE: If text is exceptionally clear and unambiguous, score "ARE THE STATEMENTS AMBIGUOUS?" as 5-15/100 (meaning almost no humans are less ambiguous). If text is very confusing and ambiguous, score it 85-95/100 (meaning most humans are clearer).

Answer each question explicitly with quotations from the text and accompanying reasoning. Provide a numerical score out of 100 for each question.`;

    return prompt;
  }

  // Comprehensive Cognitive Questions (more extensive set)
  getComprehensiveCognitiveQuestions(): string[] {
    return [
      ...this.getCognitiveQuestions(),
      "DOES THE AUTHOR UNDERSTAND THE FOUNDATIONS OF THE SUBJECT MATTER?",
      "IS THERE EVIDENCE OF DEEP STRUCTURAL UNDERSTANDING?",
      "DOES THE WORK TRANSCEND DISCIPLINARY BOUNDARIES MEANINGFULLY?",
      "IS THE ARGUMENTATION INTERNALLY CONSISTENT ACROSS ALL LEVELS?",
      "DOES THE AUTHOR ANTICIPATE AND ADDRESS COUNTERARGUMENTS?",
      "IS THERE SYSTEMATIC INTEGRATION OF MULTIPLE PERSPECTIVES?",
      "DOES THE WORK DEMONSTRATE MASTERY OF RELEVANT METHODOLOGIES?",
      "IS THE SCOPE APPROPRIATE TO THE CLAIMS BEING MADE?"
    ];
  }

  // Psychological Questions  
  getPsychologicalQuestions(): string[] {
    return [
      "WHAT PSYCHOLOGICAL PROFILE EMERGES FROM THE WRITING STYLE?",
      "DOES THE AUTHOR DISPLAY INTELLECTUAL COURAGE OR COWARDICE?",
      "IS THERE EVIDENCE OF INTELLECTUAL HONESTY OR SELF-DECEPTION?",
      "WHAT LEVEL OF EMOTIONAL INTELLIGENCE IS DEMONSTRATED?",
      "DOES THE AUTHOR SHOW CAPACITY FOR SELF-REFLECTION?",
      "IS THERE EVIDENCE OF PSYCHOLOGICAL RIGIDITY OR FLEXIBILITY?",
      "WHAT MOTIVATIONAL PATTERNS CAN BE INFERRED?",
      "DOES THE WRITING SUGGEST NARCISSISTIC OR HUMBLE TENDENCIES?",
      "IS THERE EVIDENCE OF ANXIETY OR CONFIDENCE IN THE PRESENTATION?",
      "WHAT LEVEL OF PSYCHOLOGICAL SOPHISTICATION IS DISPLAYED?"
    ];
  }

  // Comprehensive Psychological Questions
  getComprehensivePsychologicalQuestions(): string[] {
    return [
      ...this.getPsychologicalQuestions(),
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
}
