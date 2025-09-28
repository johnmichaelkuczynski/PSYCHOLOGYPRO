import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bcrypt from "bcrypt";
import { z } from "zod";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db, pool } from "./db";
import { storage } from "./storage";
import { LLMService } from "./services/llm-service";
import { FileService } from "./services/file-service";
import { StreamingService } from "./services/streaming-service";
import { insertAnalysisSchema, insertDiscussionSchema, insertUserSchema, insertTransactionSchema, type User as DbUser } from "../shared/schema";
import Stripe from "stripe";
import { PRICING_TIERS } from "../client/src/data/pricing";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: Pick<DbUser, "id" | "username" | "credits">;
    }
  }
}

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

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Set up session store
const PgSession = connectPgSimple(session);

// Authentication middleware
async function authMiddleware(req: any, res: any, next: any) {
  try {
    const userId = (req.session as any)?.userId;
    if (userId) {
      const user = await storage.getUserById(userId);
      if (user) {
        req.user = { id: user.id, username: user.username, credits: user.credits ?? 0 };
      }
    }
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    next();
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });
      
      // Set session - ensure session exists
      if (!req.session) {
        console.error("Session not available in request");
        return res.status(500).json({ error: "Session initialization failed" });
      }
      
      (req.session as any).userId = user.id;
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Register error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid registration data", details: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string(),
      }).parse(req.body);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session - ensure session exists
      if (!req.session) {
        console.error("Session not available in request");
        return res.status(500).json({ error: "Session initialization failed" });
      }
      
      (req.session as any).userId = user.id;
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid login data", details: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/me", async (req, res) => {
    if (req.user) {
      res.json({ user: { id: req.user.id, username: req.user.username } });
    } else {
      res.json({ user: null });
    }
  });
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
      
      // Associate with logged-in user if available
      if (req.user) {
        analysisData.userId = req.user.id;
      }
      
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

  // Get saved analyses (user-specific if logged in, global otherwise)
  app.get("/api/analyses/saved", async (req, res) => {
    try {
      console.log("Attempting to get saved analyses...");
      const userId = req.user?.id;
      const savedAnalyses = await storage.getSavedAnalyses(userId);
      console.log("Found saved analyses:", savedAnalyses.length);
      res.json(savedAnalyses);
    } catch (error) {
      console.error("Get saved analyses error:", error);
      res.status(500).json({ error: "Failed to get saved analyses" });
    }
  });

  // Get user's analysis history (all analyses by user)
  app.get("/api/analyses/mine", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const userAnalyses = await storage.getAnalysesByUser(req.user.id);
      res.json(userAnalyses);
    } catch (error) {
      console.error("Get user analyses error:", error);
      res.status(500).json({ error: "Failed to get user analyses" });
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

  // Save analysis
  app.patch("/api/analyses/:id/save", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      await storage.markSaved(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Save analysis error:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    console.log("=== CREATE PAYMENT INTENT REQUEST ===");
    console.log("Request body:", req.body);
    console.log("User:", req.user);
    
    try {
      const { amount, llmProvider } = req.body;
      console.log("Extracted amount:", amount, "llmProvider:", llmProvider);
      
      if (!amount || !PRICING_TIERS.find(tier => tier.amount === amount)) {
        console.log("Amount validation failed. Available amounts:", PRICING_TIERS.map(t => t.amount));
        return res.status(400).json({ error: "Invalid amount" });
      }

      console.log("Creating Stripe PaymentIntent...");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user?.id?.toString() || 'anonymous',
          llmProvider: llmProvider || 'zhi1',
        },
      });
      
      console.log("PaymentIntent created successfully:", paymentIntent.id);
      console.log("Client secret length:", paymentIntent.client_secret?.length || 0);
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Payment intent error:", error);
      res.status(500).json({ error: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook handler
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_PSYCHOLOGYPRO;

      if (!webhookSecret) {
        console.error('Stripe webhook secret not configured');
        return res.status(400).send('Webhook secret not configured');
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = parseInt(paymentIntent.metadata.userId);
        const amount = paymentIntent.amount / 100; // Convert from cents
        const llmProvider = paymentIntent.metadata.llmProvider as 'zhi1' | 'zhi2' | 'zhi3' | 'zhi4';
        
        if (userId && !isNaN(userId)) {
          // Find the pricing tier
          const tier = PRICING_TIERS.find(t => t.amount === amount);
          if (tier && tier.credits[llmProvider]) {
            const credits = tier.credits[llmProvider];
            
            // Create transaction record
            await storage.createTransaction({
              userId,
              amount,
              credits,
              stripePaymentIntentId: paymentIntent.id,
            });
            
            // Update user credits
            const user = await storage.getUserById(userId);
            if (user) {
              const newCredits = (user.credits || 0) + credits;
              await storage.updateUserCredits(userId, newCredits);
            }
            
            // Update transaction status
            await storage.updateTransactionStatus(paymentIntent.id, 'completed');
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Get user credits
  app.get("/api/user/credits", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUserById(req.user.id);
      res.json({ credits: user?.credits || 0 });
    } catch (error) {
      console.error("Get credits error:", error);
      res.status(500).json({ error: "Failed to get credits" });
    }
  });

  // Get user transactions
  app.get("/api/user/transactions", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const transactions = await storage.getTransactionsByUser(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Failed to get transactions" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
