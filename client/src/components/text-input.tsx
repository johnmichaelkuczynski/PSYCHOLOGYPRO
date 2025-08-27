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

  // Process a file (from input or drag & drop)
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload TXT, PDF, DOC, or DOCX files only.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

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
          setWordCount(0);
          setChunks(null);
          setSelectedChunks([0]);
        }
        
        return;
      } catch (error) {
        console.error("PDF upload error:", error);
        toast({
          title: "PDF upload failed",
          description: "Could not upload PDF file. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Handle other file types (TXT, DOC, DOCX)
    setUploadedFile(file);
    
    toast({
      title: "Uploading file...",
      description: `Uploading ${file.name}, please wait...`,
    });
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/files/parse", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to parse file");
      }
      
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
      console.error("File upload error:", error);
      toast({
        title: "File upload failed",
        description: error instanceof Error ? error.message : "Could not parse the uploaded file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processFile(file);
  };

  // Drag and drop handlers
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

    const file = files[0]; // Only process the first file
    if (files.length > 1) {
      toast({
        title: "Multiple files detected",
        description: "Only the first file will be processed.",
      });
    }

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

  const handleSelectAllChunks = () => {
    if (chunks) {
      setSelectedChunks(chunks.map((_, index) => index));
    }
  };

  const handleDeselectAllChunks = () => {
    setSelectedChunks([]);
  };

  const handleChunkToggle = (index: number) => {
    setSelectedChunks(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="flex-1 p-6 flex flex-col" data-testid="text-input-panel">
      {/* File Upload Area with Drag & Drop */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <div 
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-all ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="file-drop-zone"
        >
          <div className="space-y-1 text-center">
            <Upload className={`text-3xl mx-auto mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="flex text-sm text-gray-600">
              <label 
                htmlFor="file-upload" 
                className="relative cursor-pointer bg-white dark:bg-gray-900 rounded-md font-medium text-primary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
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
            {isDragOver && (
              <p className="text-sm text-blue-600 font-medium animate-pulse">
                Drop your file here!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Text Input Area */}
      <div className="flex-1 flex flex-col">
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
      </div>

      {/* Chunk Selection */}
      {chunks && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Text Chunks ({chunks.length} chunks)
            </h3>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllChunks}
                data-testid="select-all-chunks"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAllChunks}
                data-testid="deselect-all-chunks"
              >
                Deselect All
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {chunks.map((chunk, index) => (
              <label 
                key={index} 
                className="flex items-start space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                data-testid={`chunk-option-${index}`}
              >
                <input
                  type="checkbox"
                  checked={selectedChunks.includes(index)}
                  onChange={() => handleChunkToggle(index)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Chunk {index + 1} ({countWords(chunk)} words)
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {chunk.substring(0, 80)}...
                  </div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Selected {selectedChunks.length} of {chunks.length} chunks
          </p>
        </div>
      )}

      {/* Additional Context */}
      <div className="mt-4">
        <label htmlFor="additional-context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional Context (Optional)
        </label>
        <Textarea
          id="additional-context"
          className="min-h-[80px]"
          placeholder="Provide any additional context that might help with the analysis..."
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          data-testid="additional-context-textarea"
        />
      </div>

      {/* Start Analysis Button */}
      <div className="mt-6">
        <Button
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || !textContent.trim()}
          className="w-full"
          data-testid="start-analysis-button"
        >
          {isAnalyzing ? (
            <>
              <Play className="animate-spin mr-2 h-4 w-4" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}