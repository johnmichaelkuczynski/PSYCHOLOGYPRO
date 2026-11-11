import { type Analysis, type AnalysisSettings, type Discussion, type InsertAnalysis, type InsertAnalysisSettings, type InsertDiscussion, analyses, analysisSettings, discussions } from "../shared/schema";
import { db, pool } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface StoredFile {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  data: Buffer;
  createdAt: Date;
}

export interface NewStoredFile {
  originalName: string;
  contentType: string;
  data: Buffer;
}

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

  // Files persisted in PostgreSQL
  storeFile(file: NewStoredFile): Promise<StoredFile>;
  getStoredFile(id: string): Promise<StoredFile | undefined>;
}

// Referenced from javascript_database integration
export class DatabaseStorage implements IStorage {
  async storeFile(file: NewStoredFile): Promise<StoredFile> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO stored_files (id, original_name, content_type, size_bytes, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, original_name, content_type, size_bytes, data, created_at`,
      [id, file.originalName, file.contentType, file.data.length, file.data],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      originalName: row.original_name,
      contentType: row.content_type,
      sizeBytes: Number(row.size_bytes),
      data: row.data,
      createdAt: row.created_at,
    };
  }

  async getStoredFile(id: string): Promise<StoredFile | undefined> {
    const result = await pool.query(
      `SELECT id, original_name, content_type, size_bytes, data, created_at
       FROM stored_files WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      originalName: row.original_name,
      contentType: row.content_type,
      sizeBytes: Number(row.size_bytes),
      data: row.data,
      createdAt: row.created_at,
    };
  }

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
