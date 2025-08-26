import { Router } from "express";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";

const router = Router();

router.get("/:id", async (req, res) => {
  const fp = path.resolve("uploads", req.params.id);
  if (!fs.existsSync(fp)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  try {
    const buf = fs.readFileSync(fp);
    const out = await pdfParse(buf);
    res.json({ ok: true, text: out.text || "" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "EXTRACT_FAILED" });
  }
});

export default router;