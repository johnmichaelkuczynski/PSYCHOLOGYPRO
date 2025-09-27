import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'cognitive', 'psychological', etc.
  textContent: text("text_content").notNull(),
  additionalContext: text("additional_context"),
  llmProvider: varchar("llm_provider").notNull(), // 'zhi1', 'zhi2', etc.
  status: varchar("status").notNull().default("pending"), // 'pending', 'streaming', 'completed', 'error'
  results: jsonb("results"), // Store the complete analysis results
  saved: boolean("saved").notNull().default(false), // Whether the analysis is saved by user
  userId: integer("user_id").references(() => users.id), // Links to user account when logged in
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const discussions = pgTable("discussions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").notNull(),
  message: text("message").notNull(),
  sender: varchar("sender").notNull(), // 'user' or 'system'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  type: true,
  textContent: true,
  additionalContext: true,
  llmProvider: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).pick({
  analysisId: true,
  message: true,
  sender: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type Discussion = typeof discussions.$inferSelect;

export const LLMProvider = z.enum(["zhi1", "zhi2", "zhi3", "zhi4"]);
export const AnalysisType = z.enum([
  "cognitive",
  "comprehensive-cognitive", 
  "microcognitive",
  "psychological",
  "comprehensive-psychological",
  "micropsychological",
  "psychopathological", 
  "comprehensive-psychopathological",
  "micropsychopathological"
]);

export type LLMProviderType = z.infer<typeof LLMProvider>;
export type AnalysisTypeType = z.infer<typeof AnalysisType>;
