import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DiagnosticPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnostic Report</h1>
            <p className="text-sm text-gray-600">On-screen view of the latest report.</p>
          </div>
          <Button asChild>
            <a href="/diagnostic-2026-05-17T21-43-19-306Z.json" download="diagnostic-report.json">
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

        <div className="rounded-lg border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">1. Synthetic Checks</h2>
            <p className="text-sm text-gray-500">Forensics and content-pattern checks</p>
          </div>
          <div className="divide-y">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Process forensics: synthetic transcription scores likelyAI (≥70)</div>
                <div className="text-sm text-gray-500">score=71 class=likelyAI flags=6</div>
                <div className="text-sm text-gray-500">Show evidence (9 items)</div>
              </div>
              <div className="text-sm text-gray-500">0ms</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Process forensics: synthetic composition scores human (&lt;35)</div>
                <div className="text-sm text-gray-500">score=10 class=human</div>
                <div className="text-sm text-gray-500">Show evidence (8 items)</div>
              </div>
              <div className="text-sm text-gray-500">0ms</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">2. Functional Check</h2>
            <p className="text-sm text-gray-500">End-to-end round-trip of the student flow with a temporary Diagnostic Bot user (cleaned up automatically).</p>
          </div>
          <div className="divide-y">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Functional: create synthetic student</div>
                <div className="text-sm text-gray-500">id=2</div>
                <div className="text-sm text-gray-500">Show evidence (4 items)</div>
              </div>
              <div className="text-sm text-gray-500">39ms</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Functional: integrity acknowledgment writes</div>
                <div className="text-sm text-gray-500">Show evidence (4 items)</div>
              </div>
              <div className="text-sm text-gray-500">71ms</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Functional: draft round-trip + lock</div>
                <div className="text-sm text-gray-500">id=2</div>
                <div className="text-sm text-gray-500">Show evidence (4 items)</div>
              </div>
              <div className="text-sm text-gray-500">64ms</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Functional: canvas autosave round-trip</div>
                <div className="text-sm text-gray-500">Show evidence (4 items)</div>
              </div>
              <div className="text-sm text-gray-500">93ms</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="font-semibold text-gray-900">Functional: submit module 1</div>
                <div className="text-sm text-gray-500">Show evidence (4 items)</div>
              </div>
              <div className="text-sm text-gray-500">60ms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}