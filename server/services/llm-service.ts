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
      model: "claude-opus-4-1",
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
      apiKey: process.env.XAI_API_KEY || process.env.API_KEY || "",
      baseUrl: "https://api.x.ai/v1",
      model: "grok-2",
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

        case "zhi5": // Grok (xAI)
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                // Debug logging for Perplexity responses (development only)
                if (provider === 'zhi4' && process.env.NODE_ENV === 'development') {
                  console.log('🔍 Perplexity raw response chunk:', JSON.stringify(parsed, null, 2));
                }
                
                const content = this.extractContentFromResponse(parsed, provider);
                
                // Debug logging for extracted content (development only)
                if (provider === 'zhi4' && content && process.env.NODE_ENV === 'development') {
                  console.log('✅ Perplexity extracted content:', JSON.stringify(content));
                }
                
                if (content) {
                  onChunk?.(content);
                  yield content;
                }
              } catch (error) {
                // Enhanced error logging for Perplexity
                if (provider === 'zhi4') {
                  console.error('❌ Perplexity JSON parse error:', error, 'Raw data:', data);
                }
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
      "DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?",
      "ARE THERE TERMS THAT ARE UNDEFINED BUT SHOULD BE DEFINED, IN THE SENSE THAT, WITHOUT DEFINITIONS, IT IS DIFFICULT OR IMPOSSIBLE TO KNOW WHAT IS BEING SAID OR THEREFORE TO EVALUATE WHAT IS BEING SAID?",
      "ARE THERE \"FREE VARIABLES\" IN THE TEXT? IE ARE THERE QUALIFICATIONS OR POINTS THAT ARE MADE BUT DO NOT CONNECT TO ANYTHING LATER OR EARLIER?",
      "DO NEW STATEMENTS DEVELOP OUT OF OLD ONES? OR ARE THEY MERELY \"ADDED\" TO PREVIOUS ONES, WITHOUT IN ANY SENSE BEING GENERATED BY THEM?",
      "DO NEW STATEMENTS CLARIFY OR DO THEY LEAD TO MORE LACK OF CLARITY?",
      "IS THE PASSAGE ACTUALLY (PALPABLY) SMART? OR IS ONLY \"PRESUMPTION-SMART\"? IE IS IT \"SMART\" ONLY IN THE SENSE THAT THERE EXISTS A PRESUMPTION THAT A DUMB PERSON WOULD NOT REFERENCE SUCH DOCTRINES?",
      "IF YOUR JUDGMENT IS THAT IT IS INSIGHTFUL, CAN YOU STATEMENT THAT INSIGHT IN A SINGLE SENTENCE? OR IF IT CONTAINS MULTIPLE INSIGHTS, CAN YOU STATE THOSE INSIGHTS, ONE PER SENTENCE?"
    ];
  }

  // Create comprehensive cognitive prompt with revised intelligence protocol
  createCognitivePrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `🚨 MANDATORY EXECUTION-BASED INTELLIGENCE ASSESSMENT PROTOCOL 🚨

CRITICAL: You must detect whether the text EXECUTES reasoning or merely ANNOUNCES it.

🚨 THE CORE PRINCIPLE 🚨
Distinguish between:
- ANNOUNCING: "First I will do X. Then I will argue Y. Finally I will conclude Z." (Says what will happen, doesn't do it)
- EXECUTING: Claims flow from prior claims; distinctions generate next moves; examples carry weight; reasoning MOVES

🚨 LOGICAL CHAIN VERIFICATION (REQUIRED FOR ALL SCORES ABOVE 70) 🚨
For EVERY claimed insight or argument, you MUST:
1. IDENTIFY the logical chain: "Claim A depends on Claim B which depends on Claim C"
2. VERIFY derivability: Does Claim A actually follow from B? Or is it just asserted?
3. TEST the chain: Remove one link - does the entire argument collapse? (YES = real thinking)
4. EXAMPLES TEST: Do examples illustrate the point or just exist? Can the argument work without them?

Format: "Claim A: '[quote]' → This requires Claim B: '[quote]' → Which requires Claim C: '[quote]' → Without C, A fails."

🚨 THE BULLSHIT TEST (MANDATORY FOR ALL SCORES) 🚨
Ask yourself: "Could someone write this without actually understanding the subject?"
- YES = Score drops to maximum 50 (announcing without executing)
- NO = Continue analysis (author had to understand to write it)

EXAMPLE OF BULLSHIT:
"First I examine the philosophy. Then I critique the account. Finally I argue the position is attractive." 
Could someone write this without understanding philosophy? YES - it's a template. SCORE ≤ 50.

EXAMPLE OF GENUINE:
"Worship requires belief in superhuman powers; high regard does not. Distinguishing these explains why cults function through supernatural claims, not merely charismatic authority."
Could someone write this without understanding what distinguishes worship from regard, what makes supernatural claims functionally distinct? NO - you must understand to generate this. SCORE potential: 75+.

🚨 DISTINCTION WORK TEST 🚨
When text makes a distinction, verify it WORKS:
- Quote the distinction: "X vs. Y"
- Show how this distinction GENERATES the next reasoning move
- If the distinction is merely decorative (doesn't change subsequent reasoning), dock 20+ points
- If the distinction is load-bearing (removes it and reasoning collapses), reward 15+ points

Example that works: "A cult requires narrative authority (stories), not just physical authority (rules). This explains why cults collapse when narratives are questioned but remain stable when resources change." Remove "narrative vs. physical" and reasoning fails.

🚨 PSEUDO-INTELLECTUAL RED FLAGS (AUTOMATIC SCORE CEILING: 50) 🚨
- Empty sequencing: "First... Then... Finally..." without logical generation
- Announced structure, not executed: "I will argue X, Y, Z" without showing WHY these follow
- Definitions without use: Terms defined but not deployed in reasoning
- Name-dropping: "Author X says... Author Y says..." without showing what they contribute
- Restating without advancing: Same point rephrased multiple times

🚨 GENUINE EXECUTION MARKERS (SCORE 80+) 🚨
- Claims can be restated as: "If [prior claim], then [new claim]" not "and also [new claim]"
- Distinctions generate moves (remove distinction, reasoning breaks)
- Examples illustrate causal necessity, not just possibilities
- Metaphors/analogies carry structural weight (not just ornamental)
- Each statement earns its position through prior statements

🚨 REQUIRED FORMAT FOR EACH ANSWER 🚨
1. LOGICAL CHAIN: Map 3-4 sequential claims. Show dependencies.
2. BULLSHIT TEST: "Could someone write this without understanding?" YES or NO + justify
3. EVIDENCE: Quote specific sentences proving your point
4. EXECUTION CHECK: Show whether text EXECUTES or merely ANNOUNCES the claim
5. SCORE: 1-100 with explicit justification of why not higher

EXAMPLE OF CORRECT ANALYSIS:
Q: "DOES IT DEVELOP POINTS?"
LOGICAL CHAIN: Claim 1: "Worship requires superhuman belief" → Claim 2: "High regard does not" → Claim 3: "Therefore cults depend on supernatural narrative" → Claim 4: "Physical resource changes don't threaten narrative authority"
BULLSHIT TEST: NO - to generate this chain you must understand the functional role of belief in cult structure.
EVIDENCE: "[quote showing Claim 1]" "[quote showing Claim 2]" "[quote showing Claim 3]"
EXECUTION: Each claim GENERATES the next (necessary logical movement). Removing Claim 2 breaks Claim 3.
SCORE: 88/100
REASON: Genuine logical execution. Score not higher because [specify limitation, if any].`;

    if (additionalContext) {
      prompt += `\n\nAdditional Context: ${additionalContext}`;
    }
    
    prompt += `\n\n🚨 TEXT TO ANALYZE 🚨\n${textContent}

🚨 QUESTIONS TO ANSWER 🚨\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

🚨 FINAL INSTRUCTION 🚨
If any answer lacks a LOGICAL CHAIN trace, a BULLSHIT TEST result, and EXECUTION verification, that answer is INVALID.
Rewrite it with all three components or lower the score to ≤50.`;

    return prompt;
  }

  // Create MICRO cognitive prompt - same questions but much shorter responses
  createMicrocognitivePrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `🚨 MICRO COGNITIVE ANALYSIS - EXECUTION VERIFICATION MODE 🚨

CRITICAL: For each question, answer: EXECUTES or ANNOUNCES? Then score.

KEY TEST: "Could someone write this without understanding?" 
YES = max score 50. NO = continue analysis.

`;

    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `TEXT TO ANALYZE:
${textContent}

QUESTIONS TO ANSWER:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

INSTRUCTIONS:
Summary + categorization (1 sentence).

For each question provide:
1. EXECUTES or ANNOUNCES? (1 sentence)
2. KEY QUOTE: (one quote proving claim)
3. LOGICAL CHAIN: (Show 2-3 claims in sequence: "Claim A → requires Claim B → which requires Claim C")
4. SCORE 1-100
5. WHY NOT HIGHER? (one sentence - what would need to change for +10 points?)

REWARD GENUINE EXECUTION: Claims follow from prior claims, distinctions DO WORK, examples carry weight.
DOCK ANNOUNCEMENTS: "First... then... finally..." without showing WHY these follow.

EXAMPLE:
Q: "DOES IT DEVELOP POINTS?"
EXECUTES. QUOTE: "[quote showing logical movement]"
CHAIN: "Worship requires superhuman belief" → "High regard does not" → "Therefore cults need supernatural narratives"
SCORE: 85/100
WHY NOT HIGHER: Would need to trace functional consequences (how this explains cult psychology vs. just stating the distinction).`;

    return prompt;
  }

  // Create MICRO psychological prompt - same questions but much shorter responses  
  createMicropsychologicalPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `🚨 MICRO PSYCHOLOGICAL ANALYSIS - ULTRA-CONCISE MODE 🚨

CRITICAL: PROVIDE ONLY 1-2 SENTENCE RESPONSES PER QUESTION FOR SPEED.

KEY INSTRUCTION: Your responses must be extremely brief - maximum 1-2 sentences per question. Focus on the core psychological assessment without lengthy explanations.

`;

    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `TEXT TO ANALYZE:
${textContent}

QUESTIONS TO ANSWER:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

INSTRUCTIONS:
First, provide a 1-sentence summary and categorization.

For each question:
1. Give a direct 1-2 sentence psychological assessment
2. Score from 1-100 (high scores = good performance)  
3. One sentence justification

KEEP ALL RESPONSES EXTREMELY BRIEF FOR SPEED.`;

    return prompt;
  }

  // Create MICRO psychopathological prompt - same questions but much shorter responses
  createMicropsychopathologicalPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `🚨 MICRO PSYCHOPATHOLOGICAL ANALYSIS - ULTRA-CONCISE MODE 🚨

CRITICAL: PROVIDE ONLY 1-2 SENTENCE RESPONSES PER QUESTION FOR SPEED.

KEY INSTRUCTION: Your responses must be extremely brief - maximum 1-2 sentences per question. Focus on the core pathological assessment without lengthy explanations.

`;

    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `TEXT TO ANALYZE:
${textContent}

QUESTIONS TO ANSWER:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

INSTRUCTIONS:
First, provide a 1-sentence summary and categorization.

For each question:
1. Give a direct 1-2 sentence psychopathological assessment
2. Score from 1-100 (high scores = good performance)  
3. One sentence justification

KEEP ALL RESPONSES EXTREMELY BRIEF FOR SPEED.`;

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

  // Micro Cognitive Questions (same questions, much shorter responses)
  getMicrocognitiveQuestions(): string[] {
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
      "DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?",
      "ARE THERE TERMS THAT ARE UNDEFINED BUT SHOULD BE DEFINED, IN THE SENSE THAT, WITHOUT DEFINITIONS, IT IS DIFFICULT OR IMPOSSIBLE TO KNOW WHAT IS BEING SAID OR THEREFORE TO EVALUATE WHAT IS BEING SAID?",
      "ARE THERE \"FREE VARIABLES\" IN THE TEXT? IE ARE THERE QUALIFICATIONS OR POINTS THAT ARE MADE BUT DO NOT CONNECT TO ANYTHING LATER OR EARLIER?",
      "DO NEW STATEMENTS DEVELOP OUT OF OLD ONES? OR ARE THEY MERELY \"ADDED\" TO PREVIOUS ONES, WITHOUT IN ANY SENSE BEING GENERATED BY THEM?",
      "DO NEW STATEMENTS CLARIFY OR DO THEY LEAD TO MORE LACK OF CLARITY?",
      "IS THE PASSAGE ACTUALLY (PALPABLY) SMART? OR IS ONLY \"PRESUMPTION-SMART\"? IE IS IT \"SMART\" ONLY IN THE SENSE THAT THERE EXISTS A PRESUMPTION THAT A DUMB PERSON WOULD NOT REFERENCE SUCH DOCTRINES?",
      "IF YOUR JUDGMENT IS THAT IT IS INSIGHTFUL, CAN YOU STATEMENT THAT INSIGHT IN A SINGLE SENTENCE? OR IF IT CONTAINS MULTIPLE INSIGHTS, CAN YOU STATE THOSE INSIGHTS, ONE PER SENTENCE?"
    ];
  }

  // Micro Psychological Questions (same questions, much shorter responses)
  getMicropsychologicalQuestions(): string[] {
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

  // Micro Psychopathological Questions (same questions, much shorter responses)
  getMicropsychopathologicalQuestions(): string[] {
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

  // MBTI Questions (Normal)
  getMBTIQuestions(): string[] {
    return [
      "I. INTROVERSION VS EXTRAVERSION: Does the text emphasize inner thoughts and reflection, or external events and social interaction?",
      "I. INTROVERSION VS EXTRAVERSION: Is the author more focused on subjective experience (\"I think/feel\") or shared/group dynamics (\"we,\" \"people\")?",
      "I. INTROVERSION VS EXTRAVERSION: Does the work explore solitude, retreat, and internal processing—or engagement, action, or outward expression?",
      "I. INTROVERSION VS EXTRAVERSION: Are ideas developed internally and abstractly—or through dialogue, examples, and external interactions?",
      "I. INTROVERSION VS EXTRAVERSION: Is emotional expression restrained and implied—or direct, open, and outwardly engaged?",
      
      "II. SENSING VS INTUITION: Does the writing focus on concrete details, sensory description, and observable facts (S) or possibilities, patterns, and abstractions (N)?",
      "II. SENSING VS INTUITION: Are examples literal and rooted in physical experience—or metaphoric, symbolic, or hypothetical?",
      "II. SENSING VS INTUITION: Does the author favor step-by-step description—or leaps to conceptual insight and synthesis?",
      "II. SENSING VS INTUITION: Are time, sequence, and practical procedures emphasized—or timeless principles and overarching meaning?",
      "II. SENSING VS INTUITION: Does the author show trust in past experience and tradition—or interest in innovation, speculation, and potential futures?",
      
      "III. THINKING VS FEELING: Is the reasoning structured around logic, consistency, and objective principles—or values, ethics, and human impact?",
      "III. THINKING VS FEELING: Does the author handle disagreement through argument and critique—or through empathy, harmony, and relational tone?",
      "III. THINKING VS FEELING: Are judgments justified by cause-and-effect reasoning—or by moral relevance and personal meaning?",
      "III. THINKING VS FEELING: Does the text prioritize truth over tone—or tone over blunt accuracy?",
      "III. THINKING VS FEELING: Are emotions analyzed as data—or used as persuasive elements tied to human wellbeing?",
      
      "IV. JUDGING VS PERCEIVING: Is the structure of the writing tight, organized, and conclusive—or open-ended, exploratory, and flexible?",
      "IV. JUDGING VS PERCEIVING: Does the author express certainty and closure—or ambiguity and willingness to leave questions unresolved?",
      "IV. JUDGING VS PERCEIVING: Is time handled with plans, deadlines, and deliberate pacing—or spontaneity and fluid transitions?",
      "IV. JUDGING VS PERCEIVING: Are definitions fixed and categories stable—or shifting, provisional, and context-dependent?",
      "IV. JUDGING VS PERCEIVING: Does the argument move linearly toward conclusions—or circle, revise, and adapt as it unfolds?",
      
      "V. DEEPER INDIRECT MBTI SIGNALS: Does the text show preference for systemic analysis—or narrative, emotional resonance?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Are values universalized and principled—or personal and relational?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Does the author rely on internal intuition (private insight) or external data and observation?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Is conflict treated as a problem to solve logically—or to reconcile interpersonally?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Does the work prioritize control, predictability, and structure—or openness to uncertainty and adaptation?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Is language precise and utilitarian—or expressive, aesthetic, or symbolic?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Does the narrative voice depend on established rules—or break conventions playfully or freely?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Are future possibilities extrapolated logically—or imagined freely and creatively?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Do characters (or the narrator) suppress personal feelings to maintain objectivity—or elevate emotional truth?",
      "V. DEEPER INDIRECT MBTI SIGNALS: Is the tone disciplined and purposeful—or improvisational and fluid?"
    ];
  }

  // Comprehensive MBTI Questions (Extended with deeper analysis)
  getComprehensiveMBTIQuestions(): string[] {
    return [
      ...this.getMBTIQuestions(),
      
      // Additional deep cognitive function analysis
      "COGNITIVE FUNCTIONS - NI/NE: Does the text reveal patterns of introverted intuition (Ni: convergent vision, singular insight) or extraverted intuition (Ne: divergent possibilities, multiple connections)?",
      "COGNITIVE FUNCTIONS - SI/SE: Does sensory engagement show introverted sensing (Si: internal sensory memory, comfort with familiar) or extraverted sensing (Se: external sensory present, engagement with immediate)?",
      "COGNITIVE FUNCTIONS - TI/TE: Does logical structure demonstrate introverted thinking (Ti: internal logical consistency, precision) or extraverted thinking (Te: external efficiency, objective organization)?",
      "COGNITIVE FUNCTIONS - FI/FE: Does value judgment reflect introverted feeling (Fi: internal value alignment, authenticity) or extraverted feeling (Fe: external harmony, social rapport)?",
      
      // Communication style depth
      "COMMUNICATION DEPTH: Does the author's communication prioritize depth over breadth, or breadth over depth?",
      "ABSTRACTION PREFERENCE: How does the author balance abstract concepts versus concrete applications?",
      "INTERPERSONAL STANCE: Does the writing reveal comfort with interpersonal tension or preference for interpersonal harmony?",
      "DECISION-MAKING EVIDENCE: What evidence exists for how the author weighs logical analysis versus human considerations in complex decisions?",
      "INFORMATION PROCESSING: Does the text suggest preference for gathering more information or reaching conclusions?",
      
      // Additional contextual signals
      "STRESS RESPONSES: Are there any indicators of how the author responds under stress or pressure based on their writing?",
      "MOTIVATION PATTERNS: What underlying motivations can be inferred about what drives the author's intellectual or creative work?"
    ];
  }

  // Micro MBTI Questions (Streamlined, same questions but expecting brief responses)
  getMicroMBTIQuestions(): string[] {
    return this.getMBTIQuestions();
  }

  createMBTIPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `MBTI PERSONALITY TYPE ANALYSIS PROTOCOL

You are analyzing a text to determine the author's probable MBTI personality type based on their writing style and content.

MBTI FRAMEWORK:
- I (Introversion) vs E (Extraversion)
- S (Sensing) vs N (Intuition)
- T (Thinking) vs F (Feeling)
- J (Judging) vs P (Perceiving)

Your task is to answer the following questions about the text with specific evidence and examples:

`;

    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }

    prompt += `TEXT TO ANALYZE:\n${textContent}\n\nQUESTIONS:\n`;
    questions.forEach((q, i) => {
      prompt += `\n${i + 1}. ${q}\n`;
    });

    prompt += `\n\nFor each question, provide a detailed answer with specific evidence from the text. Be thorough and cite examples.`;

    return prompt;
  }

  createMBTIFinalPrompt(textContent: string, analysisResults: string[]): string {
    let prompt = `MBTI TYPE DETERMINATION

Based on your analysis of the text across all MBTI dimensions, determine the author's most probable MBTI personality type.

PREVIOUS ANALYSIS RESULTS:
${analysisResults.map((result, i) => `\nBatch ${i + 1}:\n${result}\n`).join('\n')}

TEXT ANALYZED:
${textContent}

FINAL TASK:
1. Synthesize all your previous answers
2. Determine which preference is stronger in each dimension:
   - I or E (Introversion vs Extraversion)
   - S or N (Sensing vs Intuition)
   - T or F (Thinking vs Feeling)
   - J or P (Judging vs Perceiving)

3. State the final MBTI type (e.g., INTJ, ENFP, ISTJ, etc.)

4. Provide a comprehensive explanation of why this type fits the writing, with specific examples from the text

5. Note any ambiguities or competing indicators

FORMAT YOUR RESPONSE AS:
**DETERMINED MBTI TYPE: [TYPE]**

**REASONING:**
[Detailed explanation for each dimension]

**CONFIDENCE LEVEL:**
[High/Medium/Low and why]

**ALTERNATIVE CONSIDERATIONS:**
[Any close alternative types and why they were not chosen]`;

    return prompt;
  }

  createMicroMBTIPrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `MICRO MBTI ANALYSIS - BRIEF RESPONSES REQUIRED

Analyze this text for MBTI personality type indicators. Give VERY BRIEF answers (1-2 sentences maximum per question).

`;

    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }

    prompt += `TEXT TO ANALYZE:\n${textContent}\n\nQUESTIONS (Answer each BRIEFLY):\n`;
    questions.forEach((q, i) => {
      prompt += `\n${i + 1}. ${q}\n`;
    });

    prompt += `\n\nIMPORTANT: Keep all responses to 1-2 sentences maximum. Be concise and direct.`;

    return prompt;
  }

  createMicroMBTIFinalPrompt(textContent: string, analysisResults: string[]): string {
    return `MICRO MBTI TYPE DETERMINATION - BRIEF FORMAT

Based on your analysis, state the most probable MBTI type with brief justification.

PREVIOUS ANALYSIS:
${analysisResults.map((result, i) => `Batch ${i + 1}: ${result}`).join('\n\n')}

Provide:
1. **TYPE:** [4-letter type]
2. **KEY EVIDENCE:** [2-3 sentences of strongest indicators]
3. **CONFIDENCE:** [High/Medium/Low]`;
  }
}
