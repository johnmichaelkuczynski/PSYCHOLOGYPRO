import React, { useState } from "react";

export default function PdfUploader() {
  const [status, setStatus] = useState<string>("");
  const [filePath, setFilePath] = useState<string>("");

  async function handleUpload(f: File) {
    setStatus("Uploading...");
    const form = new FormData();
    form.append("file", f); // field name MUST be "file"
    const res = await fetch("/api/upload/pdf", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.path) {
      setStatus(`ERROR → ${data?.error || "UPLOAD_FAILED"}`);
      setFilePath("");
      return;
    }
    // Use absolute URL to avoid proxy/basePath issues on Replit
    const abs = `${window.location.origin}${data.path}`;
    setFilePath(abs);
    setStatus(`OK → ${abs}`);
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
        }}
      />
      <div>{status}</div>

      {filePath && (
        <>
          <a href={filePath} target="_blank" rel="noreferrer">Open PDF</a>
          <iframe
            title="pdf-preview"
            src={filePath}
            style={{ width: "100%", height: 480, border: "1px solid #ddd" }}
          />
        </>
      )}
    </div>
  );
}