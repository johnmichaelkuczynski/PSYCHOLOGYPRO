import type { LLMProviderType } from "../../shared/schema.js";

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
HIGH SCORES ALWAYS MEAN GOOD/POSITIVE EVALUATION - NEVER EXCEPTIONS!

ALL QUESTIONS should be scored so that HIGH SCORES = GOOD PERFORMANCE:
- "IS IT INSIGHTFUL?" → High score = very insightful (good)
- "DOES IT DEVELOP POINTS?" → High score = develops points well (good)  
- "ARE THE STATEMENTS AMBIGUOUS?" → High score = very clear/unambiguous (good)
- "IS THE WRITING EVASIVE?" → High score = very direct/not evasive (good)
- "IS IT PHONY?" → High score = very authentic/not phony (good)
- "ARE THE POINTS CLICHES?" → High score = very fresh/not cliches (good)

FLIP THE INTERPRETATION FOR NEGATIVE TRAIT QUESTIONS:
When a question asks about negative traits (ambiguous, evasive, phony, cliches), interpret the score in REVERSE:
- 95/100 = text is NOT ambiguous/evasive/phony (excellent quality)
- 5/100 = text IS very ambiguous/evasive/phony (terrible quality)

EXAMPLE: If text is exceptionally clear, score "ARE THE STATEMENTS AMBIGUOUS?" as 95/100 meaning "extremely unambiguous/clear." If text is very confusing, score it 5/100 meaning "very ambiguous."

Answer each question explicitly with quotations from the text and accompanying reasoning. Provide a numerical score out of 100 for each question.`;

    return prompt;
  }

  // Create psychological prompt as specified
  createPsychologicalPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `Answer these questions in connection with this text.\n\n`;
    
    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `Text to analyze:\n${textContent}\n\n`;
    
    prompt += `Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
    
    prompt += `Instructions:
A score of N/100 means (100–N)/100 outperform the subject with respect to the psychological capacity defined by the question.

You are not grading. You are answering questions.

Do not default to diagnostic checklists; describe configuration of psyche.

Do not conflate verbal confidence with psychological strength.

Summarize the text and categorize the psychological presentation (e.g., narcissistic, depressive, obsessional, resilient, fragmented).

Evaluate relative to the general population, not only "advanced" or "pathological" groups.

Do not penalize honesty, boldness, or extreme statements if they indicate integration rather than breakdown.

Answer each question explicitly with reasoning. Provide a numerical score out of 100 for each question.`;

    return prompt;
  }

  // Create psychopathological prompt as specified
  createPsychopathologicalPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `Answer these questions in connection with this text.\n\n`;
    
    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `Text to analyze:\n${textContent}\n\n`;
    
    prompt += `Questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
    
    prompt += `Instructions:
A score of N/100 means (100–N)/100 outperform the subject with respect to the pathological indicator defined by the question.

Higher scores indicate healthier/more integrated functioning.

Evaluate signs of pathology against baseline of general population mental health.

Focus on structural organization of psyche, not surface presentation.

Distinguish between neurotic (ego-dystonic) and psychotic (ego-syntonic) presentations.

Do not conflate unconventional thinking with pathology.

Answer each question explicitly with reasoning. Provide a numerical score out of 100 for each question.`;

    return prompt;
  }

  // Comprehensive Cognitive Questions (same as normal - comprehensive = 4-phase protocol)
  getComprehensiveCognitiveQuestions(): string[] {
    return this.getCognitiveQuestions();
  }

  // Psychological Questions  
  getPsychologicalQuestions(): string[] {
    return [
      "Does the text reveal a stable, coherent self-concept, or is the self fragmented/contradictory?",
      "Is there evidence of ego strength (resilience, capacity to tolerate conflict/ambiguity), or does the psyche rely on brittle defenses?",
      "Are defenses primarily mature (sublimation, humor, anticipation), neurotic (intellectualization, repression), or primitive (splitting, denial, projection)?",
      "Does the writing show integration of affect and thought, or are emotions split off / overly intellectualized?",
      "Is the author's stance defensive/avoidant or direct/engaged?",
      "Does the psyche appear narcissistically organized (grandiosity, fragile self-esteem, hunger for validation), or not?",
      "Are desires/drives expressed openly, displaced, or repressed?",
      "Does the voice suggest internal conflict (superego vs. id, competing identifications), or monolithic certainty?",
      "Is there evidence of object constancy (capacity to sustain nuanced view of others) or splitting (others seen as all-good/all-bad)?",
      "Is aggression integrated (channeled productively) or dissociated/projected?",
      "Is the author capable of irony/self-reflection, or trapped in compulsive earnestness / defensiveness?",
      "Does the text suggest psychological growth potential (openness, curiosity, capacity to metabolize experience) or rigidity?",
      "Is the discourse paranoid / persecutory (others as threats, conspiracies) or reality-based?",
      "Does the tone reflect authentic engagement with reality, or phony simulation of depth?",
      "Is the psyche resilient under stress, or fragile / evasive?",
      "Is there evidence of compulsion or repetition (obsessional returns to the same themes), or flexible progression?",
      "Does the author show capacity for intimacy / genuine connection, or only instrumental/defended relations?",
      "Is shame/guilt worked through constructively or disavowed/projected?"
    ];
  }

  // Comprehensive Psychological Questions (same as normal - comprehensive = 4-phase protocol)
  getComprehensivePsychologicalQuestions(): string[] {
    return this.getPsychologicalQuestions();
  }

  // Psychopathological Questions
  getPsychopathologicalQuestions(): string[] {
    return [
      "Does the text reveal distorted reality testing (delusion, paranoia, magical thinking), or intact contact with reality?",
      "Is there evidence of persecutory ideation (seeing threats/conspiracies) or is perception proportionate?",
      "Does the subject show rigid obsessional patterns (compulsion, repetitive fixation) vs. flexible thought?",
      "Are there signs of narcissistic pathology (grandiosity, exploitation, lack of empathy), or balanced self-other relation?",
      "Is aggression expressed as sadism, cruelty, destructive glee, or is it integrated/controlled?",
      "Is affect regulation stable or does it suggest lability, rage, despair, manic flight?",
      "Does the person exhibit emptiness, hollowness, anhedonia, or a capacity for meaning/connection?",
      "Is there evidence of identity diffusion (incoherence, role-shifting, lack of stable self)?",
      "Are interpersonal patterns exploitative/manipulative or reciprocal/genuine?",
      "Does the psyche lean toward psychotic organization (loss of boundaries, hallucination-like claims), borderline organization (splitting, fear of abandonment), or neurotic organization (anxiety, repression)?",
      "Are defenses predominantly primitive (denial, projection, splitting) or higher-level?",
      "Is there evidence of pathological lying, phoniness, simulation, or authentic communication?",
      "Does the discourse exhibit compulsive hostility toward norms/authorities (paranoid defiance) or measured critique?",
      "Is sexuality integrated or perverse/displaced (voyeurism, exhibitionism, compulsive control)?",
      "Is the overall presentation coherent and reality-based or chaotic, persecutory, hollow, performative?"
    ];
  }

  // Comprehensive Psychopathological Questions (same as normal - comprehensive = 4-phase protocol)  
  getComprehensivePsychopathologicalQuestions(): string[] {
    return this.getPsychopathologicalQuestions();
  }
}
