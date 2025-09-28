import { type Analysis, type Discussion, type InsertAnalysis, type InsertDiscussion, type User, type InsertUser, type Transaction, type InsertTransaction, analyses, discussions, users, transactions } from "../shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUserCredits(userId: number, credits: number): Promise<void>;
  updateUserStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: string): Promise<void>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  
  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  updateAnalysisStatus(id: string, status: string): Promise<void>;
  updateAnalysisResults(id: string, results: any): Promise<void>;
  updateAnalysisAIDetection(id: string, aiDetection: any): Promise<void>;
  markSaved(id: string): Promise<void>;
  
  // Discussion operations
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  getDiscussionsByAnalysisId(analysisId: string): Promise<Discussion[]>;
  
  // Recent analyses
  getRecentAnalyses(limit?: number): Promise<Analysis[]>;
  
  // Saved analyses
  getSavedAnalyses(userId?: number): Promise<Analysis[]>;
  
  // User-specific analyses
  getAnalysesByUser(userId: number): Promise<Analysis[]>;
  
  // Credit consumption
  consumeUserCredits(userId: number, creditsUsed: number): Promise<void>;
  checkUserCredits(userId: number, requiredCredits: number): Promise<boolean>;
}

// Referenced from javascript_database integration
export class DatabaseStorage implements IStorage {
  // User operations
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getAnalysesByUser(userId: number): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.userId, userId))
      .orderBy(desc(analyses.createdAt));
  }

  // User management methods
  async updateUserCredits(userId: number, credits: number): Promise<void> {
    await db
      .update(users)
      .set({ credits })
      .where(eq(users.id, userId));
  }

  async updateUserStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async updateTransactionStatus(id: string, status: string): Promise<void> {
    await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, id));
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    // Temporarily exclude aiDetection field until schema is synced
    const analysisData = {
      id: insertAnalysis.id,
      type: insertAnalysis.type,
      textContent: insertAnalysis.textContent,
      additionalContext: insertAnalysis.additionalContext,
      llmProvider: insertAnalysis.llmProvider,
      status: 'pending',
      results: null,
      saved: false,
      userId: insertAnalysis.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [analysis] = await db
      .insert(analyses)
      .values(analysisData)
      .returning();
    return analysis;
  }

  async getAnalysis(id: string): Promise<Analysis | undefined> {
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async updateAnalysisStatus(id: string, status: string): Promise<void> {
    await db
      .update(analyses)
      .set({ status, updatedAt: new Date() })
      .where(eq(analyses.id, id));
  }

  async updateAnalysisResults(id: string, results: any): Promise<void> {
    await db
      .update(analyses)
      .set({ results, updatedAt: new Date() })
      .where(eq(analyses.id, id));
  }

  async updateAnalysisAIDetection(id: string, aiDetection: any): Promise<void> {
    await db
      .update(analyses)
      .set({ aiDetection, updatedAt: new Date() })
      .where(eq(analyses.id, id));
  }

  async markSaved(id: string): Promise<void> {
    await db
      .update(analyses)
      .set({ saved: true, updatedAt: new Date() })
      .where(eq(analyses.id, id));
  }

  async createDiscussion(insertDiscussion: InsertDiscussion): Promise<Discussion> {
    const [discussion] = await db
      .insert(discussions)
      .values(insertDiscussion)
      .returning();
    return discussion;
  }

  async getDiscussionsByAnalysisId(analysisId: string): Promise<Discussion[]> {
    return await db
      .select()
      .from(discussions)
      .where(eq(discussions.analysisId, analysisId))
      .orderBy(discussions.createdAt);
  }

  async getRecentAnalyses(limit: number = 10): Promise<Analysis[]> {
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.status, "completed"))
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  }

  async getSavedAnalyses(userId?: number): Promise<Analysis[]> {
    // Select only existing columns to avoid aiDetection column error
    const selectFields = {
      id: analyses.id,
      type: analyses.type,
      textContent: analyses.textContent,
      additionalContext: analyses.additionalContext,
      llmProvider: analyses.llmProvider,
      status: analyses.status,
      results: analyses.results,
      saved: analyses.saved,
      userId: analyses.userId,
      createdAt: analyses.createdAt,
      updatedAt: analyses.updatedAt
    };
    
    if (userId !== undefined) {
      // Return user-specific saved analyses
      return await db
        .select(selectFields)
        .from(analyses)
        .where(eq(analyses.saved, true) && eq(analyses.userId, userId))
        .orderBy(desc(analyses.createdAt));
    } else {
      // Return global saved analyses (backwards compatibility)
      return await db
        .select(selectFields)
        .from(analyses)
        .where(eq(analyses.saved, true))
        .orderBy(desc(analyses.createdAt));
    }
  }
  
  // Credit management methods
  async consumeUserCredits(userId: number, creditsUsed: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const newCredits = Math.max(0, (user.credits || 0) - creditsUsed);
    await this.updateUserCredits(userId, newCredits);
  }
  
  async checkUserCredits(userId: number, requiredCredits: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      return false;
    }
    
    return (user.credits || 0) >= requiredCredits;
  }
}

export const storage = new DatabaseStorage();
