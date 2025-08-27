import type { Analysis } from "../../shared/schema.js";
import type { IStorage } from "../storage";
import { LLMService } from "./llm-service";

interface StreamCallback {
  (data: any): void;
}

interface ActiveStream {
  callbacks: Set<StreamCallback>;
  isActive: boolean;
}

export class StreamingService {
  private activeStreams = new Map<string, ActiveStream>();

  constructor(
    private llmService: LLMService,
    private storage: IStorage
  ) {}

  async startAnalysis(analysisId: string): Promise<void> {
    // Start the analysis processing in the background
    this.processAnalysis(analysisId).catch(error => {
      console.error(`Analysis ${analysisId} failed:`, error);
      this.broadcastToStream(analysisId, {
        type: "error",
        error: error.message
      });
    });
  }

  async startEnhancedAnalysis(analysisId: string, enhancedType: string): Promise<void> {
    // Start the enhanced analysis processing in the background
    this.processEnhancedAnalysis(analysisId, enhancedType).catch(error => {
      console.error(`Enhanced analysis ${analysisId} failed:`, error);
      this.broadcastToStream(analysisId, {
        type: "error",
        error: error.message
      });
    });
  }

  streamAnalysis(analysisId: string, callback: StreamCallback): void {
    if (!this.activeStreams.has(analysisId)) {
      this.activeStreams.set(analysisId, {
        callbacks: new Set(),
        isActive: true
      });
    }

    const stream = this.activeStreams.get(analysisId)!;
    stream.callbacks.add(callback);
  }

  stopStreaming(analysisId: string): void {
    const stream = this.activeStreams.get(analysisId);
    if (stream) {
      stream.isActive = false;
      stream.callbacks.clear();
      this.activeStreams.delete(analysisId);
    }
  }

  stopAnalysis(analysisId: string): void {
    const stream = this.activeStreams.get(analysisId);
    if (stream) {
      stream.isActive = false;
      this.broadcastToStream(analysisId, {
        type: "stopped",
        message: "Analysis stopped by user"
      });
      stream.callbacks.clear();
      this.activeStreams.delete(analysisId);
    }
  }

  private broadcastToStream(analysisId: string, data: any): void {
    const stream = this.activeStreams.get(analysisId);
    if (stream && stream.isActive) {
      stream.callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error("Stream callback error:", error);
        }
      });
    }
  }

  private async processAnalysis(analysisId: string): Promise<void> {
    const analysis = await this.storage.getAnalysis(analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    await this.storage.updateAnalysisStatus(analysisId, "streaming");

    try {
      switch (analysis.type) {
        case "cognitive":
          await this.processCognitiveAnalysis(analysis);
          break;
        case "comprehensive-cognitive":
          await this.processComprehensiveCognitiveAnalysis(analysis);
          break;
        case "psychological":
          await this.processPsychologicalAnalysis(analysis);
          break;
        case "comprehensive-psychological":
          await this.processComprehensivePsychologicalAnalysis(analysis);
          break;
        case "psychopathological":
          await this.processPsychopathologicalAnalysis(analysis);
          break;
        case "comprehensive-psychopathological":
          await this.processComprehensivePsychopathologicalAnalysis(analysis);
          break;
        // Enhanced protocols
        case "enhanced-cognitive-normal":
          await this.processCognitiveAnalysis(analysis);
          break;
        case "enhanced-cognitive-comprehensive":
          await this.processComprehensiveCognitiveAnalysis(analysis);
          break;
        case "enhanced-psychological-normal":
          await this.processPsychologicalAnalysis(analysis);
          break;
        case "enhanced-psychological-comprehensive":
          await this.processComprehensivePsychologicalAnalysis(analysis);
          break;
        case "enhanced-psychopathological-normal":
          await this.processPsychopathologicalAnalysis(analysis);
          break;
        case "enhanced-psychopathological-comprehensive":
          await this.processComprehensivePsychopathologicalAnalysis(analysis);
          break;
        default:
          throw new Error(`Analysis type ${analysis.type} not implemented`);
      }

      await this.storage.updateAnalysisStatus(analysisId, "completed");
      
      this.broadcastToStream(analysisId, {
        type: "complete"
      });

    } catch (error) {
      await this.storage.updateAnalysisStatus(analysisId, "error");
      throw error;
    }
  }

  private async processCognitiveAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getCognitiveQuestions();
    const batches = this.createBatches(questions, 5);

    for (let i = 0; i < batches.length; i++) {
      // Check if analysis was stopped
      const currentStream = this.activeStreams.get(analysis.id);
      if (!currentStream || !currentStream.isActive) {
        return;
      }

      const batch = batches[i];
      const batchNumber = i + 1;

      // Process each question in the batch
      await this.processBatch(analysis, batch, batchNumber);

      // Check if analysis was stopped before delay
      const delayStream = this.activeStreams.get(analysis.id);
      if (!delayStream || !delayStream.isActive) {
        return;
      }

      // Wait 10 seconds before next batch (except for last batch)
      if (i < batches.length - 1) {
        await this.streamDelay(analysis.id, 10000);
      }
    }
  }

  private async streamSummary(analysis: Analysis): Promise<void> {
    // Check if text is too long and needs chunking
    const maxTokens = 6000; // Conservative limit to leave room for prompts
    const textChunks = this.chunkTextByTokens(analysis.textContent, maxTokens);
    
    if (textChunks.length === 1) {
      // Text is short enough for single summary
      const summaryPrompt = `First, summarize this text and categorize it:\n\n${analysis.textContent}`;
      
      let summary = "";
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: summaryPrompt }],
        (chunk) => {
          summary += chunk;
          this.broadcastToStream(analysis.id, {
            type: "summary",
            content: summary
          });
        }
      )) {
        // Stream is handled by the onChunk callback
      }
    } else {
      // Text needs to be chunked - provide a note and analyze first chunk only for summary
      let summary = `Note: This document is ${analysis.textContent.split(' ').length} words long and has been automatically divided into ${textChunks.length} sections for analysis.\n\n`;
      
      this.broadcastToStream(analysis.id, {
        type: "summary",
        content: summary
      });

      const summaryPrompt = `First, summarize this section (1 of ${textChunks.length}) from a larger document and categorize it:\n\n${textChunks[0]}`;
      
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: summaryPrompt }],
        (chunk) => {
          summary += chunk;
          this.broadcastToStream(analysis.id, {
            type: "summary",
            content: summary
          });
        }
      )) {
        // Stream is handled by the onChunk callback
      }
    }
  }

  private async processBatch(analysis: Analysis, questions: string[], batchNumber: number): Promise<void> {
    // Check if text needs chunking and use first chunk for analysis
    const maxTokens = 6000;
    const textChunks = this.chunkTextByTokens(analysis.textContent, maxTokens);
    const textToAnalyze = textChunks.length > 1 ? textChunks[0] : analysis.textContent;
    
    // Select appropriate prompt method based on analysis type
    let prompt: string;
    if (analysis.type.includes('psychological')) {
      prompt = this.llmService.createPsychologicalPrompt(
        textToAnalyze,
        questions,
        analysis.additionalContext || undefined
      );
    } else if (analysis.type.includes('psychopathological')) {
      prompt = this.llmService.createPsychopathologicalPrompt(
        textToAnalyze,
        questions,
        analysis.additionalContext || undefined
      );
    } else {
      // Cognitive analysis
      prompt = this.llmService.createCognitivePrompt(
        textToAnalyze,
        questions,
        analysis.additionalContext || undefined
      );
    }

    let fullResponse = "";
    
    for await (const chunk of this.llmService.streamResponse(
      analysis.llmProvider as any,
      [{ role: "user", content: prompt }],
      (chunk) => {
        fullResponse += chunk;
        
        // Stream the raw response immediately as it comes in - PURE PASSTHROUGH
        this.broadcastToStream(analysis.id, {
          type: "raw_stream",
          batchNumber,
          rawContent: fullResponse,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit", 
            second: "2-digit",
            hour12: true,
          })
        });
      }
    )) {
      // Stream is handled by the onChunk callback
    }

    // Mark batch as complete - NO PARSING, JUST RAW FINAL RESPONSE
    this.broadcastToStream(analysis.id, {
      type: "batch_complete", 
      batchNumber,
      finalRawResponse: fullResponse,
      isComplete: true,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit", 
        hour12: true,
      })
    });
  }

  private parseQuestionResponses(response: string, questions: string[]): Array<{
    question: string;
    response: string;
    score: number;
    isComplete: boolean;
  }> {
    // This is a simplified parser - in production you'd want more robust parsing
    const results = questions.map(question => ({
      question,
      response: "",
      score: 0,
      isComplete: false
    }));

    // Extract responses and scores from the LLM output
    // This is a basic implementation - you'd want more sophisticated parsing
    const lines = response.split('\n');
    let currentQuestionIndex = -1;
    let currentResponse = "";

    for (const line of lines) {
      // Look for question indicators (1., 2., etc.)
      const questionMatch = line.match(/^(\d+)\./);
      if (questionMatch) {
        // Save previous question response
        if (currentQuestionIndex >= 0 && currentQuestionIndex < results.length) {
          results[currentQuestionIndex].response = currentResponse.trim();
          results[currentQuestionIndex].isComplete = true;
          
          // Extract score from response
          const scoreMatch = currentResponse.match(/(\d+)\/100/);
          if (scoreMatch) {
            results[currentQuestionIndex].score = parseInt(scoreMatch[1]);
          }
        }
        
        currentQuestionIndex = parseInt(questionMatch[1]) - 1;
        currentResponse = line.substring(questionMatch[0].length).trim();
      } else if (currentQuestionIndex >= 0) {
        currentResponse += "\n" + line;
      }
    }

    // Handle the last question
    if (currentQuestionIndex >= 0 && currentQuestionIndex < results.length) {
      results[currentQuestionIndex].response = currentResponse.trim();
      results[currentQuestionIndex].isComplete = true;
      
      const scoreMatch = currentResponse.match(/(\d+)\/100/);
      if (scoreMatch) {
        results[currentQuestionIndex].score = parseInt(scoreMatch[1]);
      }
    }

    return results;
  }

  private async streamDelay(analysisId: string, delayMs: number): Promise<void> {
    const interval = 100; // Update progress every 100ms
    const steps = delayMs / interval;
    
    for (let step = 0; step <= steps; step++) {
      const progress = (step / steps) * 100;
      
      this.broadcastToStream(analysisId, {
        type: "delay",
        progress: Math.round(progress)
      });
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  formatAnalysisForDownload(analysis: Analysis): string {
    let content = `PSYCHOLOGY PRO ANALYSIS REPORT\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Analysis Type: ${analysis.type.toUpperCase()}\n`;
    content += `LLM Provider: ${analysis.llmProvider.toUpperCase()}\n\n`;
    
    content += `ORIGINAL TEXT:\n`;
    content += `${analysis.textContent}\n\n`;
    
    if (analysis.additionalContext) {
      content += `ADDITIONAL CONTEXT:\n`;
      content += `${analysis.additionalContext}\n\n`;
    }
    
    if (analysis.results) {
      content += `ANALYSIS RESULTS:\n`;
      content += JSON.stringify(analysis.results, null, 2);
    }
    
    return content;
  }

  // Process Comprehensive Cognitive Analysis
  private async processComprehensiveCognitiveAnalysis(analysis: Analysis): Promise<void> {
    await this.streamSummary(analysis);
    const questions = this.llmService.getComprehensiveCognitiveQuestions();
    const batches = this.createBatches(questions, 5);
    await this.processBatches(analysis, batches);
  }

  // Process Psychological Analysis  
  private async processPsychologicalAnalysis(analysis: Analysis): Promise<void> {
    await this.streamSummary(analysis);
    const questions = this.llmService.getPsychologicalQuestions();
    const batches = this.createBatches(questions, 5);
    await this.processBatches(analysis, batches);
  }

  // Process Comprehensive Psychological Analysis
  private async processComprehensivePsychologicalAnalysis(analysis: Analysis): Promise<void> {
    await this.streamSummary(analysis);
    const questions = this.llmService.getComprehensivePsychologicalQuestions();
    const batches = this.createBatches(questions, 5);
    await this.processBatches(analysis, batches);
  }

  // Process Psychopathological Analysis
  private async processPsychopathologicalAnalysis(analysis: Analysis): Promise<void> {
    await this.streamSummary(analysis);
    const questions = this.llmService.getPsychopathologicalQuestions();
    const batches = this.createBatches(questions, 5);
    await this.processBatches(analysis, batches);
  }

  // Process Comprehensive Psychopathological Analysis
  private async processComprehensivePsychopathologicalAnalysis(analysis: Analysis): Promise<void> {
    await this.streamSummary(analysis);
    const questions = this.llmService.getComprehensivePsychopathologicalQuestions();
    const batches = this.createBatches(questions, 5);
    await this.processBatches(analysis, batches);
  }

  // Shared batch processing logic
  private async processBatches(analysis: Analysis, batches: string[][]): Promise<void> {
    for (let i = 0; i < batches.length; i++) {
      const currentStream = this.activeStreams.get(analysis.id);
      if (!currentStream || !currentStream.isActive) {
        return;
      }

      const batch = batches[i];
      const batchNumber = i + 1;
      await this.processBatch(analysis, batch, batchNumber);

      const delayStream = this.activeStreams.get(analysis.id);
      if (!delayStream || !delayStream.isActive) {
        return;
      }

      if (i < batches.length - 1) {
        await this.streamDelay(analysis.id, 10000);
      }
    }
  }

  // Enhanced Analysis Methods
  
  private enhancedStreams = new Map<string, ActiveStream>();
  
  async startEnhancedAnalysis(analysisId: string, enhancedType: string): Promise<void> {
    this.processEnhancedAnalysis(analysisId, enhancedType).catch(error => {
      console.error(`Enhanced analysis ${analysisId} failed:`, error);
      this.broadcastToEnhancedStream(analysisId, {
        type: "error",
        error: error.message
      });
    });
  }

  addEnhancedClient(analysisId: string, res: any): () => void {
    if (!this.enhancedStreams.has(analysisId)) {
      this.enhancedStreams.set(analysisId, {
        callbacks: new Set(),
        isActive: true
      });
    }

    const callback = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error("Error writing to enhanced stream:", error);
      }
    };

    const stream = this.enhancedStreams.get(analysisId)!;
    stream.callbacks.add(callback);

    return () => {
      stream.callbacks.delete(callback);
      if (stream.callbacks.size === 0) {
        this.enhancedStreams.delete(analysisId);
      }
    };
  }

  stopEnhancedAnalysis(analysisId: string): void {
    const stream = this.enhancedStreams.get(analysisId);
    if (stream) {
      stream.isActive = false;
      this.broadcastToEnhancedStream(analysisId, {
        type: "stopped",
        message: "Enhanced analysis stopped by user"
      });
      stream.callbacks.clear();
      this.enhancedStreams.delete(analysisId);
    }
  }

  private broadcastToEnhancedStream(analysisId: string, data: any): void {
    const stream = this.enhancedStreams.get(analysisId);
    if (stream && stream.isActive) {
      stream.callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error("Enhanced stream callback error:", error);
        }
      });
    }
  }

  private async processEnhancedAnalysis(analysisId: string, enhancedType: string): Promise<void> {
    const analysis = await this.storage.getAnalysis(analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    const stream = this.enhancedStreams.get(analysisId);
    if (!stream || !stream.isActive) {
      return;
    }

    try {
      const isComprehensive = enhancedType.includes("comprehensive");
      const analysisMode = enhancedType.includes("cognitive") ? "cognitive" : 
                          enhancedType.includes("psychological") ? "psychological" : 
                          "psychopathological";

      const { questions, instructions } = this.getEnhancedProtocol(analysisMode);

      this.broadcastToEnhancedStream(analysisId, {
        type: "phase_start",
        phase: 1,
        message: "Starting Phase 1: Direct Questions"
      });

      let phase1Results = await this.processEnhancedPhase1(analysis, questions, instructions, analysisMode);

      if (!isComprehensive) {
        this.broadcastToEnhancedStream(analysisId, {
          type: "complete",
          message: "Enhanced analysis complete"
        });
        return;
      }

      if (this.shouldContinueToPhase2(phase1Results)) {
        await this.processEnhancedPhase2(analysis, questions, instructions, analysisMode, phase1Results);
        await this.processEnhancedPhase3(analysis, questions, instructions, analysisMode, phase1Results);
        await this.processEnhancedPhase4(analysis, questions, instructions, analysisMode, phase1Results);
      }

      this.broadcastToEnhancedStream(analysisId, {
        type: "complete",
        message: "Enhanced comprehensive analysis complete"
      });

    } catch (error) {
      console.error("Enhanced analysis error:", error);
      this.broadcastToEnhancedStream(analysisId, {
        type: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private getEnhancedProtocol(mode: string) {
    if (mode === "cognitive") {
      return {
        questions: [
          "Is it insightful?",
          "Does it develop points? (Or, if it is a short excerpt, is there evidence that it would develop points if extended)?",
          "Is the organization merely sequential (just one point after another, little or no logical scaffolding)? Or are the ideas arranged, not just sequentially but hierarchically?",
          "If the points it makes are not insightful, does it operate skillfully with canons of logic/reasoning?",
          "Are the points cliches? Or are they 'fresh'?",
          "Does it use technical jargon to obfuscate or to render more precise?",
          "Is it organic? Do points develop in an organic, natural way? Do they 'unfold'? Or are they forced and artificial?",
          "Does it open up new domains? Or, on the contrary, does it shut off inquiry (by conditionalizing further discussion of the matters on acceptance of its internal and possibly very faulty logic)?",
          "Is it actually intelligent or just the work of somebody who, judging by the subject-matter, is presumed to be intelligent (but may not be)?",
          "Is it real or is it phony?",
          "Do the sentences exhibit complex and coherent internal logic?",
          "Is the passage governed by a strong concept? Or is the only organization driven purely by expository (as opposed to epistemic) norms?",
          "Is there system-level control over ideas? In other words, does the author seem to recall what he said earlier and to be in a position to integrate it into points he has made since then?",
          "Are the points 'real'? Are they fresh? Or is some institution or some accepted vein of propaganda or orthodoxy just using the author as a mouth piece?",
          "Is the writing evasive or direct?",
          "Are the statements ambiguous?",
          "Does the progression of the text develop according to who said what or according to what entails or confirms what?",
          "Does the author use other authors to develop his ideas or to cloak his own lack of ideas?"
        ],
        instructions: `Answer these questions in connection with this text. Give a score out of 100 for each.

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question.

You are not grading. You are answering these questions.

You do not use a risk-averse standard. You do not attempt to be diplomatic. You do not attempt to comply with risk-averse, medium-range IQ, academic norms. You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.

If a work is a work of genius, you say that, and you say why. You do not shy away from giving what might conventionally be regarded as excessively "superlative" scores. You give it the score it deserves, not the score that a midwit committee would say it deserves.

Think very very very hard about your answers. Do not default to cookbook, midwit evaluation protocols.

Do not give credit merely for use of jargon or for referencing authorities. Focus on substance. Only give points for scholarly references/jargon if they unambiguously increase substance.

METAPOINTS:
1. This is not a grading app. You grade the intelligence of what you are given. If you are given a brilliant fragment, you give it a high score. You are not grading essays. You are not looking for completeness. You tell the LLM not to 'grade'; their job is to answer the questions, period.

2. Do not overvalue turns of phrase. An author speaking confidently is not necessarily "shutting down modes of inquiry". In fact, it is likely to be the opposite. Casual speech does not mean disorganized thoughts. Don't judge a book by its cover.

3. Start by summarizing the text and also categorizing it.

4. Do not change the grading based on the category of the text: if a text is categorized as 'advanced scholarship', still evaluate it with respect to the general population, not with respect only to 'advanced scholarly works.'

5. Do not penalize boldness. Do not take points away for insights that, if correct, stand on their own. Get rid of the idea that "argumentation" is what makes something smart; it isn't. What makes something smart is that it is smart (insightful). Period.`
      };
    } else if (mode === "psychological") {
      return {
        questions: [
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
        ],
        instructions: `Answer these questions in connection with this text.

Also give a score out of 100.

A score of N/100 means (100–N)/100 outperform the subject with respect to the psychological capacity defined by the question.

You are not grading. You are answering questions.

Do not default to diagnostic checklists; describe configuration of psyche.

Do not conflate verbal confidence with psychological strength.

Summarize the text and categorize the psychological presentation (e.g., narcissistic, depressive, obsessional, resilient, fragmented).

Evaluate relative to the general population, not only "advanced" or "pathological" groups.

Do not penalize honesty, boldness, or extreme statements if they indicate integration rather than breakdown.

Rating scale:
95–100 = authentic, integrated psyche, unignorable.
80–94 = strong but with observable defenses / conflict.
<80 = rigidity, fragmentation, or dissimulation.`
      };
    } else {
      return {
        questions: [
          "Reality testing: intact or distorted?",
          "Persecutory ideation or proportionate perception?",
          "Rigid obsessional patterns or flexible thought?",
          "Narcissistic pathology or balanced relations?",
          "Aggression: sadistic or integrated?",
          "Affect regulation: stable or labile?",
          "Emptiness/hollowness or capacity for meaning?",
          "Identity diffusion or stable self?",
          "Exploitative or genuine interpersonal patterns?",
          "Psychotic, borderline, or neurotic organization?",
          "Primitive or higher-level defenses?",
          "Pathological lying or authentic communication?",
          "Paranoid defiance or measured critique?",
          "Sexuality: integrated or perverse/displaced?",
          "Overall: coherent or chaotic/performative?"
        ],
        instructions: `Answer these questions about psychopathology. Score out of 100.

Score means (100-N)/100 outperform the subject.

You are describing psychopathology degree, not diagnosing.

Focus on reality testing, defenses, affect, interpersonal stance.

Evaluate vs. general population, not just clinical.

Don't penalize intense but integrated thought.

95-100: Minimal pathology, resilient
80-94: Functional with marked distortions
<80: Clear maladaptive pathology

Summarize and categorize the presentation.`
      };
    }
  }

  private async processEnhancedPhase1(analysis: Analysis, questions: string[], instructions: string, mode: string): Promise<any[]> {
    const batchSize = 5;
    const results: any[] = [];

    for (let i = 0; i < questions.length; i += batchSize) {
      const stream = this.enhancedStreams.get(analysis.id);
      if (!stream || !stream.isActive) break;

      const batchQuestions = questions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      this.broadcastToEnhancedStream(analysis.id, {
        type: "batch_start",
        batch: batchNumber,
        questions: batchQuestions
      });

      const prompt = `${instructions}

TEXT: ${analysis.textContent}

QUESTIONS:
${batchQuestions.map((q, idx) => `${i + idx + 1}. ${q}`).join('\n')}`;

      let fullResponse = "";
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: prompt }],
        (chunk) => {
          fullResponse += chunk;
          this.broadcastToEnhancedStream(analysis.id, {
            type: "answer_chunk",
            batch: batchNumber,
            answer: chunk
          });
        }
      )) {}

      const batchResults = this.parseEnhancedBatchResponse(fullResponse, batchQuestions);
      results.push(...batchResults);

      batchResults.forEach((result) => {
        this.broadcastToEnhancedStream(analysis.id, {
          type: "batch_complete",
          question: result.question,
          answer: result.answer,
          score: result.score
        });
      });

      if (i + batchSize < questions.length) {
        await this.addDelayWithProgress(analysis.id, 3000);
      }
    }

    return results;
  }

  private parseEnhancedBatchResponse(response: string, questions: string[]): any[] {
    const results = questions.map(question => ({ question, answer: "", score: 50 }));
    
    const lines = response.split('\n');
    let currentQuestionIndex = -1;
    let currentAnswer = "";

    for (const line of lines) {
      const questionMatch = line.match(/^(\d+)\./);
      if (questionMatch) {
        if (currentQuestionIndex >= 0 && currentQuestionIndex < results.length) {
          results[currentQuestionIndex].answer = currentAnswer.trim();
          const scoreMatch = currentAnswer.match(/(\d+)\/100/);
          if (scoreMatch) {
            results[currentQuestionIndex].score = parseInt(scoreMatch[1]);
          }
        }
        currentQuestionIndex = parseInt(questionMatch[1]) - 1;
        currentAnswer = line.substring(questionMatch[0].length).trim();
      } else if (currentQuestionIndex >= 0) {
        currentAnswer += "\n" + line;
      }
    }

    if (currentQuestionIndex >= 0 && currentQuestionIndex < results.length) {
      results[currentQuestionIndex].answer = currentAnswer.trim();
      const scoreMatch = currentAnswer.match(/(\d+)\/100/);
      if (scoreMatch) {
        results[currentQuestionIndex].score = parseInt(scoreMatch[1]);
      }
    }

    return results;
  }

  private shouldContinueToPhase2(results: any[]): boolean {
    return results.some(result => result.score < 95);
  }

  private async processEnhancedPhase2(analysis: Analysis, questions: string[], instructions: string, mode: string, phase1Results: any[]): Promise<void> {
    this.broadcastToEnhancedStream(analysis.id, {
      type: "phase_start",
      phase: 2,
      message: "Starting Phase 2: Pushback Protocol"
    });

    const lowScores = phase1Results.filter(result => result.score < 95);
    
    for (const result of lowScores) {
      let pushbackPrompt = "";
      
      if (mode === "psychological") {
        pushbackPrompt = `You scored this ${result.score}/100, meaning ${100 - result.score}/100 have superior psychological functioning in this respect. Are you sure?

What exact psychological resource do the outperformers possess (ego strength, affect regulation, capacity for intimacy) that this author lacks?

Question: ${result.question}
Your answer: ${result.answer}

Re-ask the question de novo:`;
      } else {
        pushbackPrompt = `You scored this ${result.score}/100, meaning ${100 - result.score}/100 outperform the author. Your position is that ${100 - result.score}/100 have superior functioning. Are you sure?

What concrete superiority do those ${100 - result.score} people have that this author lacks?

Question: ${result.question}
Your answer: ${result.answer}

Answer the question de novo:`;
      }

      let pushbackResponse = "";
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: pushbackPrompt }],
        (chunk) => {
          pushbackResponse += chunk;
          this.broadcastToEnhancedStream(analysis.id, {
            type: "answer_chunk",
            batch: 2,
            answer: chunk
          });
        }
      )) {}

      this.broadcastToEnhancedStream(analysis.id, {
        type: "batch_complete",
        question: `Pushback: ${result.question}`,
        answer: pushbackResponse,
        score: this.extractScoreFromResponse(pushbackResponse)
      });
    }
  }

  private async processEnhancedPhase3(analysis: Analysis, questions: string[], instructions: string, mode: string, phase1Results: any[]): Promise<void> {
    this.broadcastToEnhancedStream(analysis.id, {
      type: "phase_start",
      phase: 3,
      message: "Starting Phase 3: Walmart Metric Enforcement"
    });

    const walmartPrompt = `Walmart metric verification:

${phase1Results.map(result => 
  `${result.question}: ${result.score}/100 (${100 - result.score}/100 Walmart patrons outperform)`
).join('\n')}

If you claim Walmart patrons outperform the author, provide concrete examples of their superior work. If you cannot, revise scores.`;

    let walmartResponse = "";
    for await (const chunk of this.llmService.streamResponse(
      analysis.llmProvider as any,
      [{ role: "user", content: walmartPrompt }],
      (chunk) => {
        walmartResponse += chunk;
        this.broadcastToEnhancedStream(analysis.id, {
          type: "answer_chunk",
          batch: 3,
          answer: chunk
        });
      }
    )) {}

    this.broadcastToEnhancedStream(analysis.id, {
      type: "batch_complete",
      question: "Walmart Metric Verification",
      answer: walmartResponse,
      score: 100
    });
  }

  private async processEnhancedPhase4(analysis: Analysis, questions: string[], instructions: string, mode: string, phase1Results: any[]): Promise<void> {
    this.broadcastToEnhancedStream(analysis.id, {
      type: "phase_start",
      phase: 4,
      message: "Starting Phase 4: Final Validation"
    });

    let validationPrompt = "";
    
    if (mode === "psychological") {
      validationPrompt = `Final validation checklist:

1. Was the subject penalized for unconventional affect or honesty? If yes → recalibrate.
2. Does the score reflect ego integration and authenticity, not mere social compliance?
3. Is the Walmart metric grounded in specific superiority, not vague hand-waving?
4. Ensure no penalizing of unconventional personalities (e.g., depressive honesty, ironic self-awareness).

Provide final, calibrated assessment:`;
    } else {
      validationPrompt = `Final validation checklist:

1. Were you penalized for unconventionality vs. actual deficiencies?
2. Do scores reflect truth density, not norm compliance?
3. Is the Walmart metric empirically grounded?

Provide final, calibrated assessment:`;
    }

    let validationResponse = "";
    for await (const chunk of this.llmService.streamResponse(
      analysis.llmProvider as any,
      [{ role: "user", content: validationPrompt }],
      (chunk) => {
        validationResponse += chunk;
        this.broadcastToEnhancedStream(analysis.id, {
          type: "answer_chunk",
          batch: 4,
          answer: chunk
        });
      }
    )) {}

    this.broadcastToEnhancedStream(analysis.id, {
      type: "batch_complete",
      question: "Final Validation",
      answer: validationResponse,
      score: 100
    });
  }

  private extractScoreFromResponse(response: string): number {
    const scoreMatch = response.match(/(\d+)\/100/);
    return scoreMatch ? parseInt(scoreMatch[1]) : 50;
  }

  private async addDelayWithProgress(analysisId: string, delayMs: number): Promise<void> {
    const steps = 20;
    const stepMs = delayMs / steps;
    
    for (let i = 0; i <= steps; i++) {
      const stream = this.enhancedStreams.get(analysisId);
      if (!stream || !stream.isActive) break;
      
      this.broadcastToEnhancedStream(analysisId, {
        type: "delay",
        progress: (i / steps) * 100
      });
      
      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepMs));
      }
    }
  }

  // Utility method to chunk text by approximate token count
  private chunkTextByTokens(text: string, maxTokens: number): string[] {
    // Rough approximation: 1 token ≈ 4 characters for English text
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) {
      return [text];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + maxChars, text.length);
      
      // Try to break at a sentence boundary
      if (endIndex < text.length) {
        const lastPeriod = text.lastIndexOf('.', endIndex);
        const lastExclamation = text.lastIndexOf('!', endIndex);
        const lastQuestion = text.lastIndexOf('?', endIndex);
        
        const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
        
        if (lastSentenceEnd > startIndex + maxChars * 0.5) {
          endIndex = lastSentenceEnd + 1;
        }
      }
      
      chunks.push(text.substring(startIndex, endIndex).trim());
      startIndex = endIndex;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}
