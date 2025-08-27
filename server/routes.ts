import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { storage } from "./storage";
import { LLMService } from "./services/llm-service";
import { FileService } from "./services/file-service";
import { StreamingService } from "./services/streaming-service";
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

  // Enhanced Analysis Routes
  
  // Create enhanced analysis
  app.post("/api/enhanced-analyses", async (req, res) => {
    try {
      const enhancedAnalysisData = z.object({
        type: z.enum(["enhanced-cognitive-normal", "enhanced-cognitive-comprehensive", "enhanced-psychological-normal", "enhanced-psychological-comprehensive", "enhanced-psychopathological-normal", "enhanced-psychopathological-comprehensive"]),
        textContent: z.string(),
        additionalContext: z.string().optional(),
        llmProvider: z.enum(["zhi1", "zhi2", "zhi3", "zhi4"])
      }).parse(req.body);
      
      // Convert enhanced analysis to regular analysis for storage compatibility
      const analysisData = {
        type: "cognitive" as const, // Store as cognitive for now
        textContent: enhancedAnalysisData.textContent,
        additionalContext: enhancedAnalysisData.additionalContext || "",
        llmProvider: enhancedAnalysisData.llmProvider
      };
      
      const analysis = await storage.createAnalysis(analysisData);
      
      // Store the enhanced analysis type separately in the analysis results for reference
      analysis.results = JSON.stringify({ enhancedType: enhancedAnalysisData.type });
      analysis.type = enhancedAnalysisData.type; // Store enhanced type directly
      
      // Start enhanced streaming analysis in background
      streamingService.startEnhancedAnalysis(analysis.id, enhancedAnalysisData.type);
      
      res.json({ analysisId: analysis.id });
    } catch (error) {
      console.error("Create enhanced analysis error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid enhanced analysis data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create enhanced analysis" });
    }
  });

  // Stream enhanced analysis results
  app.get("/api/enhanced-analyses/:id/stream", (req, res) => {
    const analysisId = req.params.id;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: "connected", message: "Stream connected" })}\n\n`);

    // Add client to streaming service
    const removeClient = streamingService.addEnhancedClient(analysisId, res);
    
    req.on('close', removeClient);
    req.on('end', removeClient);
  });

  // Stop enhanced analysis
  app.delete("/api/enhanced-analyses/:id", async (req, res) => {
    try {
      streamingService.stopEnhancedAnalysis(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Stop enhanced analysis error:", error);
      res.status(500).json({ error: "Failed to stop enhanced analysis" });
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

  const httpServer = createServer(app);
  return httpServer;
}
