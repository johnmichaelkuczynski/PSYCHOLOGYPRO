import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import reportHtml from "@assets/diagnostic-report_1779159142151.json?raw";

type Row = { title: string; meta: string; evidence: string };
type Section = { title: string; subtitle: string; rows: Row[] };

function parseReport(html: string): Section[] {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const list = [...clean.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
  const rows = list.map((entry) => {
    const title = entry.replace(/^(Process|Functional):?\s*/i, "").trim();
    const meta = entry.match(/score=[\w-]+/i)?.[0] ?? entry.match(/id=[\w-]+/i)?.[0] ?? "";
    const evidence = entry.match(/evidence\s*\((\d+)\s*items?\)/i)?.[0] ?? "Show evidence";
    return { title, meta, evidence };
  });
  return [
    { title: "1. Synthetic Checks", subtitle: "Forensics and content-pattern checks", rows: rows.slice(0, 2) },
    { title: "2. Functional Check", subtitle: "End-to-end round-trip through the flow", rows: rows.slice(2, 6) },
    { title: "3. Evidence Review", subtitle: "Supporting evidence and trace details", rows: rows.slice(6) },
  ];
}

export default function DiagnosticPage() {
  const reportUrl = "/diagnostic-2026-05-17T21-43-19-306Z.json";
  const sections = useMemo(() => parseReport(reportHtml), []);
  const [open, setOpen] = useState<Record<string, boolean>>({});

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

        {sections.map((section) => {
          const expanded = open[section.title] ?? true;
          return (
            <div key={section.title} className="rounded-lg border bg-white">
              <button
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen((prev) => ({ ...prev, [section.title]: !expanded }))}
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.subtitle}</p>
                </div>
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {expanded && (
                <div className="border-t px-5 py-2">
                  {section.rows.map((row) => (
                    <div key={row.title} className="flex items-start justify-between gap-4 border-b py-4 last:border-b-0">
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