import { useState, useEffect, useRef } from "react";

interface StreamData {
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

export function useStreaming(analysisId: string | null, isPaused: boolean = false) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!analysisId || isPaused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      }
      return;
    }

    // Create EventSource for streaming
    const eventSource = new EventSource(`/api/analyses/${analysisId}/stream`);
    eventSourceRef.current = eventSource;
    setIsStreaming(true);
    setError(null);

    eventSource.onopen = () => {
      console.log("Stream opened");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamData;
        setStreamData(data);

        if (data.type === "complete" || data.type === "error") {
          setIsStreaming(false);
          eventSource.close();
        }

        if (data.type === "error") {
          setError(new Error(data.error || "Stream error occurred"));
        }
      } catch (err) {
        console.error("Error parsing stream data:", err);
        setError(new Error("Failed to parse stream data"));
      }
    };

    eventSource.onerror = (event) => {
      console.error("Stream error:", event);
      setError(new Error("Stream connection error"));
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [analysisId, isPaused]);

  const pauseStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  };

  const resumeStream = () => {
    if (analysisId && !eventSourceRef.current) {
      // Reinitialize streaming
      useStreaming(analysisId, false);
    }
  };

  return {
    isStreaming,
    streamData,
    error,
    pauseStream,
    resumeStream,
  };
}
