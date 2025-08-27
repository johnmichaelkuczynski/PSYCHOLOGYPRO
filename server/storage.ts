import { type Analysis, type Discussion, type InsertAnalysis, type InsertDiscussion } from "../shared/schema.js";
import { randomUUID } from "crypto";

export interface IStorage {
  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  updateAnalysisStatus(id: string, status: string): Promise<void>;
  updateAnalysisResults(id: string, results: any): Promise<void>;
  
  // Discussion operations
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  getDiscussionsByAnalysisId(analysisId: string): Promise<Discussion[]>;
  
  // Recent analyses
  getRecentAnalyses(limit?: number): Promise<Analysis[]>;
}

export class MemStorage implements IStorage {
  private analyses: Map<string, Analysis> = new Map();
  private discussions: Map<string, Discussion> = new Map();

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = randomUUID();
    const analysis: Analysis = {
      ...insertAnalysis,
      additionalContext: insertAnalysis.additionalContext || null,
      id,
      status: "pending",
      results: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAnalysis(id: string): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async updateAnalysisStatus(id: string, status: string): Promise<void> {
    const analysis = this.analyses.get(id);
    if (analysis) {
      analysis.status = status;
      analysis.updatedAt = new Date();
      this.analyses.set(id, analysis);
    }
  }

  async updateAnalysisResults(id: string, results: any): Promise<void> {
    const analysis = this.analyses.get(id);
    if (analysis) {
      analysis.results = results;
      analysis.updatedAt = new Date();
      this.analyses.set(id, analysis);
    }
  }

  async createDiscussion(insertDiscussion: InsertDiscussion): Promise<Discussion> {
    const id = randomUUID();
    const discussion: Discussion = {
      ...insertDiscussion,
      id,
      createdAt: new Date(),
    };
    this.discussions.set(id, discussion);
    return discussion;
  }

  async getDiscussionsByAnalysisId(analysisId: string): Promise<Discussion[]> {
    return Array.from(this.discussions.values())
      .filter(d => d.analysisId === analysisId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async getRecentAnalyses(limit: number = 10): Promise<Analysis[]> {
    return Array.from(this.analyses.values())
      .filter(a => a.status === "completed")
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
