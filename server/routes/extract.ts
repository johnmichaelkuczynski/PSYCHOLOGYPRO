import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// GET /api/extract/:id  → returns { ok, text }
router.get("/:id", async (req, res) => {
  const fp = path.resolve("uploads", req.params.id);
  if (!fs.existsSync(fp)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  try {
    // For now, return a placeholder since we removed pdf-parse
    // This can be enhanced with proper PDF text extraction later
    const stats = fs.statSync(fp);
    res.json({ 
      ok: true, 
      text: `PDF file "${req.params.id}" (${Math.round(stats.size / 1024)}KB) uploaded successfully.\n\nTo analyze this PDF:\n1. Open the PDF using the link above\n2. Copy the text you want to analyze\n3. Paste it here and replace this message\n4. Select your analysis options below`,
      size: stats.size
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "EXTRACT_FAILED" });
  }
});

export default router;