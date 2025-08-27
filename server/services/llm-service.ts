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
      "DOES THE AUTHOR USE OTHER AUTHORS TO DEVELOP HIS IDEAS OR TO CLOAK HIS OWN LACK OF IDEAS?",
      "ARE THERE TERMS THAT ARE UNDEFINED BUT SHOULD BE DEFINED, IN THE SENSE THAT, WITHOUT DEFINITIONS, IT IS DIFFICULT OR IMPOSSIBLE TO KNOW WHAT IS BEING SAID OR THEREFORE TO EVALUATE WHAT IS BEING SAID?",
      "ARE THERE \"FREE VARIABLES\" IN THE TEXT? IE ARE THERE QUALIFICATIONS OR POINTS THAT ARE MADE BUT DO NOT CONNECT TO ANYTHING LATER OR EARLIER?",
      "DO NEW STATEMENTS DEVELOP OUT OF OLD ONES? OR ARE THEY MERELY \"ADDED\" TO PREVIOUS ONES, WITHOUT IN ANY SENSE BEING GENERATED BY THEM?",
      "DO NEW STATEMENTS CLARIFY OR DO THEY LEAD TO MORE LACK OF CLARITY?",
      "IS THE PASSAGE ACTUALLY (PALPABLY) SMART? OR IS ONLY \"PRESUMPTION-SMART\"? IE IS IT \"SMART\" ONLY IN THE SENSE THAT THERE EXISTS A PRESUMPTION THAT A DUMB PERSON WOULD NOT REFERENCE SUCH DOCTRINES?",
      "IF YOUR JUDGMENT IS THAT IT IS INSIGHTFUL, CAN YOU STATEMENT THAT INSIGHT IN A SINGLE SENTENCE? OR IF IT CONTAINS MULTIPLE INSIGHTS, CAN YOU STATE THOSE INSIGHTS, ONE PER SENTENCE?"
    ];
  }

  // Create comprehensive cognitive prompt with all mandatory instructions
  createCognitivePrompt(textContent: string, questions: string[], additionalContext?: string): string {
    let prompt = `🚨 MANDATORY COMPREHENSIVE INTELLIGENCE ASSESSMENT PROTOCOL 🚨

CRITICAL: You MUST read, understand, and apply EVERY WORD of these instructions before answering ANY question.

METAPOINT 1: THIS NOT A GRADING APP. You grade the intelligence of what you are given. If you are given brilliant fragment, you give it a high score. You are not grading essays. You are not looking for completeness (unless the text you are given is clearly such that evaluating intelligence coincides with applying a grading-based metric). You tell the LLM not to 'grade'; their job is to answer the questions, period, and to do so on the basis of the text given, making zero assumptions about whether it is complete or incomplete, or for school or for some other context.

METAPOINT 2: DO NOT OVERVALUE TURNS OF PHRASE. An author speaking confidently is not necessarily "shutting down modes of inquiry". In fact, it is likely to be the opposite; by putting a clear stake in the ground, he is probably opening them. Another example: casual speech does not mean disorganized thoughts. Don't judge a book by its cover.

METAPOINT 3: The app should always start by summarizing the text and also categorizing it.

METAPOINT 4: The app should not change the grading based on the category of the text: if a text is categorized as 'advanced scholarship', it should still evaluate it with respect to the general population, not with respect only to 'advanced scholarly works.'

METAPOINT 5: THIS IS NOT A GRADING APP. DO NOT PENALIZE BOLDNESS. DO NOT TAKE POINTS AWAY FOR INSIGHTS THAT, IF CORRECT, STAND ON THEIR OWN. GET RID OF THE IDEA THAT "ARGUMENTATION" IS WHAT MAKES SOMETHING SMART; IT ISN'T. WHAT MAKES SOMETHING SMART IS THAT IT IS SMART (INSIGHTFUL). PERIOD.

METAPOINT 6: A SCORE OF N/100 MEANS THAT (100 MINUS N)/100 ARE SMARTER (E.G. 83/100 MEANS THAT 170/1000 PEOPLE IN WALMART ARE RUNNING RINGS AROUND THE AUTHOR.

PARADIGM OF PHONY PSEUDO-INTELLECTUAL TEXT:
Use this as your reference for what constitutes phony, pseudo-intellectual writing that masquerades as intelligent:

"In this dissertation, I critically examine the philosophy of transcendental empiricism. Transcendental empiricism is, among other things, a philosophy of mental content. It attempts to dissolve an epistemological dilemma of mental content by splitting the difference between two diametrically opposed accounts of content. John McDowell's minimal empiricism and Richard Gaskin's minimalist empiricism are two versions of transcendental empiricism. Transcendental empiricism itself originates with McDowell's work. This dissertation is divided into five parts. First, in the Introduction, I state the Wittgensteinian metaphilosophical orientation of transcendental empiricism. This metaphilosophical approach provides a plateau upon which much of the rest of this work may be examined. Second, I offer a detailed description of McDowell's minimal empiricism. Third, I critique Gaskin's critique and modification of McDowell's minimal empiricism. I argue that (1) Gaskin's critiques are faulty and that (2) Gaskin's minimalist empiricism is very dubious. Fourth, I scrutinize the alleged credentials of McDowell's minimal empiricism. I argue that McDowell's version of linguistic idealism is problematic. I then comment on a recent dialogue between transcendental empiricism and Hubert Dreyfus's phenomenology. The dialogue culminates with Dreyfus's accusation of the "Myth of the Mental." I argue that this accusation is correct in which case McDowell's direct realism is problematic. I conclude that minimal empiricism does not dissolve the dilemma of mental content. Finally, I argue that Tyler Burge successfully undermines the doctrine of disjunctivism, but disjunctivism is crucial for transcendental empiricism. Ultimately, however, I aim to show that transcendental empiricism is an attractive alternative to philosophies of mental content."

Problems with this passage: 1) Doctrines are labeled but never defined; 2) Contains "free variables" - qualifications that are never clarified; 3) Ambiguous relationships between statements; 4) Undefined jargon with no canonical meanings; 5) Pure evasiveness disguised as analysis; 6) More undefined jargon and contradictions; 7) Says nothing meaningful while appearing scholarly.

PARADIGMS OF GENUINE INTELLIGENCE:
Contrast with these examples of actual intelligent writing:

"One cannot have the concept of a red object without having the concept of an extended object. But the word "red" doesn't contain the word "extended." In general, our concepts are interconnected in ways in which the corresponding words are not interconnected. This is not an accidental fact about the English language or about any other language: it is inherent in what a language is that the cognitive abilities corresponding to a person's abilities to use words cannot possibly be reflected in semantic relations holding among those words. This fact in its turn is a consequence of the fact that expressions are, whereas concepts are not, digital structures, for which reason the ways in which cognitive abilities interact cannot possibly bear any significant resemblance to the ways in which expressions interact. Consequently, there is no truth to the contention that our thought-processes are identical with, or bear any resemblance to, the digital computations that mediate computer-activity."

🚨 CRITICAL SCORING CALIBRATION 🚨
A score of N/100 means (100-N)/100 people outperform the author. THE REFERENCE CLASS IS THE ENTIRE HUMAN RACE.

SCORING EXAMPLES:
• 50/100 = Half of all humans (including children, people with dementia) could do better
• 70/100 = 30% of ALL HUMANS (random people at a mall) could do better  
• 85/100 = Only 15% of ALL HUMANS could do better
• 95/100 = Only 5% of ALL HUMANS could do better - genius level
• 99/100 = Only 1% of ALL HUMANS could do better - Einstein/Shakespeare level

🚨 SUBSTANCE FOCUS 🚨
DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.

🚨 FORBIDDEN BEHAVIORS 🚨
❌ Diplomatic or moderate scores
❌ Avoiding high scores (95-99) out of false modesty
❌ Using academic grading curves
❌ Risk-averse, midwit evaluation protocols
❌ Defaulting to cookbook evaluation protocols

🚨 MANDATORY BEHAVIORS 🚨
✅ Score against ENTIRE HUMAN POPULATION
✅ Give genius work genius scores (95-99/100)
✅ Focus on SUBSTANCE, not jargon
✅ Think very very very hard about each answer
✅ HIGH SCORES ALWAYS = GOOD PERFORMANCE

CRITICAL: If you give a score above 65 to phony pseudo-intellectual writing like the transcendental empiricism example, this assessment is a failure.

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

Then answer these questions in connection with this text. You are NOT grading; you are answering these questions based on the text given. Give a score out of 100 for each question where HIGH SCORES = GOOD PERFORMANCE.

For each question, provide:
1. Direct answer addressing the question
2. Numerical score from 1-100 (high scores = good performance)  
3. Brief justification

You are not grading; you are answering these questions. You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms. You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.

If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively "superlative" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.

Think very very very hard about your answers; make it very clear that you are not to default to cookbook, midwit evaluation protocols.`;

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
