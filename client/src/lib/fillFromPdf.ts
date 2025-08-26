export async function extractPdfText(id: string): Promise<string> {
  const url = `/api/extract/${id}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || "EXTRACT_FAILED");
  return data.text as string;
}