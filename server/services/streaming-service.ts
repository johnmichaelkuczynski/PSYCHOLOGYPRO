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

    // Check if user has sufficient credits (only for authenticated users)
    if (analysis.userId) {
      const requiredCredits = this.getRequiredCredits(analysis.type);
      const hasCredits = await this.storage.checkUserCredits(analysis.userId, requiredCredits);
      
      if (!hasCredits) {
        await this.storage.updateAnalysisStatus(analysisId, "error");
        throw new Error("Insufficient credits for this analysis");
      }
      
      // Consume credits upfront
      await this.storage.consumeUserCredits(analysis.userId, requiredCredits);
    }

    await this.storage.updateAnalysisStatus(analysisId, "streaming");

    try {
      // Process the analysis and ensure results are saved
      switch (analysis.type) {
        case "cognitive":
          await this.processCognitiveAnalysis(analysis);
          break;
        case "comprehensive-cognitive":
          await this.processComprehensiveCognitiveAnalysis(analysis);
          break;
        case "microcognitive":
          await this.processMicrocognitiveAnalysis(analysis);
          break;
        case "psychological":
          await this.processPsychologicalAnalysis(analysis);
          break;
        case "comprehensive-psychological":
          await this.processComprehensivePsychologicalAnalysis(analysis);
          break;
        case "micropsychological":
          await this.processMicropsychologicalAnalysis(analysis);
          break;
        case "psychopathological":
          await this.processPsychopathologicalAnalysis(analysis);
          break;
        case "comprehensive-psychopathological":
          await this.processComprehensivePsychopathologicalAnalysis(analysis);
          break;
        case "micropsychopathological":
          await this.processMicropsychopathologicalAnalysis(analysis);
          break;
        default:
          throw new Error(`Analysis type ${analysis.type} not implemented`);
      }

      // Verify results were actually saved before marking as completed
      const updatedAnalysis = await this.storage.getAnalysis(analysisId);
      if (!updatedAnalysis?.results) {
        throw new Error("Analysis processing completed but results were not saved");
      }

      await this.storage.updateAnalysisStatus(analysisId, "completed");
      
      this.broadcastToStream(analysisId, {
        type: "complete"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Analysis ${analysisId} failed:`, error);
      await this.storage.updateAnalysisStatus(analysisId, "error");
      
      // Save error information in results
      await this.storage.updateAnalysisResults(analysisId, {
        error: errorMessage,
        failedAt: new Date().toISOString(),
        type: analysis.type
      });
      
      throw error;
    }
  }

  private async processCognitiveAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getCognitiveQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      // Check if analysis was stopped
      const currentStream = this.activeStreams.get(analysis.id);
      if (!currentStream || !currentStream.isActive) {
        return;
      }

      const batch = batches[i];
      const batchNumber = i + 1;

      // Process each question in the batch
      const batchResponse = await this.processBatch(analysis, batch, batchNumber);
      batchResults.push(batchResponse);

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

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  private async streamSummary(analysis: Analysis): Promise<string> {
    const summaryPrompt = `First, summarize this text and categorize it:\n\n${analysis.textContent}`;
    
    let summary = "";
    let hasContent = false;
    
    try {
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: summaryPrompt }],
        (chunk) => {
          summary += chunk;
          hasContent = true;
          this.broadcastToStream(analysis.id, {
            type: "summary",
            content: summary
          });
        }
      )) {
        // Stream is handled by the onChunk callback
      }
      
      if (!hasContent) {
        throw new Error("No content received from LLM during summary generation");
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Summary generation failed for analysis ${analysis.id}:`, errorMessage);
      throw new Error(`Summary generation failed: ${errorMessage}`);
    }
    
    return summary;
  }

  private async processBatch(analysis: Analysis, questions: string[], batchNumber: number): Promise<string> {
    const prompt = this.llmService.createCognitivePrompt(
      analysis.textContent,
      questions,
      analysis.additionalContext || undefined
    );

    let fullResponse = "";
    let hasContent = false;
    
    try {
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: prompt }],
        (chunk) => {
          fullResponse += chunk;
          hasContent = true;
          
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
      
      if (!hasContent) {
        throw new Error(`No content received from LLM for batch ${batchNumber}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Batch ${batchNumber} processing failed for analysis ${analysis.id}:`, errorMessage);
      throw new Error(`Batch ${batchNumber} processing failed: ${errorMessage}`);
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
    
    return fullResponse;
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

  private getRequiredCredits(analysisType: string): number {
    const ANALYSIS_CREDIT_COST = {
      cognitive: 2000,
      "comprehensive-cognitive": 5000,
      microcognitive: 500,
      psychological: 1500,
      "comprehensive-psychological": 4000,
      micropsychological: 400,
      psychopathological: 1500,
      "comprehensive-psychopathological": 4000,
      micropsychopathological: 400,
    } as const;

    return ANALYSIS_CREDIT_COST[analysisType as keyof typeof ANALYSIS_CREDIT_COST] || 2000;
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
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getComprehensiveCognitiveQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processBatchesWithResults(analysis, batches);

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Process Psychological Analysis  
  private async processPsychologicalAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getPsychologicalQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processBatchesWithResults(analysis, batches);

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Process Comprehensive Psychological Analysis
  private async processComprehensivePsychologicalAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getComprehensivePsychologicalQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processBatchesWithResults(analysis, batches);

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Process Psychopathological Analysis
  private async processPsychopathologicalAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getPsychopathologicalQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processBatchesWithResults(analysis, batches);

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Process Comprehensive Psychopathological Analysis
  private async processComprehensivePsychopathologicalAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5
    const questions = this.llmService.getComprehensivePsychopathologicalQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processBatchesWithResults(analysis, batches);

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
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

  // Shared batch processing logic that returns results
  private async processBatchesWithResults(analysis: Analysis, batches: string[][]): Promise<string[]> {
    const batchResults: string[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      const currentStream = this.activeStreams.get(analysis.id);
      if (!currentStream || !currentStream.isActive) {
        throw new Error("Analysis stopped by user");
      }

      const batch = batches[i];
      const batchNumber = i + 1;
      const batchResponse = await this.processBatch(analysis, batch, batchNumber);
      batchResults.push(batchResponse);

      const delayStream = this.activeStreams.get(analysis.id);
      if (!delayStream || !delayStream.isActive) {
        throw new Error("Analysis stopped by user");
      }

      if (i < batches.length - 1) {
        await this.streamDelay(analysis.id, 10000);
      }
    }
    
    return batchResults;
  }

  // Process Micro Cognitive Analysis (ultra-fast, concise responses)
  private async processMicrocognitiveAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5 with micro prompts
    const questions = this.llmService.getMicrocognitiveQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processMicroBatchesWithResults(analysis, batches, 'microcognitive');

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Process Micro Psychological Analysis (ultra-fast, concise responses)
  private async processMicropsychologicalAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5 with micro prompts
    const questions = this.llmService.getMicropsychologicalQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processMicroBatchesWithResults(analysis, batches, 'micropsychological');

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Process Micro Psychopathological Analysis (ultra-fast, concise responses)
  private async processMicropsychopathologicalAnalysis(analysis: Analysis): Promise<void> {
    // Step 1: Generate and stream summary
    const summary = await this.streamSummary(analysis);

    // Step 2: Process questions in batches of 5 with micro prompts
    const questions = this.llmService.getMicropsychopathologicalQuestions();
    const batches = this.createBatches(questions, 5);
    const batchResults = await this.processMicroBatchesWithResults(analysis, batches, 'micropsychopathological');

    // Step 3: Save the complete analysis results
    const finalResults = {
      summary,
      batches: batchResults,
      questions,
      type: analysis.type,
      completedAt: new Date().toISOString()
    };

    await this.storage.updateAnalysisResults(analysis.id, finalResults);
  }

  // Shared micro batch processing logic that returns results with micro prompts
  private async processMicroBatchesWithResults(analysis: Analysis, batches: string[][], microType: 'microcognitive' | 'micropsychological' | 'micropsychopathological'): Promise<string[]> {
    const batchResults: string[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      const currentStream = this.activeStreams.get(analysis.id);
      if (!currentStream || !currentStream.isActive) {
        throw new Error("Analysis stopped by user");
      }

      const batch = batches[i];
      const batchNumber = i + 1;
      const batchResponse = await this.processMicroBatch(analysis, batch, batchNumber, microType);
      batchResults.push(batchResponse);

      const delayStream = this.activeStreams.get(analysis.id);
      if (!delayStream || !delayStream.isActive) {
        throw new Error("Analysis stopped by user");
      }

      if (i < batches.length - 1) {
        await this.streamDelay(analysis.id, 10000);
      }
    }
    
    return batchResults;
  }

  // Process micro batch using appropriate micro prompt
  private async processMicroBatch(analysis: Analysis, questions: string[], batchNumber: number, microType: 'microcognitive' | 'micropsychological' | 'micropsychopathological'): Promise<string> {
    let prompt: string;
    
    // Use appropriate micro prompt based on type
    switch (microType) {
      case 'microcognitive':
        prompt = this.llmService.createMicrocognitivePrompt(
          analysis.textContent,
          questions,
          analysis.additionalContext || undefined
        );
        break;
      case 'micropsychological':
        prompt = this.llmService.createMicropsychologicalPrompt(
          analysis.textContent,
          questions,
          analysis.additionalContext || undefined
        );
        break;
      case 'micropsychopathological':
        prompt = this.llmService.createMicropsychopathologicalPrompt(
          analysis.textContent,
          questions,
          analysis.additionalContext || undefined
        );
        break;
      default:
        throw new Error(`Unknown micro type: ${microType}`);
    }

    let fullResponse = "";
    let hasContent = false;
    
    try {
      for await (const chunk of this.llmService.streamResponse(
        analysis.llmProvider as any,
        [{ role: "user", content: prompt }],
        (chunk) => {
          fullResponse += chunk;
          hasContent = true;
          
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
      
      if (!hasContent) {
        throw new Error(`No content received from LLM for micro batch ${batchNumber}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Micro batch ${batchNumber} processing failed for analysis ${analysis.id}:`, errorMessage);
      throw new Error(`Micro batch ${batchNumber} processing failed: ${errorMessage}`);
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
    
    return fullResponse;
  }
}
