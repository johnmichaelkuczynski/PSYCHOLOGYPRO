import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComprehensiveResultsPanelProps {
  analysisId: string;
  results: Record<string, string> | null;
  isAnalyzing: boolean;
  onNewAnalysis: () => void;
}

export default function ComprehensiveResultsPanel({
  analysisId,
  results,
  isAnalyzing,
  onNewAnalysis
}: ComprehensiveResultsPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const analysisTypes = [
    { key: "cognitiveShort", label: "Cognitive Short", color: "bg-blue-100 text-blue-800" },
    { key: "cognitiveLong", label: "Cognitive Long", color: "bg-blue-100 text-blue-800" },
    { key: "psychologicalShort", label: "Psychological Short", color: "bg-green-100 text-green-800" },
    { key: "psychologicalLong", label: "Psychological Long", color: "bg-green-100 text-green-800" },
    { key: "psychopathologyShort", label: "Psychopathology Short", color: "bg-red-100 text-red-800" },
    { key: "psychopathologyLong", label: "Psychopathology Long", color: "bg-red-100 text-red-800" }
  ];

  const completedAnalyses = results ? Object.keys(results).filter(key => results[key]?.trim()) : [];
  const progress = completedAnalyses.length;
  const totalAnalyses = analysisTypes.length;
  const progressPercentage = (progress / totalAnalyses) * 100;

  const handleCopy = async (content: string, section: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: `${section} analysis copied successfully.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!results) return;
    
    let content = "PSYCHOLOGY PRO - COMPREHENSIVE ANALYSIS REPORT\n";
    content += "=" + "=".repeat(50) + "\n\n";
    content += `Analysis ID: ${analysisId}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    analysisTypes.forEach(analysis => {
      const result = results[analysis.key];
      if (result?.trim()) {
        content += `${analysis.label.toUpperCase()}\n`;
        content += "-".repeat(analysis.label.length) + "\n\n";
        content += result + "\n\n";
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive-analysis-${analysisId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Comprehensive analysis report downloaded successfully.",
    });
  };

  const cleanText = (text: string) => {
    return text.replace(/[*#]/g, '').trim();
  };

  return (
    <div className="h-full flex flex-col" data-testid="comprehensive-results-panel">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewAnalysis}
              data-testid="back-to-input-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Input
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Comprehensive Analysis Results
              </h1>
              <p className="text-sm text-gray-600">
                Analysis ID: {analysisId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={isAnalyzing ? "default" : "secondary"}>
              {isAnalyzing ? "Running" : "Complete"}
            </Badge>
            {!isAnalyzing && results && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                data-testid="download-results-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Progress: {progress} / {totalAnalyses} analyses complete
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-hidden">
        {isAnalyzing && (!results || Object.keys(results).length === 0) ? (
          /* Loading State */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Starting Comprehensive Analysis
              </h3>
              <p className="text-gray-600">
                All six evaluation functions are being prepared...
              </p>
            </div>
          </div>
        ) : (
          /* Results Tabs */
          <Tabs defaultValue="cognitiveShort" className="h-full flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <TabsList className="grid grid-cols-6 w-full" data-testid="results-tabs">
                {analysisTypes.map((analysis) => (
                  <TabsTrigger
                    key={analysis.key}
                    value={analysis.key}
                    className="text-xs"
                    data-testid={`tab-${analysis.key}`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{analysis.label.replace(' ', '\n')}</span>
                      {results?.[analysis.key]?.trim() && (
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              {analysisTypes.map((analysis) => (
                <TabsContent
                  key={analysis.key}
                  value={analysis.key}
                  className="h-full m-0 data-[state=inactive]:hidden"
                >
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={analysis.color}>
                            {analysis.label}
                          </Badge>
                          {isAnalyzing && !results?.[analysis.key]?.trim() && (
                            <span className="text-sm text-gray-500">Waiting...</span>
                          )}
                        </div>
                        {results?.[analysis.key]?.trim() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(results[analysis.key], analysis.label)}
                            data-testid={`copy-${analysis.key}`}
                          >
                            {copiedSection === analysis.label ? (
                              <Check className="w-4 h-4 mr-2" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            {copiedSection === analysis.label ? "Copied!" : "Copy"}
                          </Button>
                        )}
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                      {results?.[analysis.key]?.trim() ? (
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-900">
                            {cleanText(results[analysis.key])}
                          </pre>
                        </div>
                      ) : isAnalyzing ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-3"></div>
                              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-4">
                              {analysis.label} analysis in progress...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500 text-center">
                            No results yet for {analysis.label}
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}