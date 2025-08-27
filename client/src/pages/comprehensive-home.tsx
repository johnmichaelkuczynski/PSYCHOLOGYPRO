import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ComprehensiveResultsPanel from "@/components/comprehensive-results-panel";
import type { LLMProviderType } from "@shared/schema";

export default function ComprehensiveHome() {
  const [selectedLLM, setSelectedLLM] = useState<LLMProviderType>("zhi1");
  const [textContent, setTextContent] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [comprehensiveResults, setComprehensiveResults] = useState<Record<string, string> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleAnalysisStart = (id: string) => {
    setAnalysisId(id);
    setIsAnalyzing(true);
    setComprehensiveResults(null);
  };

  const handleAllAnalysesComplete = (results: Record<string, string>) => {
    setComprehensiveResults(results);
    setIsAnalyzing(false);
  };

  const handleNewAnalysis = () => {
    setAnalysisId(null);
    setComprehensiveResults(null);
    setIsAnalyzing(false);
    setTextContent("");
    setUploadedFile(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadedFile(file);
    
    // Handle different file types
    if (file.type === "text/plain") {
      const text = await file.text();
      setTextContent(text);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} loaded with ${countWords(text)} words.`,
      });
    } else if (file.type.includes("pdf") || file.type.includes("word") || file.type.includes("document")) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/files/parse", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Failed to parse file");
        
        const parseResult = await response.json();
        setTextContent(parseResult.text);
        
        toast({
          title: "File uploaded successfully",
          description: `${file.name} parsed with ${parseResult.wordCount} words.`,
        });
      } catch (error) {
        toast({
          title: "File upload failed",
          description: "Could not parse the uploaded file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!textContent.trim()) {
      toast({
        title: "No text provided",
        description: "Please enter text or upload a file to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await fetch("/api/comprehensive-analysis/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textContent,
          llmProvider: selectedLLM,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start comprehensive analysis");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const analysisResults: Record<string, string> = {};

      toast({
        title: "Comprehensive Analysis Started",
        description: "All six evaluations are now running. Results will stream in real-time.",
      });

      handleAnalysisStart("comprehensive-analysis");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'complete') {
                handleAllAnalysesComplete(analysisResults);
                toast({
                  title: "Comprehensive Analysis Complete",
                  description: "All six evaluations have finished successfully.",
                });
                return;
              }
              
              if (data.type === 'error') {
                throw new Error(data.error);
              }
              
              if (data.analysisType && data.chunk) {
                if (!analysisResults[data.analysisType]) {
                  analysisResults[data.analysisType] = "";
                }
                analysisResults[data.analysisType] += data.chunk;
                
                handleAllAnalysesComplete({
                  ...analysisResults,
                  [data.analysisType]: analysisResults[data.analysisType]
                });
              }
            } catch (parseError) {
              console.error("Failed to parse streaming data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Comprehensive analysis error:", error);
      toast({
        title: "Analysis failed to start",
        description: "Could not start the analysis. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const llmOptions = [
    { value: "zhi1" as const, label: "ZHI 1 (OpenAI)" },
    { value: "zhi2" as const, label: "ZHI 2 (Anthropic)" },
    { value: "zhi3" as const, label: "ZHI 3 (DeepSeek)" },
    { value: "zhi4" as const, label: "ZHI 4 (Perplexity)" },
  ];

  if (analysisId) {
    return (
      <ComprehensiveResultsPanel
        analysisId={analysisId}
        results={comprehensiveResults}
        isAnalyzing={isAnalyzing}
        onNewAnalysis={handleNewAnalysis}
      />
    );
  }

  return (
    <div className="h-full flex bg-white" data-testid="comprehensive-home">
      {/* Left Panel - Text Input */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Text Input</h1>
              <p className="text-sm text-gray-600 mt-1">
                Type, paste, or drag & drop your text/PDF/Word files here...
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                data-testid="upload-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTextContent("")}
                data-testid="clear-button"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 p-6">
          <div
            className={`h-full border-2 border-dashed rounded-lg transition-colors ${
              isDragOver 
                ? "border-blue-400 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              className="h-full resize-none border-none focus:ring-0 text-base leading-relaxed"
              placeholder="Type, paste, or drag & drop your text/PDF/Word files here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              data-testid="text-input-textarea"
            />
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".txt,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {countWords(textContent)} words • {textContent.length} characters
              {uploadedFile && (
                <span className="ml-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  {uploadedFile.name}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                <SelectTrigger className="w-48" data-testid="llm-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {llmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || !textContent.trim()}
                className="px-8"
                data-testid="analyze-button"
              >
                <Brain className="w-4 h-4 mr-2" />
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Analysis Results */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive evaluation results will appear here
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Analysis</h3>
            <p className="text-gray-600 max-w-md">
              Enter or upload text above, select your analysis mode and LLM provider, 
              then click "Analyze" to begin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}