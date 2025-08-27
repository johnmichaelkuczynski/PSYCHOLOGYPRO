import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface TextChunk {
  id: string;
  content: string;
  wordCount: number;
  selected: boolean;
}

interface AnalysisResult {
  id: string;
  status: "pending" | "streaming" | "completed" | "error";
  results?: any;
  mode: EvaluationMode;
  llmProvider: LLMProvider;
  chunks: string[];
  textContent: string;
}

export default function PsychologyPro() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [activeMode, setActiveMode] = useState<EvaluationMode>("cognitive-normal");
  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>("zhi1");
  const [textContent, setTextContent] = useState("");
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [showChunkSelector, setShowChunkSelector] = useState(false);
  const [activeAnalyses, setActiveAnalyses] = useState<Map<string, AnalysisResult>>(new Map());
  const [streamingResults, setStreamingResults] = useState<Map<string, any>>(new Map());

  // LLM Provider Mapping
  const llmProviderNames = {
    zhi1: "ZHI 1 (OpenAI)",
    zhi2: "ZHI 2 (Anthropic)", 
    zhi3: "ZHI 3 (DeepSeek)",
    zhi4: "ZHI 4 (Perplexity)"
  };

  // Mode Information
  const modeInfo = {
    "cognitive-normal": {
      title: "Cognitive Analysis (Normal)",
      description: "Basic intelligence assessment with 17 core questions",
      color: "bg-blue-500",
      icon: Brain
    },
    "cognitive-comprehensive": {
      title: "Cognitive Analysis (Comprehensive)", 
      description: "Four-phase intelligence assessment with pushback protocols and Walmart metric",
      color: "bg-blue-700",
      icon: Brain
    },
    "psychological-normal": {
      title: "Psychological Profile (Normal)",
      description: "Basic psychological structure analysis with 18 core questions",
      color: "bg-green-500",
      icon: Heart
    },
    "psychological-comprehensive": {
      title: "Psychological Profile (Comprehensive)",
      description: "Four-phase psychological assessment with validation protocols",
      color: "bg-green-700",
      icon: Heart
    },
    "psychopathological-normal": {
      title: "Psychopathology Screen (Normal)",
      description: "Basic pathology assessment with 15 core questions",
      color: "bg-red-500",
      icon: AlertTriangle
    },
    "psychopathological-comprehensive": {
      title: "Psychopathology Analysis (Comprehensive)",
      description: "Four-phase pathology assessment with reality-testing protocols",
      color: "bg-red-700",
      icon: AlertTriangle
    }
  };

  // Text chunking logic
  const chunkText = (text: string): TextChunk[] => {
    const words = text.split(/\s+/);
    const chunks: TextChunk[] = [];
    const chunkSize = 1000;
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkContent = chunkWords.join(' ');
      chunks.push({
        id: `chunk-${Math.floor(i / chunkSize) + 1}`,
        content: chunkContent,
        wordCount: chunkWords.length,
        selected: true
      });
    }
    
    return chunks;
  };

  // File upload handler
  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/files/parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('File upload failed');
      }
      
      const data = await response.json();
      const content = data.content || data.text || '';
      
      setTextContent(content);
      
      // Check if chunking is needed
      const wordCount = content.split(/\s+/).length;
      if (wordCount > 1000) {
        const textChunks = chunkText(content);
        setChunks(textChunks);
        setShowChunkSelector(true);
        toast({
          title: "Text Chunked",
          description: `Text split into ${textChunks.length} chunks of ~1000 words each. Select chunks to analyze.`
        });
      } else {
        setChunks([]);
        setShowChunkSelector(false);
      }
      
      toast({
        title: "File Uploaded",
        description: `Successfully parsed ${file.name} (${wordCount} words)`
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to parse the uploaded file",
        variant: "destructive"
      });
    }
  };

  // Text input handler
  const handleTextInput = (text: string) => {
    setTextContent(text);
    
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 1000) {
      const textChunks = chunkText(text);
      setChunks(textChunks);
      setShowChunkSelector(true);
    } else {
      setChunks([]);
      setShowChunkSelector(false);
    }
  };

  // Chunk selection
  const toggleChunkSelection = (chunkId: string) => {
    setChunks(prev => prev.map(chunk => 
      chunk.id === chunkId 
        ? { ...chunk, selected: !chunk.selected }
        : chunk
    ));
  };

  const selectAllChunks = () => {
    setChunks(prev => prev.map(chunk => ({ ...chunk, selected: true })));
  };

  const deselectAllChunks = () => {
    setChunks(prev => prev.map(chunk => ({ ...chunk, selected: false })));
  };

  // Analysis execution
  const startAnalysis = async () => {
    if (!textContent.trim()) {
      toast({
        title: "No Content",
        description: "Please enter or upload text content first",
        variant: "destructive"
      });
      return;
    }

    const selectedChunks = chunks.length > 0 
      ? chunks.filter(c => c.selected).map(c => c.content)
      : [textContent];

    if (selectedChunks.length === 0) {
      toast({
        title: "No Chunks Selected",
        description: "Please select at least one chunk to analyze",
        variant: "destructive"
      });
      return;
    }

    try {
      const analysisId = `analysis-${Date.now()}`;
      
      // Add to active analyses
      const newAnalysis: AnalysisResult = {
        id: analysisId,
        status: "pending",
        mode: activeMode,
        llmProvider: selectedLLM,
        chunks: chunks.filter(c => c.selected).map(c => c.id),
        textContent: selectedChunks.join('\n\n')
      };
      
      setActiveAnalyses(prev => new Map(prev.set(analysisId, newAnalysis)));
      
      // Start analysis
      const response = await fetch('/api/psychology-pro/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: activeMode,
          llmProvider: selectedLLM,
          textContent: selectedChunks.join('\n\n'),
          chunks: selectedChunks
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }
      
      const data = await response.json();
      
      // Update analysis ID from server
      setActiveAnalyses(prev => {
        const updated = new Map(prev);
        updated.delete(analysisId);
        updated.set(data.analysisId, { ...newAnalysis, id: data.analysisId });
        return updated;
      });
      
      // Start streaming
      startStreaming(data.analysisId);
      
      toast({
        title: "Analysis Started",
        description: `${modeInfo[activeMode].title} with ${llmProviderNames[selectedLLM]}`
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to start analysis",
        variant: "destructive"
      });
    }
  };

  // Streaming setup
  const startStreaming = (analysisId: string) => {
    const eventSource = new EventSource(`/api/psychology-pro/analyses/${analysisId}/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update streaming results
        setStreamingResults(prev => new Map(prev.set(analysisId, data)));
        
        // Update analysis status
        setActiveAnalyses(prev => {
          const updated = new Map(prev);
          const analysis = updated.get(analysisId);
          if (analysis) {
            analysis.status = data.status || "streaming";
            analysis.results = data;
          }
          return updated;
        });
        
        if (data.status === "completed" || data.status === "error") {
          eventSource.close();
        }
      } catch (error) {
        console.error('Streaming error:', error);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      setActiveAnalyses(prev => {
        const updated = new Map(prev);
        const analysis = updated.get(analysisId);
        if (analysis) {
          analysis.status = "error";
        }
        return updated;
      });
    };
  };

  // Stop analysis
  const stopAnalysis = async (analysisId: string) => {
    try {
      await fetch(`/api/psychology-pro/analyses/${analysisId}`, {
        method: 'DELETE'
      });
      
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
    } catch (error) {
      console.error('Stop analysis error:', error);
    }
  };

  // Download results
  const downloadResults = async (analysisId: string) => {
    try {
      const analysis = activeAnalyses.get(analysisId);
      if (!analysis) return;
      
      const results = streamingResults.get(analysisId);
      if (!results) return;
      
      const filename = `psychology-pro-${analysis.mode}-${analysisId}.txt`;
      const content = formatAnalysisForDownload(analysis, results);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download analysis results",
        variant: "destructive"
      });
    }
  };

  // Format analysis for download
  const formatAnalysisForDownload = (analysis: AnalysisResult, results: any): string => {
    const lines = [];
    lines.push(`Psychology Pro Analysis Report`);
    lines.push(`=====================================`);
    lines.push(`Analysis Type: ${modeInfo[analysis.mode].title}`);
    lines.push(`AI Provider: ${llmProviderNames[analysis.llmProvider]}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Analysis ID: ${analysis.id}`);
    lines.push('');
    
    lines.push('Original Text:');
    lines.push('-------------');
    lines.push(analysis.textContent);
    lines.push('');
    
    if (results.summary) {
      lines.push('Summary:');
      lines.push('--------');
      lines.push(results.summary);
      lines.push('');
    }
    
    if (results.content) {
      lines.push('Analysis Results:');
      lines.push('----------------');
      lines.push(results.content);
      lines.push('');
    }
    
    return lines.join('\n');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Psychology Pro: Complete Evaluation System
          </h1>
          <p className="text-lg text-gray-600 max-w-4xl">
            Comprehensive cognitive, psychological, and psychopathological analysis with six evaluation modes.
            Upload documents, paste text, or type directly. Texts over 1000 words are automatically chunked for selective analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${modeInfo[activeMode].color}`} />
                  Evaluation Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Domain Selection */}
                  <Tabs 
                    value={activeMode.split('-')[0]} 
                    onValueChange={(domain) => {
                      const isComprehensive = activeMode.includes('comprehensive');
                      const newMode = `${domain}-${isComprehensive ? 'comprehensive' : 'normal'}` as EvaluationMode;
                      setActiveMode(newMode);
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="cognitive" data-testid="tab-cognitive">
                        <Brain className="h-4 w-4 mr-1" />
                        Cognitive
                      </TabsTrigger>
                      <TabsTrigger value="psychological" data-testid="tab-psychological">
                        <Heart className="h-4 w-4 mr-1" />
                        Psychology
                      </TabsTrigger>
                      <TabsTrigger value="psychopathological" data-testid="tab-psychopathological">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Pathology
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {/* Mode Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="comprehensive-mode"
                        checked={activeMode.includes('comprehensive')}
                        onCheckedChange={(checked) => {
                          const domain = activeMode.split('-')[0] as 'cognitive' | 'psychological' | 'psychopathological';
                          const newMode = `${domain}-${checked ? 'comprehensive' : 'normal'}` as EvaluationMode;
                          setActiveMode(newMode);
                        }}
                      />
                      <label htmlFor="comprehensive-mode" className="text-sm font-medium">
                        Comprehensive Mode (4-Phase Protocol)
                      </label>
                    </div>
                    
                    <Alert>
                      {(() => {
                        const IconComponent = modeInfo[activeMode].icon;
                        return <IconComponent className="h-4 w-4" />;
                      })()}
                      <AlertDescription className="text-sm">
                        <strong>{modeInfo[activeMode].title}</strong><br/>
                        {modeInfo[activeMode].description}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LLM Selection */}
            <Card>
              <CardHeader>
                <CardTitle>AI Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedLLM} onValueChange={(value) => setSelectedLLM(value as LLMProvider)}>
                  <SelectTrigger data-testid="select-llm-provider">
                    <SelectValue placeholder="Select AI Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zhi1" data-testid="option-zhi1">ZHI 1 (OpenAI)</SelectItem>
                    <SelectItem value="zhi2" data-testid="option-zhi2">ZHI 2 (Anthropic)</SelectItem>
                    <SelectItem value="zhi3" data-testid="option-zhi3">ZHI 3 (DeepSeek)</SelectItem>
                    <SelectItem value="zhi4" data-testid="option-zhi4">ZHI 4 (Perplexity)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Text Input */}
            <Card>
              <CardHeader>
                <CardTitle>Text Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload TXT, DOC, DOCX, or PDF
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-file"
                  >
                    Choose File
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-500">or</div>

                {/* Text Area */}
                <Textarea
                  placeholder="Paste or type your text here..."
                  value={textContent}
                  onChange={(e) => handleTextInput(e.target.value)}
                  className="min-h-[800px] resize-y"
                  data-testid="textarea-content"
                />
                
                {textContent && (
                  <div className="text-sm text-gray-500">
                    Word count: {textContent.split(/\s+/).length}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chunk Selector */}
            {showChunkSelector && chunks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Text Chunks ({chunks.length})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChunkSelector(!showChunkSelector)}
                    >
                      {showChunkSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllChunks}
                        data-testid="button-select-all-chunks"
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={deselectAllChunks}
                        data-testid="button-deselect-all-chunks"
                      >
                        Deselect All
                      </Button>
                    </div>
                    
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {chunks.map((chunk) => (
                          <div key={chunk.id} className="flex items-start space-x-2 p-2 border rounded">
                            <Checkbox
                              checked={chunk.selected}
                              onCheckedChange={() => toggleChunkSelection(chunk.id)}
                              data-testid={`checkbox-chunk-${chunk.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{chunk.id}</div>
                              <div className="text-xs text-gray-500">{chunk.wordCount} words</div>
                              <div className="text-xs text-gray-600 truncate">
                                {chunk.content.substring(0, 100)}...
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="text-sm text-gray-500">
                      Selected: {chunks.filter(c => c.selected).length} / {chunks.length} chunks
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start Analysis */}
            <Button 
              onClick={startAnalysis}
              disabled={!textContent.trim()}
              className="w-full"
              size="lg"
              data-testid="button-start-analysis"
            >
              <Play className="h-4 w-4 mr-2" />
              Start {modeInfo[activeMode].title}
            </Button>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                {activeAnalyses.size > 0 && (
                  <div className="text-sm text-gray-500">
                    {activeAnalyses.size} active analysis{activeAnalyses.size !== 1 ? 'es' : ''}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {activeAnalyses.size === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No analyses running. Start an analysis to see results here.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[800px]">
                    <div className="space-y-6">
                      {Array.from(activeAnalyses.entries()).map(([analysisId, analysis]) => {
                        const results = streamingResults.get(analysisId);
                        const IconComponent = modeInfo[analysis.mode].icon;
                        
                        return (
                          <div key={analysisId} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${modeInfo[analysis.mode].color} flex items-center justify-center`}>
                                  <IconComponent className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">{modeInfo[analysis.mode].title}</h3>
                                  <p className="text-sm text-gray-500">{llmProviderNames[analysis.llmProvider]}</p>
                                </div>
                                <Badge variant={
                                  analysis.status === "completed" ? "default" :
                                  analysis.status === "error" ? "destructive" :
                                  analysis.status === "streaming" ? "secondary" : "outline"
                                }>
                                  {analysis.status}
                                </Badge>
                              </div>
                              
                              <div className="flex gap-2">
                                {analysis.status === "completed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadResults(analysisId)}
                                    data-testid={`button-download-${analysisId}`}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => stopAnalysis(analysisId)}
                                  data-testid={`button-stop-${analysisId}`}
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {analysis.status === "streaming" && (
                              <Progress value={results?.progress || 0} className="mb-4" />
                            )}
                            
                            {results && (
                              <div className="space-y-4">
                                {results.summary && (
                                  <div>
                                    <h4 className="font-medium mb-2">Summary & Categorization</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                      {results.summary}
                                    </p>
                                  </div>
                                )}
                                
                                {results.phase && (
                                  <div>
                                    <h4 className="font-medium mb-2">Current Phase: {results.phase}</h4>
                                  </div>
                                )}
                                
                                {results.questions && results.questions.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Assessment Questions</h4>
                                    <div className="space-y-3">
                                      {results.questions.map((q: any, idx: number) => (
                                        <div key={idx} className="border-l-4 border-blue-200 pl-4">
                                          <p className="text-sm font-medium">{q.question}</p>
                                          {q.answer && (
                                            <p className="text-sm text-gray-600 mt-1">{q.answer}</p>
                                          )}
                                          {q.score !== undefined && (
                                            <div className="flex items-center gap-2 mt-2">
                                              <Badge variant="outline">{q.score}/100</Badge>
                                              <span className="text-xs text-gray-500">
                                                ({100 - q.score}% outperform)
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {results.content && (
                                  <div>
                                    <h4 className="font-medium mb-2">Complete Analysis</h4>
                                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
                                      {results.content}
                                    </div>
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