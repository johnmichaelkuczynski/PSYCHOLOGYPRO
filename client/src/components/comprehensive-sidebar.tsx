import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, RotateCcw } from "lucide-react";
import type { LLMProviderType } from "@shared/schema";

interface ComprehensiveSidebarProps {
  selectedLLM: LLMProviderType;
  onLLMChange: (llm: LLMProviderType) => void;
  onNewAnalysis: () => void;
  isAnalyzing: boolean;
}

export default function ComprehensiveSidebar({
  selectedLLM,
  onLLMChange,
  onNewAnalysis,
  isAnalyzing
}: ComprehensiveSidebarProps) {
  const llmOptions = [
    { value: "zhi1" as const, label: "ZHI 1 (OpenAI)", description: "GPT-4 Advanced" },
    { value: "zhi2" as const, label: "ZHI 2 (Anthropic)", description: "Claude-3.5 Sonnet" },
    { value: "zhi3" as const, label: "ZHI 3 (DeepSeek)", description: "DeepSeek Chat" },
    { value: "zhi4" as const, label: "ZHI 4 (Perplexity)", description: "Llama 3.1 Sonar" },
  ];

  const analysisTypes = [
    {
      name: "Cognitive Short",
      description: "Quick cognitive assessment with scoring",
      icon: Brain,
      color: "bg-blue-100 text-blue-800"
    },
    {
      name: "Cognitive Long", 
      description: "Comprehensive cognitive evaluation with multi-phase analysis",
      icon: Brain,
      color: "bg-blue-100 text-blue-800"
    },
    {
      name: "Psychological Short",
      description: "Rapid psychological profiling",
      icon: Zap,
      color: "bg-green-100 text-green-800"
    },
    {
      name: "Psychological Long",
      description: "In-depth psychological assessment with validation phases",
      icon: Zap,
      color: "bg-green-100 text-green-800"
    },
    {
      name: "Psychopathology Short",
      description: "Brief pathological indicators screening",
      icon: RotateCcw,
      color: "bg-red-100 text-red-800"
    },
    {
      name: "Psychopathology Long",
      description: "Comprehensive pathological evaluation with multi-phase scoring",
      icon: RotateCcw,
      color: "bg-red-100 text-red-800"
    }
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-6" data-testid="comprehensive-sidebar">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Comprehensive Analysis
        </h2>
        <p className="text-sm text-gray-600">
          All six evaluation functions will run simultaneously for complete psychological profiling.
        </p>
      </div>

      {/* LLM Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">AI Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedLLM} onValueChange={onLLMChange}>
            <SelectTrigger data-testid="llm-select">
              <SelectValue placeholder="Select AI Provider" />
            </SelectTrigger>
            <SelectContent>
              {llmOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Analysis Functions */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Analysis Functions</CardTitle>
          <p className="text-xs text-gray-600">
            These six evaluations will run automatically:
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysisTypes.map((analysis, index) => {
            const IconComponent = analysis.icon;
            return (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-md ${analysis.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {analysis.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {analysis.description}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* New Analysis Button */}
      <Button
        onClick={onNewAnalysis}
        variant="outline"
        className="w-full"
        disabled={isAnalyzing}
        data-testid="new-analysis-button"
      >
        {isAnalyzing ? "Analysis Running..." : "NEW ANALYSIS"}
      </Button>

      {/* Status */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Status:</span>
          <Badge variant={isAnalyzing ? "default" : "secondary"}>
            {isAnalyzing ? "Running" : "Ready"}
          </Badge>
        </div>
      </div>
    </div>
  );
}