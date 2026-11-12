import { useState } from "react";
import { Brain, Settings, HelpCircle, Bookmark, Loader2, Video, Sparkles, Download } from "lucide-react";
import Sidebar from "@/components/sidebar";
import LLMSelector from "@/components/llm-selector";
import TextInput from "@/components/text-input";
import ResultsPanel from "@/components/results-panel";
import DiscussionModal from "@/components/discussion-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import type { LLMProviderType, AnalysisTypeType, Analysis } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [selectedFunction, setSelectedFunction] = useState<AnalysisTypeType>("cognitive");
  const [selectedLLM, setSelectedLLM] = useState<LLMProviderType>("zhi1");
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: savedAnalyses = [], refetch: refetchSaved } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses/saved"],
    // Always fetch saved analyses for the count, but refetch when showing the panel
    staleTime: showSavedAnalyses ? 0 : 5 * 60 * 1000, // 5 minutes when not showing panel
  });
  const { data: historyRows = [] } = useQuery<any[]>({
    queryKey: ["/api/analysis-settings/tractatus_mode"],
    staleTime: 0,
  });

  const handleNewAnalysis = () => {
    setCurrentAnalysisId(null);
    setIsDiscussionOpen(false);
    setResetKey(prev => prev + 1); // This will force TextInput to reset
    trackEvent("new_analysis_started");
  };

  const handleSaveAnalysis = async () => {
    if (!currentAnalysisId) {
      toast({
        title: "No analysis to save",
        description: "Please complete an analysis first.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("PATCH", `/api/analyses/${currentAnalysisId}/save`);
      trackEvent("analysis_saved");
      
      // Refresh saved analyses if shown
      if (showSavedAnalyses) {
        await refetchSaved();
      }
      
      toast({
        title: "Analysis saved",
        description: "Your analysis has been successfully saved to storage.",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Unable to save analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadAnalysis = async () => {
    if (!currentAnalysisId) {
      toast({
        title: "No analysis to download",
        description: "Please complete an analysis first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/analyses/${currentAnalysisId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `analysis_${currentAnalysisId}.txt`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      trackEvent("analysis_downloaded", { format: "txt" });

      toast({
        title: "Download complete",
        description: "Analysis results have been downloaded as a text file.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Unable to download analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 py-2 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <a
                href="https://zhisystems.ai"
                aria-label="Visit Zhi Systems"
                className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-gray-800 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="zhi-systems-link"
              >
                <img
                  src="/zhi-systems-mark.png"
                  alt=""
                  className="h-9 w-9 object-contain"
                  draggable={false}
                />
                <span className="text-[9px] font-semibold leading-none">Zhi Systems</span>
              </a>
              <Brain className="text-primary text-2xl" data-testid="brain-icon" />
              <h1 className="text-xl font-bold text-gray-900" data-testid="app-title">Psychology Pro</h1>
              <span className="hidden text-sm text-gray-500 md:inline" data-testid="app-subtitle">Cognitive Profiler</span>
              <a 
                href="mailto:contact@zhisystems.ai" 
                className="text-sm text-blue-600 hover:text-blue-800 underline sm:ml-4"
                data-testid="contact-link"
              >
                Contact Us
              </a>
              <a 
                href="https://www.youtube.com/watch?v=0hIA4NsETZw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline sm:ml-3"
                data-testid="instructional-video-link"
              >
                <Video className="h-3.5 w-3.5" />
                Instructional Video
              </a>
            </div>
            <div className="flex items-center justify-between gap-1 sm:justify-start sm:space-x-4 sm:gap-0">
              <Button 
                variant={showSavedAnalyses ? "default" : "ghost"} 
                size="sm" 
                 onClick={() => {
                   const nextValue = !showSavedAnalyses;
                   setShowSavedAnalyses(nextValue);
                   if (nextValue) {
                     trackEvent("saved_history_viewed");
                   }
                 }}
                data-testid="saved-analyses-button"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Saved ({savedAnalyses.length})
              </Button>
              <Button variant="ghost" size="sm" data-testid="help-button">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild data-testid="diagnostics-button">
                <a href="/diagnostic">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Diagnostic
                </a>
              </Button>
              <Button variant="ghost" size="sm" data-testid="settings-button">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        <Sidebar 
          selectedFunction={selectedFunction}
          onFunctionChange={setSelectedFunction}
        />

        <main className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Content Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4" data-testid="content-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900" data-testid="analysis-title">
                    {selectedFunction === "cognitive" ? "Cognitive Analysis" : "Analysis"}
                  </h2>
                  <p className="text-sm text-gray-600" data-testid="analysis-description">
                    Analyze text for cognitive patterns and intelligence markers
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    data-testid="save-analysis-button"
                    onClick={handleSaveAnalysis}
                    disabled={!currentAnalysisId || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Analysis"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    data-testid="download-analysis-button"
                    onClick={handleDownloadAnalysis}
                    disabled={!currentAnalysisId}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download TXT
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {showSavedAnalyses && (
                <div className="bg-white border-b border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Saved Analyses</h3>
                  {savedAnalyses.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved analyses yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {savedAnalyses.map((analysis) => (
                        <div key={analysis.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div>
                            <span className="font-medium">{analysis.type}</span>
                            <span className="text-gray-500 ml-2">• {analysis.llmProvider}</span>
                            <span className="text-gray-400 ml-2">• {new Date(analysis.createdAt!).toLocaleDateString()}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setCurrentAnalysisId(analysis.id);
                              setShowSavedAnalyses(false);
                              trackEvent("saved_analysis_loaded", {
                                analysis_type: analysis.type,
                                provider: analysis.llmProvider,
                              });
                            }}
                            data-testid={`load-analysis-${analysis.id}`}
                          >
                            Load
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 border-t pt-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">DB scaffold setting</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(historyRows, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 h-full">
                {/* Input Panel */}
                <div className="border-r border-gray-200 flex flex-col">
                  <LLMSelector 
                    selectedLLM={selectedLLM}
                    onLLMChange={setSelectedLLM}
                  />
                  
                  <TextInput 
                    key={resetKey}
                    selectedFunction={selectedFunction}
                    selectedLLM={selectedLLM}
                    onAnalysisStart={(analysisId) => setCurrentAnalysisId(analysisId)}
                  />
                </div>

                {/* Results Panel */}
                <ResultsPanel 
                  analysisId={currentAnalysisId}
                   onDiscussionToggle={() => {
                     setIsDiscussionOpen(true);
                     trackEvent("discussion_opened");
                   }}
                  onNewAnalysis={handleNewAnalysis}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <DiscussionModal 
        isOpen={isDiscussionOpen}
        onClose={() => setIsDiscussionOpen(false)}
        analysisId={currentAnalysisId}
      />
    </div>
  );
}
