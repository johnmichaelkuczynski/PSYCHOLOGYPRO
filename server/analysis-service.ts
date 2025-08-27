import type { AnalysisType, LLMProvider, AnalysisResponse, TextChunk } from "../shared/profiler-schema";
import { QUESTION_SETS, PUSHBACK_PROTOCOL, WALMART_METRIC, FINAL_VALIDATION, PHONY_TEXT_EXAMPLE } from "../shared/profiler-protocols";
import { LLMService } from "./llm-service";

export interface AnalysisRequest {
  analysisType: AnalysisType;
  llmProvider: LLMProvider;
  textContent: string;
  selectedChunks?: TextChunk[];
}

export interface AnalysisProgress {
  phase: number;
  total: number;
  description: string;
  result?: any;
}

export class AnalysisService {
  private llmService = new LLMService();

  async runAnalysis(
    request: AnalysisRequest,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse> {
    const isComprehensive = request.analysisType.includes("_long");
    const questionSet = QUESTION_SETS[request.analysisType];
    
    if (!questionSet) {
      throw new Error(`Unknown analysis type: ${request.analysisType}`);
    }

    // Prepare text content
    let textToAnalyze = request.textContent;
    if (request.selectedChunks && request.selectedChunks.length > 0) {
      textToAnalyze = request.selectedChunks
        .filter(chunk => chunk.selected)
        .map(chunk => chunk.content)
        .join('\n\n--- CHUNK BREAK ---\n\n');
    }

    if (isComprehensive) {
      return this.runComprehensiveAnalysis(request, textToAnalyze, questionSet, onProgress);
    } else {
      return this.runNormalAnalysis(request, textToAnalyze, questionSet, onProgress);
    }
  }

  private async runNormalAnalysis(
    request: AnalysisRequest,
    textContent: string,
    questionSet: any,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse> {
    onProgress?.({ phase: 1, total: 1, description: "Running analysis..." });

    const prompt = this.buildPrompt(textContent, questionSet, false);
    const response = await this.llmService.sendRequest(
      request.llmProvider,
      prompt,
      this.getSystemMessage(request.analysisType)
    );

    const parsedResponse = this.parseResponse(response);
    
    onProgress?.({ 
      phase: 1, 
      total: 1, 
      description: "Analysis complete", 
      result: parsedResponse 
    });

    return parsedResponse;
  }

  private async runComprehensiveAnalysis(
    request: AnalysisRequest,
    textContent: string,
    questionSet: any,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<AnalysisResponse> {
    // Phase 1: Initial Analysis
    onProgress?.({ phase: 1, total: 4, description: "Phase 1: Initial analysis..." });
    
    const phase1Prompt = this.buildPrompt(textContent, questionSet, true);
    let response = await this.llmService.sendRequest(
      request.llmProvider,
      phase1Prompt,
      this.getSystemMessage(request.analysisType)
    );
    
    let analysis = this.parseResponse(response);
    
    // Check if pushback is needed (score < 95)
    const needsPushback = analysis.overallScore < 95;
    
    if (needsPushback) {
      // Phase 2: Pushback Protocol
      onProgress?.({ phase: 2, total: 4, description: "Phase 2: Pushback protocol..." });
      
      const pushbackPrompt = this.buildPushbackPrompt(textContent, questionSet, analysis);
      response = await this.llmService.sendRequest(
        request.llmProvider,
        pushbackPrompt,
        this.getSystemMessage(request.analysisType)
      );
      
      analysis = this.parseResponse(response);
      
      // Phase 3: Walmart Metric Enforcement
      onProgress?.({ phase: 3, total: 4, description: "Phase 3: Walmart metric enforcement..." });
      
      const walmartPrompt = this.buildWalmartPrompt(textContent, analysis);
      response = await this.llmService.sendRequest(
        request.llmProvider,
        walmartPrompt,
        this.getSystemMessage(request.analysisType)
      );
      
      analysis = this.parseResponse(response);
    } else {
      // Skip phases 2-3 if score >= 95
      onProgress?.({ phase: 2, total: 4, description: "Phase 2: Skipped (high score)" });
      onProgress?.({ phase: 3, total: 4, description: "Phase 3: Skipped (high score)" });
    }
    
    // Phase 4: Final Validation
    onProgress?.({ phase: 4, total: 4, description: "Phase 4: Final validation..." });
    
    const validationPrompt = this.buildValidationPrompt(textContent, analysis);
    response = await this.llmService.sendRequest(
      request.llmProvider,
      validationPrompt,
      this.getSystemMessage(request.analysisType)
    );
    
    const finalAnalysis = this.parseResponse(response);
    
    onProgress?.({ 
      phase: 4, 
      total: 4, 
      description: "Comprehensive analysis complete", 
      result: finalAnalysis 
    });

    return finalAnalysis;
  }

  private buildPrompt(textContent: string, questionSet: any, isComprehensive: boolean): string {
    let prompt = `TEXT TO ANALYZE:\n\n${textContent}\n\n`;
    
    // Add questions
    prompt += "QUESTIONS:\n\n";
    questionSet.questions.forEach((question: string, index: number) => {
      prompt += `${index + 1}. ${question}\n`;
    });
    
    // Add instructions
    prompt += "\n\nINSTRUCTIONS:\n\n";
    questionSet.instructions.forEach((instruction: string) => {
      prompt += `• ${instruction}\n`;
    });
    
    // Add metapoints for cognitive assessments
    if (questionSet.metapoints && questionSet.metapoints.length > 0) {
      prompt += "\n\nMETAPOINTS:\n\n";
      questionSet.metapoints.forEach((metapoint: string) => {
        prompt += `• ${metapoint}\n`;
      });
    }
    
    // Add phony text example for cognitive assessments
    if (textContent.includes("cognitive")) {
      prompt += "\n\nEXAMPLE OF PHONY TEXT (use as negative paradigm):\n\n";
      prompt += PHONY_TEXT_EXAMPLE;
      prompt += "\n\nThis example shows pseudo-intellectual writing that appears smart but lacks substance. Use this as a reference for identifying similar patterns.\n\n";
    }
    
    prompt += "\n\nPLEASE PROVIDE:\n";
    prompt += "1. A summary of the text\n";
    prompt += "2. A categorization of the text\n";
    prompt += "3. Answers to each question with scores out of 100\n";
    prompt += "4. An overall assessment and reasoning\n";
    prompt += "5. An overall score out of 100\n";
    
    if (isComprehensive) {
      prompt += "\n\nNote: This is part of a comprehensive analysis that may involve multiple phases of review and refinement.";
    }
    
    return prompt;
  }

  private buildPushbackPrompt(textContent: string, questionSet: any, previousAnalysis: AnalysisResponse): string {
    let prompt = `ORIGINAL TEXT:\n\n${textContent}\n\n`;
    prompt += `PREVIOUS ANALYSIS RESULTS:\n\nOverall Score: ${previousAnalysis.overallScore}/100\n\n`;
    
    prompt += "PUSHBACK PROTOCOL:\n\n";
    PUSHBACK_PROTOCOL.forEach(instruction => {
      prompt += `• ${instruction.replace('(100–N)/100', `(100–${previousAnalysis.overallScore})/100`)}\n`;
    });
    
    prompt += "\nRe-evaluate the text with these considerations in mind. Be specific about what psychological strengths the outperformers would have that this author lacks.";
    
    return prompt;
  }

  private buildWalmartPrompt(textContent: string, analysis: AnalysisResponse): string {
    let prompt = `TEXT:\n\n${textContent}\n\n`;
    prompt += `CURRENT SCORE: ${analysis.overallScore}/100\n\n`;
    
    prompt += "WALMART METRIC ENFORCEMENT:\n\n";
    WALMART_METRIC.forEach(instruction => {
      prompt += `• ${instruction}\n`;
    });
    
    prompt += `\nYou are claiming that ${100 - analysis.overallScore}/100 people (including Walmart patrons) outperform this author. Provide concrete, specific examples of how this would be true, or revise your assessment.`;
    
    return prompt;
  }

  private buildValidationPrompt(textContent: string, analysis: AnalysisResponse): string {
    let prompt = `TEXT:\n\n${textContent}\n\n`;
    prompt += `CURRENT ANALYSIS:\n\nScore: ${analysis.overallScore}/100\nReasoning: ${analysis.reasoning}\n\n`;
    
    prompt += "FINAL VALIDATION:\n\n";
    FINAL_VALIDATION.forEach(instruction => {
      prompt += `• ${instruction}\n`;
    });
    
    prompt += "\nReview your analysis one final time to ensure it reflects authentic engagement and avoids penalizing unconventional but genuine expression.";
    
    return prompt;
  }

  private getSystemMessage(analysisType: AnalysisType): string {
    if (analysisType.includes("cognitive")) {
      return "You are an expert in evaluating cognitive ability and intelligence. You assess texts for genuine insight, logical coherence, and intellectual depth. You do not grade papers - you evaluate intelligence as revealed in the text.";
    } else if (analysisType.includes("psychological")) {
      return "You are an expert in psychological assessment. You evaluate texts for psychological functioning, ego strength, defense mechanisms, and emotional integration. You describe psychological configurations rather than diagnose.";
    } else if (analysisType.includes("psychopathological")) {
      return "You are an expert in psychopathology assessment. You evaluate texts for indicators of psychological disorders and pathological functioning while being careful not to conflate unconventional thinking with pathology.";
    }
    return "You are an expert text analyst.";
  }

  private parseResponse(response: string): AnalysisResponse {
    // This is a simplified parser - in practice, you might want more sophisticated parsing
    // For now, we'll extract key components and structure them
    
    try {
      // Try to extract structured information from the response
      const lines = response.split('\n').filter(line => line.trim());
      
      let summary = "";
      let category = "";
      let reasoning = response;
      let overallScore = 85; // Default score
      const questionResponses: Array<{question: string, answer: string, score: number}> = [];
      
      // Look for summary
      const summaryIndex = lines.findIndex(line => line.toLowerCase().includes('summary'));
      if (summaryIndex !== -1 && summaryIndex + 1 < lines.length) {
        summary = lines[summaryIndex + 1];
      }
      
      // Look for category
      const categoryIndex = lines.findIndex(line => line.toLowerCase().includes('category'));
      if (categoryIndex !== -1 && categoryIndex + 1 < lines.length) {
        category = lines[categoryIndex + 1];
      }
      
      // Look for overall score
      const scoreMatches = response.match(/(\d+)\/100|overall.*?(\d+)|score.*?(\d+)/gi);
      if (scoreMatches && scoreMatches.length > 0) {
        const lastMatch = scoreMatches[scoreMatches.length - 1];
        const scoreMatch = lastMatch.match(/(\d+)/);
        if (scoreMatch) {
          overallScore = parseInt(scoreMatch[1]);
        }
      }
      
      return {
        summary: summary || "Analysis completed",
        category: category || "General text",
        questionResponses,
        overallScore,
        reasoning: reasoning.slice(0, 2000) // Truncate if too long
      };
      
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      return {
        summary: "Analysis completed",
        category: "General text", 
        questionResponses: [],
        overallScore: 85,
        reasoning: response.slice(0, 2000)
      };
    }
  }
}