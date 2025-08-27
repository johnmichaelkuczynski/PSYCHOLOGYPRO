import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import type { AnalysisType, LLMProvider, TextChunk } from "../shared/profiler-schema";
import { AnalysisService, type AnalysisRequest } from "./analysis-service";
import { LLMService } from "./llm-service";

const router = Router();
const analysisService = new AnalysisService();
const llmService = new LLMService();

// In-memory storage for active analyses
const activeAnalyses = new Map<string, any>();
const analysisResults = new Map<string, any>();

// Start new analysis
router.post("/api/profiler/analyze", async (req: Request, res: Response) => {
  try {
    const { analysisType, llmProvider, textContent, selectedChunks } = req.body;
    
    if (!analysisType || !llmProvider || !textContent) {
      return res.status(400).json({
        error: "Missing required fields: analysisType, llmProvider, textContent"
      });
    }

    const analysisId = nanoid();
    const analysis = {
      id: analysisId,
      analysisType,
      llmProvider,
      textContent,
      selectedChunks: selectedChunks || [],
      status: "running",
      progress: { phase: 0, total: 1, description: "Starting analysis..." },
      results: null,
      createdAt: new Date().toISOString()
    };

    activeAnalyses.set(analysisId, analysis);

    // Start analysis in background
    setImmediate(async () => {
      try {
        const request: AnalysisRequest = {
          analysisType: analysisType as AnalysisType,
          llmProvider: llmProvider as LLMProvider,
          textContent,
          selectedChunks: selectedChunks as TextChunk[]
        };

        const results = await analysisService.runAnalysis(request, (progress) => {
          const updatedAnalysis = activeAnalyses.get(analysisId);
          if (updatedAnalysis) {
            updatedAnalysis.progress = progress;
            activeAnalyses.set(analysisId, updatedAnalysis);
          }
        });

        // Store results
        const completedAnalysis = activeAnalyses.get(analysisId);
        if (completedAnalysis) {
          completedAnalysis.status = "completed";
          completedAnalysis.results = results;
          activeAnalyses.set(analysisId, completedAnalysis);
          analysisResults.set(analysisId, results);
        }

      } catch (error) {
        console.error("Analysis failed:", error);
        const failedAnalysis = activeAnalyses.get(analysisId);
        if (failedAnalysis) {
          failedAnalysis.status = "failed";
          failedAnalysis.error = error instanceof Error ? error.message : "Unknown error";
          activeAnalyses.set(analysisId, failedAnalysis);
        }
      }
    });

    res.json({ analysisId, status: "started" });

  } catch (error) {
    console.error("Error starting analysis:", error);
    res.status(500).json({ error: "Failed to start analysis" });
  }
});

// Get analysis status and progress
router.get("/api/profiler/analysis/:id/status", (req: Request, res: Response) => {
  const analysisId = req.params.id;
  const analysis = activeAnalyses.get(analysisId);
  
  if (!analysis) {
    return res.status(404).json({ error: "Analysis not found" });
  }

  res.json({
    id: analysis.id,
    status: analysis.status,
    progress: analysis.progress,
    results: analysis.results,
    error: analysis.error
  });
});

// Get analysis results
router.get("/api/profiler/analysis/:id/results", (req: Request, res: Response) => {
  const analysisId = req.params.id;
  const results = analysisResults.get(analysisId);
  
  if (!results) {
    return res.status(404).json({ error: "Results not found" });
  }

  res.json(results);
});

// Download analysis as text file
router.get("/api/profiler/analysis/:id/download", (req: Request, res: Response) => {
  const analysisId = req.params.id;
  const analysis = activeAnalyses.get(analysisId);
  
  if (!analysis || !analysis.results) {
    return res.status(404).json({ error: "Analysis not found" });
  }

  const results = analysis.results;
  let textContent = `Psychology Pro Analysis Report\n`;
  textContent += `=====================================\n\n`;
  textContent += `Analysis ID: ${analysis.id}\n`;
  textContent += `Type: ${analysis.analysisType}\n`;
  textContent += `LLM Provider: ${llmService.getProviderName(analysis.llmProvider)}\n`;
  textContent += `Date: ${new Date(analysis.createdAt).toLocaleString()}\n\n`;
  
  textContent += `Summary:\n${results.summary}\n\n`;
  textContent += `Category: ${results.category}\n\n`;
  textContent += `Overall Score: ${results.overallScore}/100\n\n`;
  textContent += `Detailed Analysis:\n${results.reasoning}\n\n`;
  
  if (results.questionResponses && results.questionResponses.length > 0) {
    textContent += `Question Responses:\n`;
    textContent += `==================\n\n`;
    results.questionResponses.forEach((response: any, index: number) => {
      textContent += `${index + 1}. ${response.question}\n`;
      textContent += `Answer: ${response.answer}\n`;
      textContent += `Score: ${response.score}/100\n\n`;
    });
  }
  
  textContent += `\n--- End of Analysis ---\n`;

  const filename = `psychology-pro-analysis-${analysisId}.txt`;
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(textContent);
});

// Get available LLM providers
router.get("/api/profiler/providers", (req: Request, res: Response) => {
  const availableProviders = llmService.getAvailableProviders();
  const providers = availableProviders.map(provider => ({
    id: provider,
    name: llmService.getProviderName(provider),
    available: llmService.isProviderAvailable(provider)
  }));

  res.json({ providers });
});

// Start discussion with analysis results
router.post("/api/profiler/analysis/:id/discuss", async (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const { message } = req.body;
    
    const analysis = activeAnalyses.get(analysisId);
    if (!analysis || !analysis.results) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Create discussion prompt
    const discussionPrompt = `
ORIGINAL ANALYSIS RESULTS:
${JSON.stringify(analysis.results, null, 2)}

USER MESSAGE:
${message}

Please respond to the user's message about the analysis. You can:
- Clarify aspects of the analysis
- Defend or revise your assessments
- Provide additional insights
- Answer questions about the methodology

Maintain the same analytical rigor and assessment standards used in the original analysis.
`;

    const response = await llmService.sendRequest(
      analysis.llmProvider,
      discussionPrompt,
      "You are discussing the results of a psychological/cognitive text analysis with the user. Be thorough and maintain your analytical standards."
    );

    const discussionId = nanoid();
    const discussion = {
      id: discussionId,
      analysisId,
      userMessage: message,
      assistantResponse: response,
      timestamp: new Date().toISOString()
    };

    // Store discussion (in production, you'd save to database)
    const analysisDiscussions = activeAnalyses.get(analysisId + "_discussions") || [];
    analysisDiscussions.push(discussion);
    activeAnalyses.set(analysisId + "_discussions", analysisDiscussions);

    res.json({
      discussionId,
      response,
      timestamp: discussion.timestamp
    });

  } catch (error) {
    console.error("Discussion error:", error);
    res.status(500).json({ error: "Failed to process discussion" });
  }
});

// Get discussion history
router.get("/api/profiler/analysis/:id/discussions", (req: Request, res: Response) => {
  const analysisId = req.params.id;
  const discussions = activeAnalyses.get(analysisId + "_discussions") || [];
  
  res.json({ discussions });
});

// Health check
router.get("/api/profiler/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    service: "Psychology Pro Profiler",
    timestamp: new Date().toISOString()
  });
});

export { router as profilerRouter };