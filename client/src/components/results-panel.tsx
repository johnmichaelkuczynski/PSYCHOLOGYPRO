import { useState, useEffect } from "react";
import { Brain, MessageCircle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useStreaming } from "@/hooks/use-streaming";

interface ResultsPanelProps {
  analysisId: string | null;
  onDiscussionToggle: () => void;
}

interface QuestionResponse {
  question: string;
  response: string;
  score: number;
  isComplete: boolean;
}

interface BatchData {
  batchNumber: number;
  questions: QuestionResponse[];
  isComplete: boolean;
  timestamp: string;
}

export default function ResultsPanel({ analysisId, onDiscussionToggle }: ResultsPanelProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches] = useState(4); // 18 questions / 5 per batch = 4 batches (rounded)
  const [summary, setSummary] = useState("");
  const [delayProgress, setDelayProgress] = useState(0);
  const [streamingContent, setStreamingContent] = useState<{[key: number]: string}>({});
  
  const { isStreaming, streamData, error } = useStreaming(analysisId, isPaused);

  useEffect(() => {
    if (streamData) {
      if (streamData.type === "summary") {
        setSummary(streamData.content || "");
      } else if (streamData.type === "streaming_response") {
        // Show raw streaming content immediately
        if (streamData.batchNumber && streamData.rawContent) {
          setStreamingContent(prev => ({
            ...prev,
            [streamData.batchNumber!]: streamData.rawContent!
          }));
          setCurrentBatch(streamData.batchNumber);
        }
      } else if (streamData.type === "batch") {
        if (streamData.batchNumber && streamData.questions) {
          setBatches(prev => {
            const existingBatch = prev.find(b => b.batchNumber === streamData.batchNumber);
            const batchData: BatchData = {
              batchNumber: streamData.batchNumber!,
              questions: streamData.questions!,
              isComplete: streamData.isComplete || false,
              timestamp: streamData.timestamp || new Date().toLocaleTimeString()
            };
            if (existingBatch) {
              return prev.map(b => b.batchNumber === streamData.batchNumber 
                ? batchData
                : b
              );
            }
            return [...prev, batchData];
          });
          // Clear streaming content when batch is complete
          if (streamData.isComplete) {
            setStreamingContent(prev => {
              const newState = { ...prev };
              delete newState[streamData.batchNumber!];
              return newState;
            });
          }
        }
        if (streamData.batchNumber) {
          setCurrentBatch(streamData.batchNumber);
        }
      } else if (streamData.type === "delay") {
        if (streamData.progress !== undefined) {
          setDelayProgress(streamData.progress);
        }
      }
    }
  }, [streamData]);

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "high";
    if (score >= 60) return "medium";
    return "low";
  };

  if (!analysisId) {
    return (
      <div className="flex flex-col bg-white" data-testid="results-panel">
        {/* Results Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
          </div>
        </div>

        {/* Welcome State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12" data-testid="welcome-state">
            <Brain className="mx-auto text-gray-300 mb-4" size={64} />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Ready for Analysis</h4>
            <p className="text-gray-600">
              Upload a document or paste text to begin cognitive analysis. 
              Results will stream here in real-time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white" data-testid="results-panel">
      {/* Results Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
          <div className="flex items-center space-x-2">
            {isStreaming && (
              <div className="flex items-center space-x-2" data-testid="streaming-status">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-gray-600">
                  Processing batch {currentBatch} of {totalBatches}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              data-testid="toggle-stream-button"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Streaming Results Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6" data-testid="streaming-results">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              Error: {error.message}
            </div>
          )}

          {/* Text Summary */}
          {summary && (
            <div className="bg-blue-50 border-l-4 border-primary p-4 rounded-r-md mb-6" data-testid="text-summary">
              <h4 className="font-medium text-gray-900 mb-2">Text Summary & Categorization</h4>
              <div className="text-sm text-gray-700 leading-relaxed">
                <div className={`streaming-text ${summary ? 'complete' : ''}`}>
                  {summary}
                </div>
              </div>
            </div>
          )}

          {/* Real-time Streaming Content */}
          {Object.entries(streamingContent).map(([batchNumber, content]) => (
            <div key={`streaming-${batchNumber}`} className="analysis-batch" data-testid={`streaming-batch-${batchNumber}`}>
              <div className="flex items-center space-x-2 mb-3">
                <h4 className="font-medium text-gray-900">Batch {batchNumber} - Live Response</h4>
                <div className="flex-1 h-px bg-gray-200"></div>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
              
              <div className="question-card">
                <div className="text-sm text-gray-700 leading-relaxed">
                  <div className="streaming-text font-mono whitespace-pre-wrap">
                    {content}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Question Batches */}
          <div className="space-y-6">
            {batches.map((batch) => (
              <div key={batch.batchNumber} className="analysis-batch" data-testid={`batch-${batch.batchNumber}`}>
                <div className="flex items-center space-x-2 mb-3">
                  <h4 className="font-medium text-gray-900">Batch {batch.batchNumber} - Final Results</h4>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-500">{batch.timestamp}</span>
                </div>
                
                <div className="space-y-4">
                  {batch.questions.map((q, idx) => (
                    <div key={idx} className="question-card" data-testid={`question-${batch.batchNumber}-${idx}`}>
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                            Q
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-2">{q.question}</p>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div className={`streaming-text ${q.isComplete ? 'complete' : ''}`}>
                              {q.response}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center space-x-4">
                            {q.score > 0 && (
                              <Badge 
                                className={`score-badge ${getScoreVariant(q.score)}`}
                                data-testid={`score-${batch.batchNumber}-${idx}`}
                              >
                                Score: {q.score}/100
                              </Badge>
                            )}
                            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                              View Quotations
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Batch Delay Indicator */}
                {!batch.isComplete && batch.batchNumber < totalBatches && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md" data-testid="delay-indicator">
                    <div className="flex items-center">
                      <span className="text-sm text-yellow-800 mr-3">
                        Waiting 10 seconds before next batch...
                      </span>
                      <div className="flex-1">
                        <Progress value={delayProgress} className="h-2" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Discussion Panel Toggle */}
      <div className="border-t border-gray-200 p-4">
        <Button
          className="w-full"
          variant="outline"
          onClick={onDiscussionToggle}
          data-testid="discuss-analysis-button"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Discuss This Analysis
        </Button>
      </div>
    </div>
  );
}
