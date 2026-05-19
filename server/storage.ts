import { type Analysis, type AnalysisSettings, type Discussion, type InsertAnalysis, type InsertAnalysisSettings, type InsertDiscussion, analyses, analysisSettings, discussions } from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  updateAnalysisStatus(id: string, status: string): Promise<void>;
  updateAnalysisResults(id: string, results: any): Promise<void>;
  markSaved(id: string): Promise<void>;
  
  // Discussion operations
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  getDiscussionsByAnalysisId(analysisId: string): Promise<Discussion[]>;
  
  // Recent analyses
  getRecentAnalyses(limit?: number): Promise<Analysis[]>;
  
  // Saved analyses
  getSavedAnalyses(userId?: number): Promise<Analysis[]>;

  // Analysis settings
  getAnalysisSetting(key: string): Promise<AnalysisSettings | undefined>;
  upsertAnalysisSetting(setting: InsertAnalysisSettings): Promise<AnalysisSettings>;
}

// Referenced from javascript_database integration
export class DatabaseStorage implements IStorage {
  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values(insertAnalysis)
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
    return await db
      .select()
      .from(analyses)
      .where(eq(analyses.saved, true))
      .orderBy(desc(analyses.createdAt));
  }

  async getAnalysisSetting(key: string): Promise<AnalysisSettings | undefined> {
    const [setting] = await db
      .select()
      .from(analysisSettings)
      .where(eq(analysisSettings.key, key));
    return setting || undefined;
  }

  async upsertAnalysisSetting(setting: InsertAnalysisSettings): Promise<AnalysisSettings> {
    const existing = await this.getAnalysisSetting(setting.key);
    if (existing) {
      const [updated] = await db
        .update(analysisSettings)
        .set({ value: setting.value, updatedAt: new Date() })
        .where(eq(analysisSettings.key, setting.key))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(analysisSettings)
      .values(setting)
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
