import { Router } from "express";
import { pdfUpload } from "../middleware/pdfUpload";
import path from "path";
import fs from "fs";

const router = Router();

router.post("/pdf", pdfUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "NO_FILE" });
  const id = path.basename(req.file.filename);
  res.json({ ok: true, id, path: `/uploads/${id}`, size: req.file.size, name: req.file.originalname });
});

router.get("/:id", (req, res) => {
  const fp = path.resolve("uploads", req.params.id);
  if (!fs.existsSync(fp)) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(fp);
});

export default router;