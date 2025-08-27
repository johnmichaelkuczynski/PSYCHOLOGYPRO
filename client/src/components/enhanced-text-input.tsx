import { useState } from "react";
import { Upload, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LLMProviderType, EnhancedAnalysisTypeType } from "../../shared/schema.js";

interface TextInputProps {
  selectedFunction: EnhancedAnalysisTypeType;
  selectedLLM: LLMProviderType;
  onAnalysisStart: (analysisId: string) => void;
}

export default function EnhancedTextInput({ selectedFunction, selectedLLM, onAnalysisStart }: TextInputProps) {
  const [textContent, setTextContent] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<string[] | null>(null);
  const [selectedChunks, setSelectedChunks] = useState<number[]>([0]);
  const [wordCount, setWordCount] = useState<number>(0);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Client: File selected:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    toast({
      title: "Processing file...",
      description: `Processing ${file.name}, please wait...`,
    });

    // Handle PDF files with new system
    if (file.type === "application/pdf") {
      console.log("Handling PDF upload with new system");
      
      toast({
        title: "Uploading PDF...",
        description: `Uploading ${file.name}, please wait...`,
      });
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload/pdf", {
          method: "POST", 
          body: formData
        });
        
        const result = await response.json();
        console.log("PDF upload result:", result);
        
        if (!response.ok || !result.ok) {
          toast({
            title: "PDF upload failed",
            description: result.error || "Could not upload PDF file",
            variant: "destructive",
          });
          return;
        }

        // Show success 
        toast({
          title: "✅ PDF uploaded successfully!",
          description: `${result.name} (${(result.size/1024).toFixed(1)}KB) uploaded`,
        });
        
        setUploadedFile(file);
        
        // Extract text automatically
        try {
          const extractResponse = await fetch(`/api/extract/${result.id}`);
          const extractResult = await extractResponse.json();
          
          if (extractResult.ok && extractResult.text) {
            const extractedText = extractResult.text;
            setTextContent(extractedText);
            const wc = countWords(extractedText);
            setWordCount(wc);
            
            if (wc > 1000) {
              const textChunks = chunkText(extractedText);
              setChunks(textChunks);
              setSelectedChunks([0]);
              toast({
                title: "Text extracted and chunked",
                description: `${textChunks.length} chunks created from PDF`
              });
            } else {
              setChunks(null);
              setSelectedChunks([0]);
            }
            
            toast({
              title: "PDF text extracted",
              description: `${wc} words extracted and ready for analysis`
            });
          }
        } catch (error) {
          console.warn("Text extraction failed:", error);
          setTextContent(`PDF "${file.name}" uploaded successfully!\n\nTo analyze your PDF content:\n1. Copy the text you want to analyze\n2. Paste it here and replace this message\n3. Select your analysis options below`);
        }
        
        return;
        
      } catch (error) {
        console.error("PDF upload error:", error);
        toast({
          title: "PDF upload failed",
          description: "Could not upload PDF file",
          variant: "destructive",
        });
        return;
      }
    }

    const allowedTypes = [
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload TXT, PDF, DOC, or DOCX files only.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest("/api/files/parse", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          title: "File parsing failed",
          description: result.error || "Could not parse the file",
          variant: "destructive",
        });
        return;
      }

      const extractedText = result.text;
      setTextContent(extractedText);
      setUploadedFile(file);
      
      const wc = countWords(extractedText);
      setWordCount(wc);

      if (wc > 1000) {
        const textChunks = chunkText(extractedText);
        setChunks(textChunks);
        setSelectedChunks([0]);
        
        toast({
          title: "File processed and chunked",
          description: `${textChunks.length} chunks created from ${file.name}`
        });
      } else {
        setChunks(null);
        setSelectedChunks([0]);
        
        toast({
          title: "File processed successfully",
          description: `${wc} words extracted from ${file.name}`
        });
      }

    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTextChange = (value: string) => {
    setTextContent(value);
    const wc = countWords(value);
    setWordCount(wc);

    if (wc > 1000) {
      const textChunks = chunkText(value);
      setChunks(textChunks);
      setSelectedChunks([0]);
    } else {
      setChunks(null);
      setSelectedChunks([0]);
    }
  };

  const handleChunkSelection = (chunkIndex: number) => {
    setSelectedChunks(prev => {
      if (prev.includes(chunkIndex)) {
        return prev.filter(i => i !== chunkIndex);
      } else {
        return [...prev, chunkIndex].sort((a, b) => a - b);
      }
    });
  };

  const selectAllChunks = () => {
    if (chunks) {
      setSelectedChunks(chunks.map((_, index) => index));
    }
  };

  const deselectAllChunks = () => {
    setSelectedChunks([]);
  };

  const startAnalysis = async () => {
    if (!textContent.trim()) {
      toast({
        title: "No text to analyze",
        description: "Please enter some text or upload a file first.",
        variant: "destructive",
      });
      return;
    }

    if (chunks && selectedChunks.length === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one text chunk to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      let finalText = textContent;
      
      if (chunks && selectedChunks.length > 0) {
        finalText = selectedChunks.map(index => chunks[index]).join('\n\n--- CHUNK BREAK ---\n\n');
      }

      const response = await apiRequest("/api/enhanced-analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedFunction,
          textContent: finalText,
          additionalContext,
          llmProvider: selectedLLM,
        }),
      });

      const { analysisId } = await response.json();
      onAnalysisStart(analysisId);
      
      toast({
        title: "Enhanced analysis started",
        description: "Your text is being analyzed with the new enhanced protocol. Results will stream in real-time.",
      });
    } catch (error) {
      toast({
        title: "Analysis failed to start",
        description: "Could not start the enhanced analysis. Please try again.",
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
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  data-testid="file-upload-input"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">TXT, PDF, DOC, DOCX up to 10MB</p>
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
          placeholder="Paste your text here or upload a document above..."
          value={textContent}
          onChange={(e) => handleTextChange(e.target.value)}
          className="flex-1 min-h-[200px] resize-none"
          data-testid="text-input-textarea"
        />
      </div>

      {/* Chunk Selection */}
      {chunks && chunks.length > 1 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Chunks to Analyze ({selectedChunks.length}/{chunks.length} selected)
            </label>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllChunks}
                data-testid="select-all-chunks"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={deselectAllChunks}
                data-testid="deselect-all-chunks"
              >
                Deselect All
              </Button>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
            {chunks.map((chunk, index) => (
              <label key={index} className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChunks.includes(index)}
                  onChange={() => handleChunkSelection(index)}
                  className="mt-1"
                  data-testid={`chunk-checkbox-${index}`}
                />
                <span className="text-sm text-gray-600">
                  <strong>Chunk {index + 1}:</strong> {chunk.substring(0, 100)}...
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Additional Context */}
      <div className="mt-4">
        <label htmlFor="additional-context" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Context (Optional)
        </label>
        <Textarea
          id="additional-context"
          placeholder="Add any relevant information about the text, author, or context that might be helpful for analysis..."
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          className="h-20 resize-none"
          data-testid="additional-context-textarea"
        />
      </div>

      {/* Start Analysis Button */}
      <div className="mt-6">
        <Button
          onClick={startAnalysis}
          disabled={isAnalyzing || !textContent.trim()}
          className="w-full"
          data-testid="start-analysis-button"
        >
          <Play className="h-4 w-4 mr-2" />
          {isAnalyzing ? "Starting Enhanced Analysis..." : "Start Enhanced Analysis"}
        </Button>
      </div>
    </div>
  );
}