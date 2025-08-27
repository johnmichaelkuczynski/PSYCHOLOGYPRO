import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { LLMService } from "./services/llm-service";
import { FileService } from "./services/file-service";
import { StreamingService } from "./services/streaming-service";
import { ComprehensiveAnalysisService } from "./services/comprehensive-analysis-service";
import { insertAnalysisSchema, insertDiscussionSchema } from "../shared/schema.js";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const llmService = new LLMService();
const fileService = new FileService();
const streamingService = new StreamingService(llmService, storage);
const comprehensiveAnalysisService = new ComprehensiveAnalysisService();

export async function registerRoutes(app: Express): Promise<Server> {
  // File parsing endpoint
  app.post("/api/files/parse", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      console.log("File upload received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Validate file first
      const validation = fileService.validateFile(req.file);
      if (!validation.valid) {
        console.log("File validation failed:", validation.error);
        return res.status(400).json({ error: validation.error });
      }

      const parseResult = await fileService.parseFile(req.file);
      res.json(parseResult);
    } catch (error) {
      console.error("File parsing error:", error);
      res.status(500).json({ 
        error: "Failed to parse file",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Comprehensive analysis streaming endpoint
  app.post("/api/comprehensive-analysis/stream", async (req, res) => {
    try {
      const { text, llmProvider } = req.body;
      
      if (!text || !llmProvider) {
        return res.status(400).json({ error: "Text and LLM provider are required" });
      }

      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Start comprehensive analysis
      await comprehensiveAnalysisService.streamComprehensiveAnalysis(
        { text, llmProvider },
        (data) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      );

      res.end();
    } catch (error) {
      console.error("Comprehensive analysis error:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  });

  // Create analysis
  app.post("/api/analyses", async (req, res) => {
    try {
      const analysisData = insertAnalysisSchema.parse(req.body);
      const analysis = await storage.createAnalysis(analysisData);
      
      // Start streaming analysis in background
      streamingService.startAnalysis(analysis.id);
      
      res.json({ analysisId: analysis.id });
    } catch (error) {
      console.error("Create analysis error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid analysis data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create analysis" });
    }
  });

  // Get analysis
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Failed to get analysis" });
    }
  });

  // Stop analysis
  app.delete("/api/analyses/:id", async (req, res) => {
    try {
      const analysisId = req.params.id;
      streamingService.stopAnalysis(analysisId);
      res.json({ message: "Analysis stopped" });
    } catch (error) {
      console.error("Stop analysis error:", error);
      res.status(500).json({ error: "Failed to stop analysis" });
    }
  });

  // Stream analysis results
  app.get("/api/analyses/:id/stream", (req, res) => {
    const analysisId = req.params.id;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Start streaming
    streamingService.streamAnalysis(analysisId, (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      streamingService.stopStreaming(analysisId);
    });
  });

  // Contest analysis (create new analysis based on feedback)
  app.post("/api/analyses/:id/contest", async (req, res) => {
    try {
      const originalAnalysis = await storage.getAnalysis(req.params.id);
      if (!originalAnalysis) {
        return res.status(404).json({ error: "Original analysis not found" });
      }

      const { contestMessage } = req.body;
      
      // Create new analysis with original text and contest feedback
      const newAnalysisData = {
        type: originalAnalysis.type,
        textContent: originalAnalysis.textContent,
        additionalContext: `${originalAnalysis.additionalContext || ''}\n\nUser feedback: ${contestMessage}`,
        llmProvider: originalAnalysis.llmProvider,
      };

      const newAnalysis = await storage.createAnalysis(newAnalysisData);
      streamingService.startAnalysis(newAnalysis.id);
      
      res.json({ analysisId: newAnalysis.id });
    } catch (error) {
      console.error("Contest analysis error:", error);
      res.status(500).json({ error: "Failed to contest analysis" });
    }
  });

  // Discussion endpoints
  app.post("/api/discussions", async (req, res) => {
    try {
      const discussionData = insertDiscussionSchema.parse(req.body);
      const discussion = await storage.createDiscussion(discussionData);
      res.json(discussion);
    } catch (error) {
      console.error("Create discussion error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid discussion data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create discussion" });
    }
  });

  app.get("/api/discussions/:analysisId", async (req, res) => {
    try {
      const discussions = await storage.getDiscussionsByAnalysisId(req.params.analysisId);
      res.json(discussions);
    } catch (error) {
      console.error("Get discussions error:", error);
      res.status(500).json({ error: "Failed to get discussions" });
    }
  });

  // Download analysis as TXT
  app.get("/api/analyses/:id/download", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const filename = `analysis_${analysis.id}_${new Date().toISOString().split('T')[0]}.txt`;
      const content = streamingService.formatAnalysisForDownload(analysis);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      console.error("Download analysis error:", error);
      res.status(500).json({ error: "Failed to download analysis" });
    }
  });

  // Comprehensive analysis endpoint
  app.post("/api/comprehensive-analysis", async (req, res) => {
    try {
      const { text, llmProvider } = req.body;
      
      if (!text || !llmProvider) {
        return res.status(400).json({ error: "Text and LLM provider are required" });
      }
      
      const result = await comprehensiveAnalysisService.runComprehensiveAnalysis({
        text,
        llmProvider
      });
      
      res.json(result);
    } catch (error) {
      console.error("Comprehensive analysis error:", error);
      res.status(500).json({ 
        error: "Failed to run comprehensive analysis",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Comprehensive analysis streaming endpoint
  app.post("/api/comprehensive-analysis/stream", (req, res) => {
    try {
      const { text, llmProvider } = req.body;
      
      if (!text || !llmProvider) {
        return res.status(400).json({ error: "Text and LLM provider are required" });
      }
      
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Start streaming comprehensive analysis
      (async () => {
        try {
          for await (const update of comprehensiveAnalysisService.streamComprehensiveAnalysis({
            text,
            llmProvider
          })) {
            res.write(`data: ${JSON.stringify(update)}\n\n`);
          }
          
          // Send completion signal
          res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
          res.end();
        } catch (error) {
          console.error("Streaming comprehensive analysis error:", error);
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : String(error) 
          })}\n\n`);
          res.end();
        }
      })();

      // Handle client disconnect
      req.on('close', () => {
        console.log("Client disconnected from comprehensive analysis stream");
      });
      
    } catch (error) {
      console.error("Comprehensive analysis stream setup error:", error);
      res.status(500).json({ 
        error: "Failed to start comprehensive analysis stream",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
