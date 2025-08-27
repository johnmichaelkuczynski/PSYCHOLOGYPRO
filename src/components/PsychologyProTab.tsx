import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, MessageSquare, RefreshCw, FileText } from "lucide-react";
import type { AnalysisType, LLMProvider, TextChunk } from "../../../shared/profiler-schema";

interface AnalysisProgress {
  phase: number;
  total: number;
  description: string;
}

interface AnalysisResults {
  summary: string;
  category: string;
  questionResponses: Array<{
    question: string;
    answer: string;
    score: number;
  }>;
  overallScore: number;
  reasoning: string;
}

interface Provider {
  id: LLMProvider;
  name: string;
  available: boolean;
}

export default function PsychologyProTab() {
  // State
  const [textContent, setTextContent] = useState("");
  const [selectedFunction, setSelectedFunction] = useState<AnalysisType>("cognitive_short");
  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>("zhi1");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<TextChunk[] | null>(null);
  const [selectedChunks, setSelectedChunks] = useState<number[]>([]);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  
  // Discussion state
  const [discussionMessage, setDiscussionMessage] = useState("");
  const [discussionHistory, setDiscussionHistory] = useState<any[]>([]);
  const [isDiscussing, setIsDiscussing] = useState(false);
  
  // Providers
  const [providers, setProviders] = useState<Provider[]>([]);

  const { toast } = useToast();

  // Load available providers
  useEffect(() => {
    fetch("/api/profiler/providers")
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers);
        // Set first available provider as default
        const firstAvailable = data.providers.find((p: Provider) => p.available);
        if (firstAvailable) {
          setSelectedLLM(firstAvailable.id);
        }
      })
      .catch(console.error);
  }, []);

  // Chunk text function
  const chunkText = (text: string): TextChunk[] => {
    const words = text.split(/\s+/);
    const chunks: TextChunk[] = [];
    let currentChunk = "";
    let wordCount = 0;
    let chunkId = 0;

    for (const word of words) {
      if (wordCount >= 1000 && currentChunk.trim()) {
        chunks.push({
          id: chunkId++,
          content: currentChunk.trim(),
          wordCount,
          selected: chunkId === 1 // Select first chunk by default
        });
        currentChunk = "";
        wordCount = 0;
      }
      currentChunk += word + " ";
      wordCount++;
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: chunkId,
        content: currentChunk.trim(),
        wordCount,
        selected: chunks.length === 0 // Select if it's the only chunk
      });
    }

    return chunks;
  };

  // Count words
  const countWords = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  // Handle text change
  useEffect(() => {
    const wordCount = countWords(textContent);
    if (wordCount > 1000 && textContent.trim()) {
      const textChunks = chunkText(textContent);
      setChunks(textChunks);
      setSelectedChunks(textChunks.filter(c => c.selected).map(c => c.id));
    } else {
      setChunks(null);
      setSelectedChunks([]);
    }
  }, [textContent]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    // Handle different file types
    try {
      let extractedText = "";
      
      if (file.type === "text/plain") {
        extractedText = await file.text();
      } else if (file.type === "application/pdf") {
        // Use existing PDF upload system
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadResponse = await fetch("/api/upload/pdf", {
          method: "POST",
          body: formData
        });
        
        const uploadResult = await uploadResponse.json();
        if (uploadResult.ok) {
          const extractResponse = await fetch(`/api/extract/${uploadResult.id}`);
          const extractResult = await extractResponse.json();
          if (extractResult.ok && extractResult.text) {
            extractedText = extractResult.text;
          }
        }
      } else if (
        file.type === "application/msword" || 
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // Handle DOC/DOCX - would need mammoth.js or similar
        toast({
          title: "File type not supported yet",
          description: "DOC/DOCX support coming soon. Please use TXT or PDF files.",
          variant: "destructive"
        });
        return;
      }

      if (extractedText) {
        setTextContent(extractedText);
        toast({
          title: "File uploaded successfully",
          description: `${countWords(extractedText)} words extracted from ${file.name}`
        });
      } else {
        toast({
          title: "Failed to extract text",
          description: "Could not read the file content",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not process the uploaded file",
        variant: "destructive"
      });
    }
  };

  // Handle chunk selection
  const toggleChunkSelection = (chunkId: number) => {
    setSelectedChunks(prev => {
      if (prev.includes(chunkId)) {
        return prev.filter(id => id !== chunkId);
      } else {
        return [...prev, chunkId];
      }
    });
  };

  const selectAllChunks = () => {
    if (chunks) {
      setSelectedChunks(chunks.map(c => c.id));
    }
  };

  const deselectAllChunks = () => {
    setSelectedChunks([]);
  };

  // Start analysis
  const startAnalysis = async () => {
    if (!textContent.trim()) {
      toast({
        title: "No text to analyze",
        description: "Please enter or upload text content first",
        variant: "destructive"
      });
      return;
    }

    const selectedProvider = providers.find(p => p.id === selectedLLM);
    if (!selectedProvider?.available) {
      toast({
        title: "Provider not available",
        description: "Selected LLM provider is not available",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    setProgress({ phase: 0, total: 1, description: "Starting analysis..." });

    try {
      const selectedChunkData = chunks ? 
        chunks
          .filter(chunk => selectedChunks.includes(chunk.id))
          .map(chunk => ({ ...chunk, selected: true }))
        : undefined;

      const response = await fetch("/api/profiler/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisType: selectedFunction,
          llmProvider: selectedLLM,
          textContent,
          selectedChunks: selectedChunkData
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAnalysisId(data.analysisId);
        pollAnalysisStatus(data.analysisId);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  };

  // Poll analysis status
  const pollAnalysisStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/profiler/analysis/${id}/status`);
      const data = await response.json();

      if (response.ok) {
        setProgress(data.progress);

        if (data.status === "completed" && data.results) {
          setResults(data.results);
          setIsAnalyzing(false);
          toast({
            title: "Analysis completed",
            description: `Overall score: ${data.results.overallScore}/100`
          });
        } else if (data.status === "failed") {
          setIsAnalyzing(false);
          toast({
            title: "Analysis failed",
            description: data.error || "Unknown error",
            variant: "destructive"
          });
        } else if (data.status === "running") {
          // Continue polling
          setTimeout(() => pollAnalysisStatus(id), 2000);
        }
      }
    } catch (error) {
      console.error("Status polling error:", error);
      setIsAnalyzing(false);
    }
  }, [toast]);

  // Download results
  const downloadResults = () => {
    if (!analysisId) return;
    window.open(`/api/profiler/analysis/${analysisId}/download`, '_blank');
  };

  // Start discussion
  const startDiscussion = async () => {
    if (!discussionMessage.trim() || !analysisId) return;

    setIsDiscussing(true);
    try {
      const response = await fetch(`/api/profiler/analysis/${analysisId}/discuss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: discussionMessage })
      });

      const data = await response.json();
      if (response.ok) {
        setDiscussionHistory(prev => [
          ...prev,
          {
            type: "user",
            message: discussionMessage,
            timestamp: data.timestamp
          },
          {
            type: "assistant", 
            message: data.response,
            timestamp: data.timestamp
          }
        ]);
        setDiscussionMessage("");
        toast({
          title: "Discussion updated",
          description: "The AI has responded to your message"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Discussion failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
    setIsDiscussing(false);
  };

  // New analysis button
  const startNewAnalysis = () => {
    setResults(null);
    setAnalysisId(null);
    setProgress(null);
    setDiscussionHistory([]);
    setDiscussionMessage("");
    toast({
      title: "Ready for new analysis",
      description: "You can now start a fresh analysis"
    });
  };

  return (
    <div className="h-full bg-white">
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Psychology Pro</h2>
            <p className="text-sm text-gray-600">Comprehensive cognitive, psychological, and psychopathological text analysis</p>
          </div>
          {results && (
            <div className="flex gap-2">
              <Button onClick={downloadResults} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={startNewAnalysis} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Input */}
        <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
          <div className="space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Document Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <label className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-500 font-medium">
                      Choose file
                    </span>
                    <span className="text-gray-500"> or drag and drop</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      data-testid="file-upload"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    TXT, PDF, DOC, DOCX up to 10MB
                  </p>
                  {uploadedFile && (
                    <p className="text-sm text-green-600 font-medium mt-2">
                      ✓ {uploadedFile.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Text Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Text Content
                  {textContent && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({countWords(textContent)} words)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter or paste text to analyze..."
                  className="min-h-[200px] resize-none"
                  data-testid="text-input"
                />
              </CardContent>
            </Card>

            {/* Chunk Selection */}
            {chunks && chunks.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Text Chunks ({chunks.length})
                    <div className="flex gap-2 mt-2">
                      <Button onClick={selectAllChunks} size="sm" variant="outline">
                        Select All
                      </Button>
                      <Button onClick={deselectAllChunks} size="sm" variant="outline">
                        Deselect All
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {chunks.map((chunk) => (
                      <div key={chunk.id} className="flex items-start gap-3 p-3 border rounded">
                        <input
                          type="checkbox"
                          checked={selectedChunks.includes(chunk.id)}
                          onChange={() => toggleChunkSelection(chunk.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            Chunk {chunk.id + 1} ({chunk.wordCount} words)
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {chunk.content.substring(0, 100)}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Analysis Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Analysis Type</label>
                  <Select value={selectedFunction} onValueChange={(value: AnalysisType) => setSelectedFunction(value)}>
                    <SelectTrigger data-testid="function-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cognitive_short">Cognitive (Normal)</SelectItem>
                      <SelectItem value="cognitive_long">Cognitive (Comprehensive)</SelectItem>
                      <SelectItem value="psychological_short">Psychological (Normal)</SelectItem>
                      <SelectItem value="psychological_long">Psychological (Comprehensive)</SelectItem>
                      <SelectItem value="psychopathological_short">Psychopathological (Normal)</SelectItem>
                      <SelectItem value="psychopathological_long">Psychopathological (Comprehensive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">LLM Provider</label>
                  <Select value={selectedLLM} onValueChange={(value: LLMProvider) => setSelectedLLM(value)}>
                    <SelectTrigger data-testid="llm-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider.id} value={provider.id} disabled={!provider.available}>
                          {provider.name} {!provider.available && "(Unavailable)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={startAnalysis}
                  disabled={isAnalyzing || !textContent.trim()}
                  className="w-full"
                  data-testid="start-analysis"
                >
                  {isAnalyzing ? "Analyzing..." : "Start Analysis"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-1/2 p-6 overflow-y-auto">
          {isAnalyzing && progress && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Analysis Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Phase {progress.phase} of {progress.total}</span>
                    <span>{Math.round((progress.phase / progress.total) * 100)}%</span>
                  </div>
                  <Progress value={(progress.phase / progress.total) * 100} />
                  <p className="text-sm text-gray-600">{progress.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="discussion">Discussion</TabsTrigger>
              </TabsList>

              <TabsContent value="results" className="space-y-6">
                {/* Overall Score */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Overall Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-3xl font-bold text-blue-600">
                        {results.overallScore}/100
                      </div>
                      <div>
                        <Badge variant={results.overallScore >= 95 ? "default" : results.overallScore >= 80 ? "secondary" : "destructive"}>
                          {results.overallScore >= 95 ? "Exceptional" : results.overallScore >= 80 ? "Strong" : "Needs Improvement"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div><strong>Summary:</strong> {results.summary}</div>
                      <div><strong>Category:</strong> {results.category}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Analysis */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Detailed Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm">
                      {results.reasoning}
                    </div>
                  </CardContent>
                </Card>

                {/* Question Responses */}
                {results.questionResponses && results.questionResponses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Question Responses</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {results.questionResponses.map((response, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <div className="font-medium text-sm mb-1">
                            Q{index + 1}: {response.question}
                          </div>
                          <div className="text-sm text-gray-700 mb-2">
                            {response.answer}
                          </div>
                          <Badge variant="outline">
                            Score: {response.score}/100
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="discussion" className="space-y-6">
                {/* Discussion History */}
                {discussionHistory.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Discussion History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                      {discussionHistory.map((entry, index) => (
                        <div key={index} className={`p-3 rounded ${entry.type === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                          <div className="text-xs text-gray-500 mb-1">
                            {entry.type === 'user' ? 'You' : 'Psychology Pro'}
                          </div>
                          <div className="text-sm">{entry.message}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* New Discussion */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Discuss Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={discussionMessage}
                      onChange={(e) => setDiscussionMessage(e.target.value)}
                      placeholder="Ask questions about the analysis, challenge the results, or request clarification..."
                      className="min-h-[100px]"
                      data-testid="discussion-input"
                    />
                    <Button
                      onClick={startDiscussion}
                      disabled={isDiscussing || !discussionMessage.trim()}
                      data-testid="send-discussion"
                    >
                      {isDiscussing ? "Sending..." : "Send Message"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {!isAnalyzing && !results && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Ready to analyze</p>
                <p className="text-sm">Enter text and start your analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}