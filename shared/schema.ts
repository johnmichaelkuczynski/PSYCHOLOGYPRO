import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  credits: integer("credits").notNull().default(0), // User credit balance
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID
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
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }), // Optional user association
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

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Amount in dollars
  credits: integer("credits").notNull(), // Credits purchased
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(1),
  password: z.string().min(6),
}).pick({
  username: true,
  password: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  type: true,
  textContent: true,
  additionalContext: true,
  llmProvider: true,
  userId: true, // Optional user association
});

export const insertDiscussionSchema = createInsertSchema(discussions).pick({
  analysisId: true,
  message: true,
  sender: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  credits: true,
  stripePaymentIntentId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type Discussion = typeof discussions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

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
