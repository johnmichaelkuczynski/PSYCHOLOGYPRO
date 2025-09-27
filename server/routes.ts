import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { LLMService } from "./services/llm-service";
import { FileService } from "./services/file-service";
import { StreamingService } from "./services/streaming-service";
import { insertAnalysisSchema, insertDiscussionSchema } from "../shared/schema.js";
import { setupAuth } from "./auth";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication (register, login, logout, user routes)
  setupAuth(app);

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

  // Create analysis
  app.post("/api/analyses", async (req, res) => {
    try {
      const analysisData = insertAnalysisSchema.parse(req.body);
      // Pass user ID if authenticated
      const userId = (req.user as any)?.id;
      const analysis = await storage.createAnalysis(analysisData, userId);
      
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

  // Get saved analyses (must come before parameterized route)
  app.get("/api/analyses/saved", async (req, res) => {
    try {
      console.log("Attempting to get saved analyses...");
      let savedAnalyses;
      
      // If user is authenticated, get their personal saved analyses
      if ((req.user as any)?.id) {
        console.log("Getting user-specific saved analyses for user:", (req.user as any).id);
        savedAnalyses = await storage.getUserSavedAnalyses((req.user as any).id);
      } else {
        // For non-authenticated users, get global saved analyses (backwards compatibility)
        console.log("Getting global saved analyses for non-authenticated user");
        savedAnalyses = await storage.getSavedAnalyses();
      }
      
      console.log("Found saved analyses:", savedAnalyses.length);
      res.json(savedAnalyses);
    } catch (error) {
      console.error("Get saved analyses error:", error);
      res.status(500).json({ error: "Failed to get saved analyses" });
    }
  });

  // Get analysis
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      // User authorization check: Only the analysis owner can access it
      const userId = (req.user as any)?.id;
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
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
  app.get("/api/analyses/:id/stream", async (req, res) => {
    const analysisId = req.params.id;
    
    try {
      // User authorization check: Only the analysis owner can stream it
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      const userId = (req.user as any)?.id;
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
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
    } catch (error) {
      console.error("Stream authorization error:", error);
      res.status(500).json({ error: "Failed to authorize stream access" });
    }
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

      // Pass user ID if authenticated
      const userId = (req.user as any)?.id;
      const newAnalysis = await storage.createAnalysis(newAnalysisData, userId);
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

  // Save analysis
  app.patch("/api/analyses/:id/save", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // User authorization check: Only the analysis owner can save it
      const userId = (req.user as any)?.id;
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Pass user ID if authenticated to associate saved analysis with user
      await storage.markSaved(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Save analysis error:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
