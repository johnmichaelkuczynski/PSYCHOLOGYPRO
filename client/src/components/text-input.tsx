import { useState } from "react";
import { Upload, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LLMProviderType, AnalysisTypeType } from "@shared/schema";
// import PdfUploader from "../../../src/components/PdfUploader";

interface TextInputProps {
  selectedFunction: AnalysisTypeType;
  selectedLLM: LLMProviderType;
  onAnalysisStart: (analysisId: string) => void;
  onAnalysisComplete?: (data: any) => void;
  isComprehensiveMode?: boolean;
  onAllAnalysesComplete?: (data: any) => void;
}

export default function TextInput({ 
  selectedFunction, 
  selectedLLM, 
  onAnalysisStart, 
  onAnalysisComplete,
  isComprehensiveMode = false,
  onAllAnalysesComplete
}: TextInputProps) {
  const [textContent, setTextContent] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<string[] | null>(null);
  const [selectedChunks, setSelectedChunks] = useState<number[]>([0]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  // Client-side chunking function that matches server logic
  const chunkText = (text: string, maxWords: number = 1000): string[] => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += maxWords) {
      const chunk = words.slice(i, i + maxWords).join(' ');
      chunks.push(chunk);
    }
    
    return chunks;
  };

  // Helper function to count words
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const processFile = async (file: File) => {
    console.log("Client: File selected:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validate file type
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a TXT, PDF, DOC, or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    
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
      setWordCount(parseResult.wordCount);
      
      if (parseResult.chunks) {
        setChunks(parseResult.chunks);
        setSelectedChunks([0]);
        toast({
          title: "File uploaded successfully",
          description: `Parsed ${file.name} (${parseResult.wordCount} words). Text divided into ${parseResult.chunks.length} chunks for analysis.`,
        });
      } else {
        setChunks(null);
        toast({
          title: "File uploaded successfully",
          description: `Parsed ${file.name} (${parseResult.wordCount} words).`,
        });
      }
    } catch (error) {
      toast({
        title: "File upload failed",
        description: "Could not parse the uploaded file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
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
    if (files.length === 0) return;

    if (files.length > 1) {
      toast({
        title: "Multiple files detected",
        description: "Please upload only one file at a time.",
        variant: "destructive",
      });
      return;
    }

    const file = files[0];
    await processFile(file);
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

    if (chunks && selectedChunks.length === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one chunk to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Use selected chunks if chunks exist, otherwise use full text
      const contentToAnalyze = chunks 
        ? selectedChunks.map(index => chunks[index]).join('\n\n')
        : textContent;
      
      if (isComprehensiveMode) {
        await handleComprehensiveAnalysis(contentToAnalyze);
      } else {
        const response = await apiRequest("POST", "/api/analyses", {
          type: selectedFunction,
          textContent: contentToAnalyze,
          additionalContext: additionalContext.trim() || undefined,
          llmProvider: selectedLLM,
        });

        const { analysisId } = await response.json();
        onAnalysisStart(analysisId);
        
        toast({
          title: "Analysis started",
          description: "Your text is being analyzed. Results will stream in real-time.",
        });
      }
    } catch (error) {
      toast({
        title: "Analysis failed to start",
        description: "Could not start the analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComprehensiveAnalysis = async (contentToAnalyze: string) => {
    try {
      const response = await fetch("/api/comprehensive-analysis/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: contentToAnalyze,
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

      // Start analysis placeholder
      onAnalysisStart("comprehensive-analysis");

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
                // All analyses complete
                onAllAnalysesComplete?.(analysisResults);
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
                
                // Update comprehensive results panel
                onAllAnalysesComplete?.({
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
      throw error;
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col" data-testid="text-input-panel">
      {/* File Upload Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <div 
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
            isDragOver 
              ? "border-blue-400 bg-blue-50" 
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="file-drop-zone"
        >
          <div className="space-y-1 text-center">
            <Upload className="text-gray-400 text-3xl mx-auto mb-2" />
            <div className="flex text-sm text-gray-600">
              <label 
                htmlFor="file-upload" 
                className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  data-testid="file-upload-input"
                />
              </label>
              <p className="pl-1">or drag and drop here</p>
            </div>
            <p className={`text-xs ${isDragOver ? "text-blue-600 font-medium" : "text-gray-500"}`}>
              {isDragOver ? "Drop your file here!" : "TXT, PDF, DOC, DOCX up to 10MB"}
            </p>
            {uploadedFile && (
              <p className="text-sm text-green-600 font-medium">
                Uploaded: {uploadedFile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Text Input Area */}
      <div className="flex-1 flex flex-col">
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
          Text to Analyze
          {textContent && (
            <span className="ml-2 text-xs text-gray-500">
              ({countWords(textContent)} words)
            </span>
          )}
        </label>
        <Textarea
          id="text-input"
          className="flex-1 resize-none"
          placeholder="Paste or type the text you want to analyze here. The text input area will expand to accommodate longer texts..."
          value={textContent}
          onChange={(e) => {
            const newText = e.target.value;
            setTextContent(newText);
            
            // Auto-chunk pasted text if over 1000 words
            const newWordCount = countWords(newText);
            setWordCount(newWordCount);
            
            if (newWordCount > 1000) {
              const newChunks = chunkText(newText, 1000);
              setChunks(newChunks);
              setSelectedChunks([0]); // Default to first chunk
            } else {
              setChunks(null);
              setSelectedChunks([0]);
            }
          }}
          data-testid="text-input-textarea"
        />
        {textContent && countWords(textContent) > 1000 && !chunks && (
          <p className="text-sm text-blue-600 mt-2">
            ✅ Your text has {countWords(textContent)} words and has been automatically chunked for analysis.
          </p>
        )}
      </div>

      {/* Additional Information */}
      <div className="mt-4">
        <label htmlFor="additional-info" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Context (Optional)
        </label>
        <Textarea
          id="additional-info"
          rows={3}
          placeholder="Add any relevant information about the text, author, or context that might be helpful for analysis..."
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          data-testid="additional-context-textarea"
        />
      </div>

      {/* Chunk Selection (when text is too long) */}
      {chunks && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Chunks ({wordCount} words total)
          </label>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-yellow-800">
                Your text was divided into {chunks.length} chunks of ~1000 words each to stay within token limits. 
                Select which chunks to analyze (multiple selection allowed):
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedChunks(chunks.map((_, i) => i))}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  data-testid="select-all-chunks"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedChunks([])}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  data-testid="deselect-all-chunks"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {chunks.map((chunk, index) => {
                const isSelected = selectedChunks.includes(index);
                const toggleChunk = () => {
                  if (isSelected) {
                    setSelectedChunks(prev => prev.filter(i => i !== index));
                  } else {
                    setSelectedChunks(prev => [...prev, index].sort((a, b) => a - b));
                  }
                };
                
                return (
                  <button
                    key={index}
                    onClick={toggleChunk}
                    className={`text-left p-3 rounded border ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 text-blue-900"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                    data-testid={`chunk-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by button click
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Chunk {index + 1} ({chunk.split(' ').length} words)
                        </div>
                        <div className="text-xs text-gray-600 mt-1 truncate">
                          {chunk.substring(0, 100)}...
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Start Analysis Button */}
      <div className="mt-6">
        <Button
          className="w-full"
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || !textContent.trim()}
          data-testid="start-analysis-button"
        >
          <Play className="mr-2 h-4 w-4" />
          {isAnalyzing ? "Starting Analysis..." : "Start Cognitive Analysis"}
        </Button>
      </div>
    </div>
  );
}
