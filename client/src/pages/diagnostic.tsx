import { useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DiagnosticPage() {
  const reportUrl = "/diagnostic-2026-05-17T21-43-19-306Z.json";
  const downloadName = useMemo(() => "diagnostic-report.json", []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnostic</h1>
            <p className="text-sm text-gray-600">Download the latest report for review.</p>
          </div>
          <Button asChild>
            <a href={reportUrl} download={downloadName} data-testid="download-report-button">
              <Download className="mr-2 h-4 w-4" />
              Download full report (json)
            </a>
          </Button>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">
          <p>Use the download button to save the diagnostic report.</p>
        </div>
      </div>
    </div>
  );
}