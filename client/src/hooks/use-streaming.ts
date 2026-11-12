import { useState, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export interface StreamData {
  type: "summary" | "batch" | "question" | "delay" | "complete" | "error" | "streaming_response" | "stopped" | "raw_stream" | "batch_complete";
  content?: string;
  batchNumber?: number;
  questions?: any[];
  questionIndex?: number;
  progress?: number;
  error?: string;
  rawContent?: string;
  finalRawResponse?: string;
  message?: string;
  [key: string]: any;
}

export function useStreaming(
  analysisId: string | null,
  isPaused: boolean = false,
  onData?: (data: StreamData) => void
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "open" | "reconnecting" | "closed">("closed");
  const [connectionVersion, setConnectionVersion] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!analysisId || isPaused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      }
      setConnectionState("closed");
      return;
    }

    // Create EventSource for streaming
    const eventSource = new EventSource(`/api/analyses/${analysisId}/stream`);
    eventSourceRef.current = eventSource;
    setIsStreaming(true);
    setStreamData(null);
    setError(null);
    setConnectionState("connecting");

    eventSource.onopen = () => {
      setConnectionState("open");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamData;
        const message = { ...data, analysisId };
        // Deliver every event directly. A single "latest event" state can lose
        // text when React batches a burst of chunks with the completion event.
        onDataRef.current?.(message);
        setStreamData(message);

        if (data.type === "complete" || data.type === "error" || data.type === "stopped") {
          setIsStreaming(false);
          setConnectionState("closed");
          eventSource.close();
          eventSourceRef.current = null;
        }

        if (data.type === "complete") {
          trackEvent("analysis_completed");
        }

        if (data.type === "error") {
          trackEvent("analysis_failed", { failure_stage: "stream" });
          setError(new Error(data.error || "Stream error occurred"));
        }
      } catch (err) {
        console.error("Error parsing stream data:", err);
        setError(new Error("Failed to parse stream data"));
      }
    };

    eventSource.onerror = () => {
      // EventSource reconnects automatically after temporary network/proxy
      // interruptions. Closing it here used to leave an endless blank result.
      if (eventSource.readyState === EventSource.CLOSED) {
        setError(new Error("The live connection closed before the analysis finished."));
        setIsStreaming(false);
        setConnectionState("closed");
      } else {
        setConnectionState("reconnecting");
      }
    };

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (eventSourceRef.current === eventSource) eventSourceRef.current = null;
    };
  }, [analysisId, isPaused, connectionVersion]);

  const pauseStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
      setConnectionState("closed");
    }
  };

  const resumeStream = () => {
    if (analysisId && !eventSourceRef.current) {
      setConnectionVersion(version => version + 1);
    }
  };

  return {
    isStreaming,
    streamData,
    error,
    connectionState,
    pauseStream,
    resumeStream,
  };
}
