import { useMemo, useState } from "react";
import { Download, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import reportHtml from "@assets/diagnostic-report_1779159142151.json?raw";

type Section = {
  title: string;
  items: {
    name: string;
    detail?: string;
    duration?: string;
    evidence?: string[];
  }[];
};

function parseSections(html: string): Section[] {
  const sections: Section[] = [];
  const sectionMatches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/g)];
  for (const match of sectionMatches) {
    const title = match[1].replace(/<[^>]+>/g, "").trim();
    const description = match[2].replace(/<[^>]+>/g, "").trim();
    const list = match[3];
    const items = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((li) => {
      const text = li[1].replace(/<[^>]+>/g, "").trim();
      return { name: text, detail: description };
    });
    if (title && items.length) sections.push({ title, items });
  }
  return sections;
}

export default function DiagnosticPage() {
  const reportUrl = "/diagnostic-2026-05-17T21-43-19-306Z.json";
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const sections = useMemo(() => parseSections(reportHtml), []);

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

        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium text-gray-900">Report loaded</span>
          </div>
          <div className="space-y-4">
            {sections.map((section) => {
              const expanded = openSections[section.title] ?? true;
              return (
                <div key={section.title} className="rounded-md border">
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setOpenSections((prev) => ({ ...prev, [section.title]: !expanded }))}
                  >
                    <span className="font-semibold text-gray-900">{section.title}</span>
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expanded && (
                    <div className="border-t px-4 py-3">
                      <ul className="space-y-3">
                        {section.items.map((item, index) => (
                          <li key={`${section.title}-${index}`} className="text-sm text-gray-700">
                            {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}