import React, { useState } from "react";

export default function PdfUploader({ onText }: { onText?: (t: string) => void }) {
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");

  async function handleFile(f: File) {
    setStatus("Uploading…");
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/upload/pdf", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) { setStatus(`ERROR: ${data?.error || "UPLOAD_FAILED"}`); return; }

    const abs = `${window.location.origin}${data.path}`;
    setUrl(abs);
    setStatus(`Uploaded: ${data.name} (${data.size} bytes)`);

    try {
      const ex = await fetch(`/api/extract/${data.id}`);
      const ej = await ex.json();
      if (ej?.ok && typeof ej.text === "string") onText?.(ej.text);
    } catch {}
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input type="file" accept="application/pdf" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}/>
      <div>{status}</div>
      {url && (<><a href={url} target="_blank" rel="noreferrer">Open PDF</a>
        <iframe title="pdf" src={url} style={{ width: "100%", height: 480, border: "1px solid #ddd" }}/></>)}
    </div>
  );
}