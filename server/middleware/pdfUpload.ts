import multer from "multer";
import path from "path";

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const okMime = file.mimetype === "application/pdf";
  const okExt = path.extname(file.originalname).toLowerCase() === ".pdf";
  if (okMime && okExt) return cb(null, true);
  cb(new Error("ONLY_PDF_ALLOWED"));
}

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fieldSize: 0 },
});