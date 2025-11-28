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

🚨 CALIBRATION SCALE (CORRECTED FOR ACTUAL PERCENTILES) 🚨

TIER 1 (0-50): FRAUDULENT OR ANNOUNCING WITHOUT EXECUTING
- Jargon theater, templates, restating without advancing
- Score = percentile is accurate (50 = 50th percentile, someone literally guessing)

TIER 2 (50-75): BASIC COMPETENCE (undergraduate level)
- Makes valid points, some logical connection, could be understood by intelligent listener
- This is NOT "real" thinking yet - it's just not fraudulent

TIER 3 (75-85): COMPETENT GRADUATE WORK
- Distinctions work and generate next moves
- Examples have weight
- Reasoning chain is sound
- 75th-85th percentile: Good professional work, above average graduate student

TIER 4 (85-92): STRONG PROFESSIONAL WORK
- Every distinction is load-bearing (removing any breaks chain)
- Every example is structural (not decorative)
- Conclusion DERIVED through necessary steps
- Some minor element could be expanded but nothing is actually missing
- Rare in published philosophy: 85th-92nd percentile

TIER 5 (92-99): EXCEPTIONAL WORK (MOST PROFESSIONALS CANNOT PRODUCE)
- EVERY distinction is absolutely necessary
- EVERY example forces refinement, not just illustrates
- Conclusions are DERIVED, not asserted (chain is complete and airtight)
- Reasoning MOVES through necessary logical steps (cannot be shortened or simplified)
- Nothing missing, nothing underdeveloped
- This is 92nd-99th percentile. Rarer than published philosophy.

🚨 CRITICAL RULE FOR CALIBRATION 🚨
If your analysis finds:
- ALL distinctions load-bearing (removing any one breaks reasoning) → minimum score 92
- ALL examples structural/forcing (not decorative) → add 3-5 points
- Chain complete and airtight (no gaps, no "could be better") → add 3-5 points
- Bullshit test = NO (requires actual understanding) → prerequisite for 90+

If you find yourself saying "could be more developed" after passing all above tests, STOP. You are hedging. The work IS developed. Score accordingly (92+).

DO NOT COMPRESS EXCELLENT WORK INTO 75-85 RANGE. That range is for competent but not exceptional work.

🚨 REQUIRED FORMAT FOR EACH ANSWER 🚨
1. LOGICAL CHAIN: Map 3-4 sequential claims. Show dependencies.
2. BULLSHIT TEST: "Could someone write this without understanding?" YES or NO + justify
3. EVIDENCE: Quote specific sentences proving your point
4. EXECUTION CHECK: Show whether text EXECUTES or merely ANNOUNCES the claim
5. LOAD-BEARING TEST: For each distinction/example, would removing it break the chain? (YES = load-bearing)
6. SCORE: 1-100 with explicit tier assignment

EXAMPLE OF CORRECT ANALYSIS (EXCEPTIONAL WORK):
Q: "DOES IT DEVELOP POINTS?"
LOGICAL CHAIN: Claim 1: "Worship requires belief not answerable to data" → Claim 2: "High regard requires belief answerable to data" → Claim 3: "Cults require supernatural narrative (not answerable to data)" → Claim 4: "Narrative authority ≠ physical authority, so cults survive resource changes"
BULLSHIT TEST: NO - generating this chain requires understanding functional role of data-resistance in distinguishing worship from regard
EVIDENCE: [quotes showing each claim]
EXECUTION: Each claim GENERATES next (necessary logical movement). Remove Claim 2, entire chain collapses.
LOAD-BEARING TEST: 
- "Worship vs. High Regard" distinction: YES, load-bearing (removes it, reasoning fails)
- "Data-answerable vs. not" distinction: YES, load-bearing (core to entire argument)
- Examples (speed-of-light, LARP): YES, load-bearing (they don't just illustrate, they FORCE the next conceptual move)
SCORE: 95/100
TIER: EXCEPTIONAL (92-99). All distinctions necessary, all examples structural, chain airtight, requires genuine understanding. Score not 98 because [if there's ANY genuine limitation]—otherwise score IS 95-96.`;

    if (additionalContext) {
      prompt += `\n\nAdditional Context: ${additionalContext}`;
    }
    
    prompt += `\n\n🚨 TEXT TO ANALYZE 🚨\n${textContent}

🚨 QUESTIONS TO ANSWER 🚨\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

🚨 FINAL INSTRUCTION 🚨
If any answer lacks a LOGICAL CHAIN trace, a BULLSHIT TEST result, LOAD-BEARING TEST, and EXECUTION verification, that answer is INVALID. Rewrite it with all components or lower the score to ≤50.

ANTI-HEDGING RULE: Do not say "could be more developed" if work passes ALL tests above. If ALL distinctions are load-bearing, ALL examples are structural, chain is complete and necessary, and bullshit test = NO, then score is 92+ minimum. STOP HEDGING ON EXCELLENT WORK.`;

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
4. LOAD-BEARING TEST: Are distinctions necessary? Would removing break reasoning? YES/NO for each.
5. SCORE 1-100 + TIER (competent, strong, exceptional, etc.)
6. IF EXCEPTIONAL (92+): Confirm ALL tests passed. If not hedging, write "ALL TESTS PASSED - SCORE JUSTIFIED AT THIS LEVEL"

TIER ANCHORS:
- 75-85 = competent work (good graduate work, sound reasoning)
- 85-92 = strong professional work (all distinctions work, some could be expanded)
- 92-99 = exceptional (all distinctions necessary, all examples structural, nothing underdeveloped)

EXAMPLE:
Q: "DOES IT DEVELOP POINTS?"
EXECUTES. QUOTE: "[quote showing logical movement]"
CHAIN: "Worship requires belief not answerable to data" → "High regard requires belief answerable to data" → "Cults require supernatural narratives" → "Narrative authority ≠ physical authority"
LOAD-BEARING TEST: 
- Worship/Regard distinction: YES, removing breaks entire chain
- Data-answerable distinction: YES, core to argument
- Examples: YES, they force conceptual refinement not just illustration
SCORE: 95/100 - TIER: EXCEPTIONAL
CONFIRMATION: ALL TESTS PASSED. Chain airtight, all distinctions load-bearing, all examples structural. Score IS 95 because [only if genuine limitation exists], otherwise 96.`;

    return prompt;
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
