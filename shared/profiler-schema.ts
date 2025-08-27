import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Analysis modes
export const analysisTypes = [
  "cognitive_short",
  "cognitive_long", 
  "psychological_short",
  "psychological_long",
  "psychopathological_short",
  "psychopathological_long"
] as const;

export type AnalysisType = typeof analysisTypes[number];

// LLM providers (aliased as ZHI 1-4)
export const llmProviders = [
  "zhi1", // OpenAI
  "zhi2", // Anthropic  
  "zhi3", // DeepSeek
  "zhi4"  // Perplexity
] as const;

export type LLMProvider = typeof llmProviders[number];

// Text chunk for analysis
export interface TextChunk {
  id: number;
  content: string;
  wordCount: number;
  selected: boolean;
}

// Analysis results table
export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  analysisType: text("analysis_type").notNull(),
  llmProvider: text("llm_provider").notNull(),
  textContent: text("text_content").notNull(),
  selectedChunks: jsonb("selected_chunks"),
  results: jsonb("results"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses);
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

// Discussion messages for post-analysis dialogue
export const discussions = pgTable("discussions", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscussionSchema = createInsertSchema(discussions);
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type Discussion = typeof discussions.$inferSelect;

// Question sets for each analysis type
export interface QuestionSet {
  questions: string[];
  instructions: string[];
  metapoints: string[];
}

// Response structure from LLM
export interface AnalysisResponse {
  summary: string;
  category: string;
  questionResponses: Array<{
    question: string;
    answer: string;
    score: number;
  }>;
  overallScore: number;
  reasoning: string;
}

// Streaming response structure
export interface StreamChunk {
  type: "progress" | "result" | "error" | "complete";
  data: any;
  phase?: number;
  total?: number;
}