import { useState } from "react";
import { Upload, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LLMProviderType, AnalysisTypeType } from "@shared/schema";

interface TextInputProps {
  selectedFunction: AnalysisTypeType;
  selectedLLM: LLMProviderType;
  onAnalysisStart: (analysisId: string) => void;
}

export default function TextInput({ selectedFunction, selectedLLM, onAnalysisStart }: TextInputProps) {
  const [textContent, setTextContent] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<string[] | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<number>(0);
  const [wordCount, setWordCount] = useState<number>(0);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "text/plain",
      "application/pdf", 
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload TXT, PDF, DOC, or DOCX files only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
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
        setSelectedChunk(0);
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
      // Use selected chunk if chunks exist, otherwise use full text
      const contentToAnalyze = chunks ? chunks[selectedChunk] : textContent;
      
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

  return (
    <div className="flex-1 p-6 flex flex-col" data-testid="text-input-panel">
      {/* File Upload Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
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
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={handleFileUpload}
                  data-testid="file-upload-input"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">TXT, DOC, DOCX, PDF up to 10MB</p>
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
              ({textContent.trim().split(/\s+/).filter(word => word.length > 0).length} words)
            </span>
          )}
        </label>
        <Textarea
          id="text-input"
          className="flex-1 resize-none"
          placeholder="Paste or type the text you want to analyze here. The text input area will expand to accommodate longer texts..."
          value={textContent}
          onChange={(e) => {
            setTextContent(e.target.value);
            setChunks(null); // Clear chunks when manually editing
          }}
          data-testid="text-input-textarea"
        />
        {textContent && textContent.trim().split(/\s+/).filter(word => word.length > 0).length > 1000 && (
          <p className="text-sm text-yellow-600 mt-2">
            ⚠️ Your text has {textContent.trim().split(/\s+/).filter(word => word.length > 0).length} words. 
            Texts over 1000 words may hit token limits. Consider uploading as a file for automatic chunking.
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
            <p className="text-sm text-yellow-800 mb-3">
              Your text was divided into {chunks.length} chunks of ~1000 words each to stay within token limits. 
              Select which chunk to analyze:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {chunks.map((chunk, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedChunk(index)}
                  className={`text-left p-3 rounded border ${
                    selectedChunk === index
                      ? "bg-blue-50 border-blue-300 text-blue-900"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                  data-testid={`chunk-${index}`}
                >
                  <div className="font-medium text-sm">
                    Chunk {index + 1} ({chunk.split(' ').length} words)
                  </div>
                  <div className="text-xs text-gray-600 mt-1 truncate">
                    {chunk.substring(0, 100)}...
                  </div>
                </button>
              ))}
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
