import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const base = path.parse(file.originalname).name.replace(/[^\w.-]/g, "_");
    cb(null, `${base}.${Date.now()}.pdf`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const okMime = file.mimetype === "application/pdf";
  const okExt = path.extname(file.originalname).toLowerCase() === ".pdf";
  if (okMime && okExt) return cb(null, true);
  cb(new Error("ONLY_PDF_ALLOWED"));
}

export const pdfUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fieldSize: 0 },
});