import type { Analysis } from "@shared/schema";
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
      // Step 1: Generate and stream summary
      await this.streamSummary(analysis);

      // Step 2: Process questions in batches of 5
      const questions = this.llmService.getCognitiveQuestions();
      const batches = this.createBatches(questions, 5);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;

        // Stream batch start
        this.broadcastToStream(analysisId, {
          type: "batch",
          batchNumber,
          questions: batch.map(q => ({ question: q, response: "", score: 0, isComplete: false })),
          isComplete: false,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
        });

        // Process each question in the batch
        await this.processBatch(analysis, batch, batchNumber);

        // Wait 10 seconds before next batch (except for last batch)
        if (i < batches.length - 1) {
          await this.streamDelay(analysisId, 10000);
        }
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

  private async streamSummary(analysis: Analysis): Promise<void> {
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
  }

  private async processBatch(analysis: Analysis, questions: string[], batchNumber: number): Promise<void> {
    const prompt = this.llmService.createCognitivePrompt(
      analysis.textContent,
      questions,
      analysis.additionalContext || undefined
    );

    let fullResponse = "";
    
    for await (const chunk of this.llmService.streamResponse(
      analysis.llmProvider as any,
      [{ role: "user", content: prompt }],
      (chunk) => {
        fullResponse += chunk;
        
        // Parse the response to extract individual question answers
        const parsedResponse = this.parseQuestionResponses(fullResponse, questions);
        
        this.broadcastToStream(analysis.id, {
          type: "batch",
          batchNumber,
          questions: parsedResponse,
          isComplete: false,
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

    // Mark batch as complete
    const finalParsed = this.parseQuestionResponses(fullResponse, questions);
    this.broadcastToStream(analysis.id, {
      type: "batch",
      batchNumber,
      questions: finalParsed.map(q => ({ ...q, isComplete: true })),
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
    let content = `MIND READER ANALYSIS REPORT\n`;
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
}
