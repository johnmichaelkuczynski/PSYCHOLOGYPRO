import { Router } from "express";
import pdfParse from "pdf-parse";
import { storage } from "../storage";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const file = await storage.getStoredFile(req.params.id);
    if (!file) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (file.contentType !== "application/pdf") {
      return res.status(415).json({ ok: false, error: "NOT_A_PDF" });
    }
    const out = await pdfParse(file.data);
    res.json({ ok: true, text: out.text || "" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "EXTRACT_FAILED" });
  }
});

export default router;