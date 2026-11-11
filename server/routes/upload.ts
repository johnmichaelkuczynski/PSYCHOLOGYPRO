import { Router } from "express";
import { pdfUpload } from "../middleware/pdfUpload";
import { storage } from "../storage";

const router = Router();

router.post("/pdf", pdfUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "NO_FILE" });
  try {
    const file = await storage.storeFile({
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      data: req.file.buffer,
    });
    res.json({
      ok: true,
      id: file.id,
      path: `/api/upload/${file.id}`,
      size: file.sizeBytes,
      name: file.originalName,
    });
  } catch (error) {
    console.error("PDF database storage failed:", error);
    res.status(500).json({ ok: false, error: "STORAGE_FAILED" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const file = await storage.getStoredFile(req.params.id);
    if (!file) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const safeName = file.originalName.replace(/[\r\n"]/g, "_");
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Length", String(file.sizeBytes));
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file.data);
  } catch (error) {
    console.error("PDF database retrieval failed:", error);
    res.status(500).json({ ok: false, error: "RETRIEVAL_FAILED" });
  }
});

export default router;