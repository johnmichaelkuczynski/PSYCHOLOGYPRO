import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Play, Square, Download, ChevronDown, ChevronUp, Brain, Heart, AlertTriangle } from "lucide-react";

// Temporary toast replacement
const useToast = () => ({
  toast: (options: any) => {
    console.log('Toast:', options.title, options.description);
    if (options.variant === 'destructive') {
      alert(`Error: ${options.title}\n${options.description}`);
    } else {
      console.log(`Success: ${options.title}\n${options.description}`);
    }
  }
});

// Types
type EvaluationMode = "cognitive-normal" | "cognitive-comprehensive" | "psychological-normal" | "psychological-comprehensive" | "psychopathological-normal" | "psychopathological-comprehensive";
type LLMProvider = "zhi1" | "zhi2" | "zhi3" | "zhi4";

interface Chunk {
  id: string;
  text: string;
  selected: boolean;
  wordCount: number;
}

interface Analysis {
  id: string;
  mode: EvaluationMode;
  llmProvider: LLMProvider;
  status: "pending" | "streaming" | "completed" | "error";
  chunks: string[];
  createdAt: Date;
}

interface StreamingResult {
  summary?: string;
  phase?: string;
  questions?: Array<{
    question: string;
    answer?: string;
    score?: number;
  }>;
  content?: string;
  progress?: number;
  error?: string;
}

// Configuration
const modeInfo = {
  "cognitive-normal": {
    title: "Cognitive Analysis (Normal)",
    description: "Basic intelligence assessment with 17 core questions",
    icon: Brain,
    color: "bg-blue-500"
  },
  "cognitive-comprehensive": {
    title: "Cognitive Analysis (Comprehensive)",
    description: "Full 4-phase protocol with pushback and validation",
    icon: Brain,
    color: "bg-blue-600"
  },
  "psychological-normal": {
    title: "Psychological Analysis (Normal)",
    description: "Basic personality assessment with 18 core questions",
    icon: Heart,
    color: "bg-green-500"
  },
  "psychological-comprehensive": {
    title: "Psychological Analysis (Comprehensive)",
    description: "Full 4-phase protocol with pushback and validation",
    icon: Heart,
    color: "bg-green-600"
  },
  "psychopathological-normal": {
    title: "Psychopathological Analysis (Normal)",
    description: "Basic pathology screening with 15 core questions",
    icon: AlertTriangle,
    color: "bg-red-500"
  },
  "psychopathological-comprehensive": {
    title: "Psychopathological Analysis (Comprehensive)",
    description: "Full 4-phase protocol with pushback and validation",
    icon: AlertTriangle,
    color: "bg-red-600"
  }
};

const llmProviderNames = {
  zhi1: "ZHI 1 (OpenAI)",
  zhi2: "ZHI 2 (Anthropic)",
  zhi3: "ZHI 3 (DeepSeek)",
  zhi4: "ZHI 4 (Perplexity)"
};

export default function PsychologyPro() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [activeMode, setActiveMode] = useState<EvaluationMode>("cognitive-normal");
  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>("zhi1");
  const [textContent, setTextContent] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [showChunkSelector, setShowChunkSelector] = useState(false);
  const [activeAnalyses, setActiveAnalyses] = useState<Map<string, Analysis>>(new Map());
  const [streamingResults, setStreamingResults] = useState<Map<string, StreamingResult>>(new Map());

  // Text chunking
  const createChunks = (text: string): Chunk[] => {
    const words = text.split(/\s+/);
    if (words.length <= 1000) return [];
    
    const chunkList: Chunk[] = [];
    for (let i = 0; i < words.length; i += 1000) {
      const chunkWords = words.slice(i, i + 1000);
      const chunkText = chunkWords.join(' ');
      chunkList.push({
        id: `chunk-${i}`,
        text: chunkText,
        selected: true,
        wordCount: chunkWords.length
      });
    }
    return chunkList;
  };

  // Text input handling
  const handleTextInput = (text: string) => {
    setTextContent(text);
    const newChunks = createChunks(text);
    setChunks(newChunks);
    setShowChunkSelector(newChunks.length > 0);
  };

  // File upload handling
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/parse', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      handleTextInput(result.text);
      
      toast({
        title: "File Uploaded",
        description: `Successfully parsed ${file.name} (${result.text.split(/\s+/).length} words)`
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  // Analysis functions
  const startAnalysis = () => {
    if (!textContent.trim()) {
      toast({
        title: "No Text",
        description: "Please enter some text to analyze",
        variant: "destructive"
      });
      return;
    }

    const selectedChunks = chunks.length > 0 ? 
      chunks.filter(c => c.selected).map(c => c.text) : 
      [textContent];

    if (selectedChunks.length === 0) {
      toast({
        title: "No Chunks Selected",
        description: "Please select at least one chunk to analyze",
        variant: "destructive"
      });
      return;
    }

    const analysisId = `analysis-${Date.now()}`;
    const analysis: Analysis = {
      id: analysisId,
      mode: activeMode,
      llmProvider: selectedLLM,
      status: "pending",
      chunks: selectedChunks,
      createdAt: new Date()
    };

    setActiveAnalyses(prev => new Map(prev).set(analysisId, analysis));
    startStreamingAnalysis(analysisId, analysis);
  };

  const startStreamingAnalysis = async (analysisId: string, analysis: Analysis) => {
    try {
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: analysis.chunks.join('\n\n'),
          mode: analysis.mode,
          llmProvider: analysis.llmProvider
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      setActiveAnalyses(prev => {
        const updated = new Map(prev);
        const current = updated.get(analysisId);
        if (current) {
          updated.set(analysisId, { ...current, status: "streaming" });
        }
        return updated;
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setStreamingResults(prev => {
                  const updated = new Map(prev);
                  const current = updated.get(analysisId) || {};
                  updated.set(analysisId, { ...current, progress: data.progress });
                  return updated;
                });
              } else if (data.type === 'result') {
                setStreamingResults(prev => {
                  const updated = new Map(prev);
                  const current = updated.get(analysisId) || {};
                  updated.set(analysisId, { 
                    ...current, 
                    ...data.data,
                    progress: 100 
                  });
                  return updated;
                });
              } else if (data.type === 'complete') {
                setActiveAnalyses(prev => {
                  const updated = new Map(prev);
                  const current = updated.get(analysisId);
                  if (current) {
                    updated.set(analysisId, { ...current, status: "completed" });
                  }
                  return updated;
                });
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      setActiveAnalyses(prev => {
        const updated = new Map(prev);
        const current = updated.get(analysisId);
        if (current) {
          updated.set(analysisId, { ...current, status: "error" });
        }
        return updated;
      });

      setStreamingResults(prev => {
        const updated = new Map(prev);
        updated.set(analysisId, { error: error instanceof Error ? error.message : "Analysis failed" });
        return updated;
      });

      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const stopAnalysis = (analysisId: string) => {
    setActiveAnalyses(prev => {
      const updated = new Map(prev);
      updated.delete(analysisId);
      return updated;
    });
    setStreamingResults(prev => {
      const updated = new Map(prev);
      updated.delete(analysisId);
      return updated;
    });
  };

  const downloadResults = (analysisId: string) => {
    const analysis = activeAnalyses.get(analysisId);
    const results = streamingResults.get(analysisId);
    
    if (!analysis || !results) return;

    const content = {
      analysis: {
        mode: analysis.mode,
        llmProvider: analysis.llmProvider,
        timestamp: analysis.createdAt.toISOString(),
        textLength: analysis.chunks.join('').length
      },
      results: results
    };

    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psychology-analysis-${analysisId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setActiveAnalyses(new Map());
    setStreamingResults(new Map());
    setTextContent("");
    setChunks([]);
    setShowChunkSelector(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tab 3</h1>
            <p className="text-gray-600 mt-1">Text analysis system</p>
          </div>
          <Button onClick={clearAll} variant="outline">
            New Analysis
          </Button>
        </div>
      </div>

      {/* Main Content - Simple 2-column layout */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
          
          {/* Left Column - Input */}
          <div className="space-y-6">
            
            {/* Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs 
                  value={activeMode.split('-')[0]} 
                  onValueChange={(domain) => {
                    const isComprehensive = activeMode.includes('comprehensive');
                    const newMode = `${domain}-${isComprehensive ? 'comprehensive' : 'normal'}` as EvaluationMode;
                    setActiveMode(newMode);
                  }}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cognitive">Cognitive</TabsTrigger>
                    <TabsTrigger value="psychological">Psychology</TabsTrigger>
                    <TabsTrigger value="psychopathological">Pathology</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="comprehensive"
                    checked={activeMode.includes('comprehensive')}
                    onCheckedChange={(checked) => {
                      const domain = activeMode.split('-')[0] as 'cognitive' | 'psychological' | 'psychopathological';
                      const newMode = `${domain}-${checked ? 'comprehensive' : 'normal'}` as EvaluationMode;
                      setActiveMode(newMode);
                    }}
                  />
                  <label htmlFor="comprehensive" className="text-sm">
                    Comprehensive (4-Phase)
                  </label>
                </div>

                <Select value={selectedLLM} onValueChange={(value) => setSelectedLLM(value as LLMProvider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zhi1">ZHI 1 (OpenAI)</SelectItem>
                    <SelectItem value="zhi2">ZHI 2 (Anthropic)</SelectItem>
                    <SelectItem value="zhi3">ZHI 3 (DeepSeek)</SelectItem>
                    <SelectItem value="zhi4">ZHI 4 (Perplexity)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Text Input */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Text Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 h-full">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload File
                  </Button>
                </div>

                {/* Text Area - MASSIVE */}
                <Textarea
                  placeholder="Paste or type your text here..."
                  value={textContent}
                  onChange={(e) => handleTextInput(e.target.value)}
                  className="flex-1 min-h-[600px] resize-y"
                />
                
                {textContent && (
                  <div className="text-sm text-gray-500">
                    Words: {textContent.split(/\s+/).length}
                  </div>
                )}

                {/* Chunk Selector */}
                {showChunkSelector && chunks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Select Chunks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {chunks.map((chunk, idx) => (
                          <div key={chunk.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={chunk.selected}
                              onCheckedChange={(checked) => {
                                setChunks(prev => prev.map(c => 
                                  c.id === chunk.id ? { ...c, selected: !!checked } : c
                                ));
                              }}
                            />
                            <span className="text-sm">
                              Chunk {idx + 1} ({chunk.wordCount} words)
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={startAnalysis}
                  disabled={!textContent.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Analysis
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                {activeAnalyses.size === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No analyses running</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-4">
                      {Array.from(activeAnalyses.entries()).map(([analysisId, analysis]) => {
                        const results = streamingResults.get(analysisId);
                        
                        return (
                          <div key={analysisId} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-medium">{modeInfo[analysis.mode].title}</h3>
                                <p className="text-sm text-gray-500">{llmProviderNames[analysis.llmProvider]}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  analysis.status === "completed" ? "default" :
                                  analysis.status === "error" ? "destructive" : "secondary"
                                }>
                                  {analysis.status}
                                </Badge>
                                {analysis.status === "completed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadResults(analysisId)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => stopAnalysis(analysisId)}
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {analysis.status === "streaming" && (
                              <Progress value={results?.progress || 0} className="mb-3" />
                            )}
                            
                            {results && (
                              <div className="space-y-3">
                                {results.summary && (
                                  <div>
                                    <h4 className="font-medium mb-1">Summary</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                      {results.summary}
                                    </p>
                                  </div>
                                )}
                                
                                {results.questions && results.questions.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Questions</h4>
                                    <div className="space-y-2">
                                      {results.questions.map((q: any, idx: number) => (
                                        <div key={idx} className="text-sm border-l-2 border-blue-200 pl-3">
                                          <p className="font-medium">{q.question}</p>
                                          {q.answer && (
                                            <p className="text-gray-600 mt-1">{q.answer}</p>
                                          )}
                                          {q.score !== undefined && (
                                            <Badge variant="outline" className="mt-1">
                                              {q.score}/100
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {results.content && (
                                  <div>
                                    <h4 className="font-medium mb-1">Full Analysis</h4>
                                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-96 overflow-y-auto whitespace-pre-wrap">
                                      {results.content}
                                    </div>
                                  </div>
                                )}
                                
                                {results.error && (
                                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    Error: {results.error}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}