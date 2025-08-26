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

    // Handle PDF files with the new upload system
    if (file.type === "application/pdf") {
      console.log("Handling PDF upload with new system");
      
      // Show immediate uploading feedback
      toast({
        title: "Uploading PDF...",
        description: `Uploading ${file.name}, please wait...`,
      });
      
      try {
        const { uploadPdf } = await import("@/lib/uploadPdf");
        const result = await uploadPdf(file);
        
        console.log("PDF upload result:", result);
        
        if (!result.ok) {
          toast({
            title: "PDF upload failed",
            description: result.error || "Could not upload PDF file",
            variant: "destructive",
          });
          return;
        }

        // Show success and auto-fill text area with instructions
        toast({
          title: "✅ PDF uploaded successfully!",
          description: `${file.name} is now stored and accessible. Instructions added to text area.`,
        });
        
        setUploadedFile(file);
        
        // Auto-fill text area with PDF content/instructions using extract API
        try {
          const { extractPdfText } = await import("@/lib/fillFromPdf");
          const extractedText = await extractPdfText(result.id);
          setTextContent(extractedText);
        } catch (error) {
          console.warn("Text extraction failed, using fallback instructions");
          setTextContent(`PDF "${file.name}" uploaded successfully!\n\nTo analyze your PDF content:\n1. Open your PDF file\n2. Copy the text you want to analyze\n3. Paste it in this text area\n4. Select your analysis options below\n\nReplace this message with your PDF text content.`);
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

    // Handle other file types with existing system
    const allowedTypes = [
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {
      console.log("Client: File type validation failed:", file.type);
      toast({
        title: "Invalid file type",
        description: `File type "${file.type}" not supported. Please upload TXT, PDF, DOC, or DOCX files only.`,
        variant: "destructive",
      });
      return;
    }

    console.log("Client: File type validation passed");

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
