import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, MessageCircle, X, Pause, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResultsPanelProps {
  analysisId: string | null;
  onDiscussionToggle: () => void;
  onNewAnalysis: () => void;
}

interface StreamData {
  type: string;
  phase?: number;
  batch?: number;
  question?: string;
  answer?: string;
  score?: number;
  summary?: string;
  category?: string;
  progress?: number;
  error?: string;
  message?: string;
}

export default function EnhancedResultsPanel({ analysisId, onDiscussionToggle, onNewAnalysis }: ResultsPanelProps) {
  const [batches, setBatches] = useState<Array<{ question: string; answer: string; score: number }>>([]);
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [currentBatch, setCurrentBatch] = useState(1);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [delayProgress, setDelayProgress] = useState(0);
  const [isStopped, setIsStopped] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!analysisId) {
      return;
    }

    console.log("Stream opened");
    const eventSource = new EventSource(`/api/enhanced-analyses/${analysisId}/stream`);
    setIsStreaming(true);

    eventSource.onmessage = (event) => {
      try {
        const data: StreamData = JSON.parse(event.data);
        
        switch (data.type) {
          case "phase_start":
            setCurrentPhase(data.phase || 1);
            break;
            
          case "batch_start":
            setCurrentBatch(data.batch || 1);
            break;

          case "question":
            if (data.question) {
              setStreamingContent(prev => ({
                ...prev,
                [`question_${currentBatch}`]: data.question || ""
              }));
            }
            break;

          case "answer_chunk":
            if (data.answer) {
              setStreamingContent(prev => ({
                ...prev,
                [`answer_${currentBatch}`]: (prev[`answer_${currentBatch}`] || "") + data.answer
              }));
            }
            break;

          case "batch_complete":
            if (data.question && data.answer && typeof data.score === 'number') {
              setBatches(prev => [...prev, {
                question: data.question,
                answer: data.answer,
                score: data.score
              }]);
              
              setStreamingContent(prev => {
                const newContent = { ...prev };
                delete newContent[`question_${currentBatch}`];
                delete newContent[`answer_${currentBatch}`];
                return newContent;
              });
            }
            break;

          case "summary":
            if (data.summary) {
              setSummary(data.summary);
            }
            if (data.category) {
              setCategory(data.category);
            }
            break;

          case "delay":
            setDelayProgress(data.progress || 0);
            break;

          case "complete":
            setIsStreaming(false);
            eventSource.close();
            break;

          case "error":
            console.error("Stream error:", data.error);
            setIsStreaming(false);
            eventSource.close();
            break;

          case "stopped":
            setIsStopped(true);
            setIsStreaming(false);
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error("Error parsing stream data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [analysisId, currentBatch]);

  const stopAnalysis = async () => {
    if (!analysisId) return;
    
    try {
      await fetch(`/api/enhanced-analyses/${analysisId}`, {
        method: 'DELETE',
      });
      setIsStopped(true);
    } catch (error) {
      console.error("Error stopping analysis:", error);
    }
  };

  const handleClearAnalysis = () => {
    setBatches([]);
    setCurrentPhase(1);
    setSummary("");
    setCategory("");
    setStreamingContent({});
    setCurrentBatch(1);
    setDelayProgress(0);
    setIsStopped(false);
    onNewAnalysis();
  };

  if (!analysisId) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center" data-testid="results-panel">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Enhanced Analysis</h3>
          <p className="text-gray-600 max-w-md">
            Upload a document or paste text to begin enhanced cognitive analysis. Results will stream here in real-time with the new 4-phase comprehensive protocol.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 flex flex-col" data-testid="results-panel">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Enhanced Analysis Results</h2>
        <div className="flex items-center space-x-2">
          {isStreaming && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopAnalysis}
              data-testid="stop-analysis-button"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop Analysis
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscussionToggle}
            disabled={batches.length === 0}
            data-testid="discuss-results-button"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Discuss Results
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAnalysis}
            data-testid="new-analysis-button"
          >
            <Brain className="h-4 w-4 mr-2" />
            NEW ANALYSIS
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Phase Indicator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Enhanced Protocol Progress</span>
              <Badge variant={currentPhase === 4 ? "default" : "secondary"}>
                Phase {currentPhase}/4
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Phase 1: Direct Questions</span>
                <span className={currentPhase >= 1 ? "text-green-600" : ""}>
                  {currentPhase >= 1 ? "✓" : "○"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Phase 2: Pushback Protocol</span>
                <span className={currentPhase >= 2 ? "text-green-600" : ""}>
                  {currentPhase >= 2 ? "✓" : currentPhase === 2 ? "⟳" : "○"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Phase 3: Walmart Metric</span>
                <span className={currentPhase >= 3 ? "text-green-600" : ""}>
                  {currentPhase >= 3 ? "✓" : currentPhase === 3 ? "⟳" : "○"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Phase 4: Final Validation</span>
                <span className={currentPhase >= 4 ? "text-green-600" : ""}>
                  {currentPhase >= 4 ? "✓" : currentPhase === 4 ? "⟳" : "○"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {summary && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary & Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {category && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Category: </span>
                    <Badge variant="outline">{category}</Badge>
                  </div>
                )}
                <p className="text-sm text-gray-700">{summary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streaming Content */}
        {Object.entries(streamingContent).map(([key, content]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {key.startsWith('question_') ? 'Question' : 'Answer'} (Streaming...)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {content}
                <span className="animate-pulse">|</span>
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Completed Batches */}
        {batches.map((batch, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Question {index + 1}</span>
                <Badge 
                  variant={batch.score >= 95 ? "default" : batch.score >= 80 ? "secondary" : "destructive"}
                >
                  {batch.score}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Question:</h4>
                  <p className="text-sm text-gray-700">{batch.question}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Analysis:</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{batch.answer}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Delay Progress */}
        {delayProgress > 0 && delayProgress < 100 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing next batch...</span>
                  <span>{Math.round(delayProgress)}%</span>
                </div>
                <Progress value={delayProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stopped Message */}
        {isStopped && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Pause className="h-4 w-4" />
                <span className="text-sm font-medium">Analysis stopped by user</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}