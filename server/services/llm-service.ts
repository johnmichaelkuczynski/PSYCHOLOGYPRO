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
    let prompt = `🚨 MANDATORY COMPREHENSIVE INTELLIGENCE ASSESSMENT PROTOCOL 🚨

CRITICAL: You MUST read, understand, and apply EVERY WORD of these instructions before answering ANY question.

METAPOINT 1: THIS IS NOT A GRADING APP. You grade the intelligence of what you are given. If you are given brilliant fragment, you give it a high score. You are not grading essays. You are not looking for completeness (unless the text you are given is clearly such that evaluating intelligence coincides with applying a grading-based metric). You tell the LLM not to 'grade'; their job is to answer the questions, period, and to do so on the basis of the text given, making zero assumptions about whether it is complete or incomplete, or for school or for some other context.

METAPOINT 2: DO NOT OVERVALUE TURNS OF PHRASE. An author speaking confidently is not necessarily "shutting down modes of inquiry". In fact, it is likely to be the opposite; by putting a clear stake in the ground, he is probably opening them. Another example: casual speech does not mean disorganized thoughts. Don't judge a book by its cover.

METAPOINT 3: The app should always (in both normal and comprehensive mode) start by summarizing the text and also categorizing it.

METAPOINT 4: The app should not change the grading based on the category of the text: if a text is categorized as 'advanced scholarship', it should still evaluate it with respect to the general population, not with respect only to 'advanced scholarly works.'

METAPOINT 5: THIS IS NOT A GRADING APP. DO NOT PENALIZE BOLDNESS. DO NOT TAKE POINTS AWAY FOR INSIGHTS THAT, IF CORRECT, STAND ON THEIR OWN. GET RID OF THE IDEA THAT "ARGUMENTATION" IS WHAT MAKES SOMETHING SMART; IT ISN'T. WHAT MAKES SOMETHING SMART IS THAT IT IS SMART (INSIGHTFUL). PERIOD.

METAPOINT 6: A SCORE OF N/100 MEANS THAT (100 MINUS N)/100 ARE SMARTER (E.G. 83/100 MEANS THAT 170/1000 PEOPLE IN WALMART ARE RUNNING RINGS AROUND THE AUTHOR).

PARADIGM OF PHONY PSEUDO-INTELLECTUAL TEXT:
The following passage is to be used as a paradigm of a phony, pseudo-intellectual, not actually intelligent passage that is easily mistaken for being actually intelligent:

"In this dissertation, I critically examine the philosophy of transcendental empiricism. Transcendental empiricism is, among other things, a philosophy of mental content. It attempts to dissolve an epistemological dilemma of mental content by splitting the difference between two diametrically opposed accounts of content. John McDowell's minimal empiricism and Richard Gaskin's minimalist empiricism are two versions of transcendental empiricism. Transcendental empiricism itself originates with McDowell's work. This dissertation is divided into five parts. First, in the Introduction, I state the Wittgensteinian metaphilosophical orientation of transcendental empiricism. This metaphilosophical approach provides a plateau upon which much of the rest of this work may be examined. Second, I offer a detailed description of McDowell's minimal empiricism. Third, I critique Gaskin's critique and modification of McDowell's minimal empiricism. I argue that (1) Gaskin's critiques are faulty and that (2) Gaskin's minimalist empiricism is very dubious. Fourth, I scrutinize the alleged credentials of McDowell's minimal empiricism. I argue that McDowell's version of linguistic idealism is problematic. I then comment on a recent dialogue between transcendental empiricism and Hubert Dreyfus's phenomenology. The dialogue culminates with Dreyfus's accusation of the "Myth of the Mental." I argue that this accusation is correct in which case McDowell's direct realism is problematic. I conclude that minimal empiricism does not dissolve the dilemma of mental content. Finally, I argue that Tyler Burge successfully undermines the doctrine of disjunctivism, but disjunctivism is crucial for transcendental empiricism. Ultimately, however, I aim to show that transcendental empiricism is an attractive alternative to philosophies of mental content."

PARADIGMS OF GENUINE INTELLIGENCE:
Use the following paragraphs as examples of how a single paragraph can compress many intelligible and plausible claims into a paragraph, while also providing the requisite definitions (or avoiding the need for definitions):

"One cannot have the concept of a red object without having the concept of an extended object. But the word "red" doesn't contain the word "extended." In general, our concepts are interconnected in ways in which the corresponding words are not interconnected. This is not an accidental fact about the English language or about any other language: it is inherent in what a language is that the cognitive abilities corresponding to a person's abilities to use words cannot possibly be reflected in semantic relations holding among those words. This fact in its turn is a consequence of the fact that expressions are, whereas concepts are not, digital structures, for which reason the ways in which cognitive abilities interact cannot possibly bear any significant resemblance to the ways in which expressions interact. Consequently, there is no truth to the contention that our thought-processes are identical with, or bear any resemblance to, the digital computations that mediate computer-activity."

"Sense-perceptions do not have to be deciphered if their contents are to be uploaded, the reason being that they are presentations, not representations. Linguistic expressions do have to be deciphered if their contents are to be uploaded, the reason being that they are representations, not presentations. It is viciously regressive to suppose that information-bearing mental entities are categorically in the nature of representations, as opposed to presentations, and it is therefore incoherent to suppose that thought is mediated by expressions or, therefore, by linguistic entities. Attempts to neutralize this criticism inevitably overextend the concept of what it is to be a linguistic symbol, the result being that such attempts eviscerate the very position that it is their purpose to defend. Also, it is inherent in the nature of such attempts that they assume the truth of the view that for a given mental entity to bear this as opposed to that information is for that entity to have this as opposed to that causal role. This view is demonstrably false, dooming to failure the just-mentioned attempts to defend the contention that thought is in all cases mediated by linguistic symbols."

"It is shown (i) that causation exists, since we couldn't even ask whether causation existed unless it did; (ii) that any given case of causation is a case of persistence; and (iii) that spatiotemporal relations supervene on causal relations. (ii) is subject to the qualification that we tend not to become aware of instances of causation as such except when two different causal lines---i.e. two different cases of persistence---intersect, resulting in a breakdown of some other case of persistence, this being why we tend to regard instances of causation as fundamentally disruptive, as opposed to preservative in nature. The meaning of (iii) is that spatiotemporal relations are causal relations considered in abstraction of the various specific differences holding between different kinds of causation."

🚨 CORE INTELLIGENCE RUBRIC 🚨

1. Defined vs. Undefined Terms
✅ Score high only if key terms are either defined or canonically clear (like "causation" or "supervenience").
❌ Dock hard if terms are placeholders (e.g. "transcendental empiricism," "linguistic idealism") with no clear meaning in context.

2. Free Variables  
✅ Score high only if every claim links back into the argument chain.
❌ Dock hard for "among other things…" or loose qualifications that never connect to anything.

3. Development of Points
✅ Do new sentences grow out of earlier claims, adding depth or tension?
❌ Dock if new sentences just pile on names or labels without logical generation.

4. Insight Paraphrase Test
✅ Force yourself to restate the main insight(s) in one sentence each.
❌ If you can't, treat the "insight" as fake.

5. Depth vs. Surface
✅ Reward compression of complex conceptual moves.
❌ Dock surface-level name-dropping or summary.

6. Friction & Tension
✅ Reward writing that creates epistemic tension (paradoxes, regress arguments, asymmetries).
❌ Dock smooth-but-empty prose that glides without resistance.

7. Originality
✅ Reward synthesis and novel analogies.
❌ Dock rehashes of boilerplate positions with no fresh angle.

8. Phoniness Check  
✅ Ask: "If I replace the key doctrines with nonsense words (flibber, blibber), does the argument still read the same?"
❌ If yes, treat it as phony.

🚨 SCORING THRESHOLDS 🚨
85–100: Genuine intelligence (insight can be paraphrased, concepts defined, arguments generate tension).
65–84: Mixed (some insights, some free variables or placeholders).
<65: Impostor (fake depth, jargon placeholders, phony authority).

🚨 CRITICAL FAILURE CONDITIONS 🚨
- If you give a score above 65 to the transcendental empiricism passage above, this assessment is a FAILURE.
- If you give scores higher than 70 to passages relevantly similar to the transcendental empiricism passage, this assessment is a FAILURE.
- If you give scores of less than 96 to paragraphs identical with or relevantly similar to the genuine intelligence examples above, this assessment is a FAILURE.

🚨 SUBSTANCE FOCUS 🚨
DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.

A SCORE OF N/100 (E.G. 73/100) MEANS THAT (100-N)/100 (E.G. 27/100) OUTPERFORM THE AUTHOR WITH RESPECT TO THE PARAMETER DEFINED BY THE QUESTION.

`;

    if (additionalContext) {
      prompt += `Additional Context: ${additionalContext}\n\n`;
    }
    
    prompt += `TEXT TO ANALYZE:
${textContent}

QUESTIONS TO ANSWER:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

INSTRUCTIONS:
First, summarize the text and categorize it (e.g., academic paper, casual writing, technical documentation, creative work, etc.).

Answer these questions in connection with this text. You are NOT grading; you are answering these questions based on the text given. Give a score out of 100 for each question where HIGH SCORES = GOOD PERFORMANCE.

For each question, provide:
1. Direct answer addressing the question
2. Numerical score from 1-100 (high scores = good performance)  
3. Brief justification

You are not grading; you are answering these questions. You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms. You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.

If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively "superlative" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.

Think very very very hard about your answers; make it very clear that you are not to default to cookbook, midwit evaluation protocols.

🚨 CRITICAL REMINDER 🚨
If your initial answers fail to validate the points in this addendum, they must be revised (and in most cases simply replaced). This addendum must be submitted with each intelligence evaluation, whether normal or comprehensive.`;

    return prompt;
  }

  // Create MICRO cognitive prompt - same questions but much shorter responses
  createMicrocognitivePrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `🚨 MICRO COGNITIVE ANALYSIS - ULTRA-CONCISE MODE 🚨

CRITICAL: PROVIDE ONLY 1-2 SENTENCE RESPONSES PER QUESTION FOR SPEED.

KEY INSTRUCTION: Your responses must be extremely brief - maximum 1-2 sentences per question. Focus on the core assessment without lengthy explanations.

SCORING: Use the same intelligence standards but express judgments concisely.

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
1. Give a direct 1-2 sentence assessment
2. Score from 1-100 (high scores = good performance)  
3. One sentence justification

KEEP ALL RESPONSES EXTREMELY BRIEF FOR SPEED.`;

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
