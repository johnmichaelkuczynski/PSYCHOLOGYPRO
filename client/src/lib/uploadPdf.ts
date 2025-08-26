export async function uploadPdf(file: File): Promise<{ ok: boolean; path?: string; error?: string; id?: string; }> {
  const form = new FormData();
  form.append("file", file); // field name MUST be "file"

  const res = await fetch("/api/upload/pdf", {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok || !data.ok) return { ok: false, error: data.error || "UPLOAD_FAILED" };
  return { ok: true, id: data.id, path: data.path };
}