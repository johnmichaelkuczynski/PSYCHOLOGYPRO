import { Router } from "express";
import { pdfUpload } from "../middleware/pdfUpload";
import fs from "fs";
import path from "path";

const router = Router();

// POST /api/upload/pdf  (field name: "file")
router.post("/pdf", pdfUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "NO_FILE" });
  // Minimal response; return file info + a one-time read URL
  const id = path.basename(req.file.filename);
  return res.json({
    ok: true,
    id,
    originalName: req.file.originalname,
    size: req.file.size,
    path: `/uploads/${id}`,
  });
});

// OPTIONAL: GET /api/upload/:id to download (keeps direct access simple)
router.get("/:id", (req, res) => {
  const fp = path.resolve("uploads", req.params.id);
  if (!fs.existsSync(fp)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.setHeader("Content-Type", "application/pdf");
  return res.sendFile(fp);
});

export default router;