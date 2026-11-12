import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Minus, Move, Plus, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LiveOutputStatus =
  | "connecting"
  | "reconnecting"
  | "waiting"
  | "streaming"
  | "complete"
  | "paused"
  | "stopped"
  | "error";

interface LiveOutputPanelProps {
  content: string;
  stage: string;
  status: LiveOutputStatus;
  error?: string;
}

const statusLabels: Record<LiveOutputStatus, string> = {
  connecting: "Connecting to the live stream",
  reconnecting: "Reconnecting — output will continue here",
  waiting: "Waiting for the model’s first words",
  streaming: "Words streaming as they arrive",
  complete: "Analysis complete",
  paused: "Live display paused",
  stopped: "Analysis stopped",
  error: "Analysis could not continue",
};

export default function LiveOutputPanel({ content, stage, status, error }: LiveOutputPanelProps) {
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    const node = contentRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [content, error, collapsed]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const bounds = panelRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    setPosition({ left: bounds.left, top: bounds.top });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePanel = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = panelRef.current?.getBoundingClientRect();
    if (!drag || !bounds) return;
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - bounds.width - 8, event.clientX - drag.offsetX)),
      top: Math.max(8, Math.min(window.innerHeight - bounds.height - 8, event.clientY - drag.offsetY)),
    });
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  if (!visible) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-[70] shadow-lg"
        onClick={() => setVisible(true)}
        data-testid="show-live-output"
      >
        <Radio className="mr-2 h-4 w-4" />
        Show live output
      </Button>
    );
  }

  const active = ["connecting", "reconnecting", "waiting", "streaming"].includes(status);

  return (
    <section
      ref={panelRef}
      aria-label="Live analysis output"
      className="fixed z-[70] flex flex-col overflow-hidden rounded-lg border border-blue-200 bg-white shadow-2xl"
      style={{
        ...(position || { right: 16, bottom: 16 }),
        width: 460,
        height: collapsed ? 58 : 340,
        minWidth: 280,
        minHeight: collapsed ? 58 : 160,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100vh - 16px)",
        resize: collapsed ? "horizontal" : "both",
      }}
      data-testid="live-output-panel"
    >
      <div
        className="flex shrink-0 cursor-move touch-none select-none items-center gap-2 border-b border-blue-100 bg-blue-50 px-3 py-2"
        onPointerDown={startDrag}
        onPointerMove={movePanel}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <Move className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900">Live analysis · {stage}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600" aria-live="polite">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "animate-pulse bg-blue-600" : status === "error" ? "bg-red-500" : "bg-green-600"}`} />
            <span>{statusLabels[status]}</span>
          </div>
        </div>
        <button
          type="button"
          className="rounded p-1 text-gray-600 hover:bg-blue-100"
          aria-label={collapsed ? "Expand live output" : "Collapse live output"}
          onPointerDown={event => event.stopPropagation()}
          onClick={() => setCollapsed(value => !value)}
        >
          {collapsed ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="rounded p-1 text-gray-600 hover:bg-blue-100"
          aria-label="Hide live output without stopping analysis"
          onPointerDown={event => event.stopPropagation()}
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && (
        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="live-output-content">
          {content ? (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
              {content}
              {active && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-600 align-middle" />}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {active
                ? "This window shows each new word as the model sends it. You do not have to wait for the full analysis."
                : "No words were received."}
            </p>
          )}
          {error && <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </section>
  );
}
