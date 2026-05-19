import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import reportHtml from "@assets/diagnostic-report_1779159142151.json?raw";

type DiagnosticRow = { title: string; meta: string; evidence: string };
type DiagnosticSection = { title: string; subtitle: string; rows: DiagnosticRow[] };

function parseReport(html: string): DiagnosticSection[] {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const titles = [
    "1. Synthetic Checks",
    "2. Functional Check",
    "3. Evidence Review",
  ];
  const listMatches = [...text.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((li) =>
    li[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );

  const rows = listMatches.map((entry) => {
    const title = entry.replace(/^(Process|Functional):?\s*/i, "").trim();
    const metaMatch = entry.match(/score=([\w-]+)/i) ?? entry.match(/id=([\w-]+)/i);
    const meta = metaMatch ? metaMatch[0] : "verified";
    const evidenceMatch = entry.match(/evidence\s*\((\d+)\s*items?\)/i);
    const evidence = evidenceMatch ? `Show evidence (${evidenceMatch[1]} items)` : "Show evidence";
    return { title, meta, evidence };
  });

  return titles.map((title, index) => ({
    title,
    subtitle:
      index === 0
        ? "Forensics and content-pattern checks"
        : index === 1
          ? "End-to-end round-trip through the flow"
          : "Supporting evidence and trace details",
    rows: rows.slice(index * 4, index * 4 + 4),
  }));
}

export default function DiagnosticPage() {
  const reportUrl = "/diagnostic-2026-05-17T21-43-19-306Z.json";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const sections = useMemo(() => parseReport(reportHtml), []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnostic Report</h1>
            <p className="text-sm text-gray-600">On-screen view of the latest report.</p>
          </div>
          <Button asChild>
            <a href={reportUrl} download="diagnostic-report.json">
              <Download className="mr-2 h-4 w-4" />
              Download full report (json)
            </a>
          </Button>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Report loaded
          </div>
        </div>

        {sections.map((section, i) => {
          const key = `${section.heading}-${i}`;
          const expanded = open[key] ?? true;
          return (
            <div key={key} className="rounded-lg border bg-white">
              <button
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen((prev) => ({ ...prev, [key]: !expanded }))}
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.subtitle}</p>
                </div>
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {expanded && (
                <div className="border-t px-5 py-2">
                  {section.rows.map((row, idx) => (
                    <div key={`${row.title}-${idx}`} className="flex items-start justify-between gap-4 border-b py-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-gray-900">{row.title}</div>
                          <div className="text-sm text-gray-500">{row.evidence}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">{row.meta}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}