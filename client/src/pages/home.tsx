import { useState } from "react";
import { Brain, Settings, HelpCircle, Bookmark, Loader2, CreditCard } from "lucide-react";
import Sidebar from "@/components/sidebar";
import LLMSelector from "@/components/llm-selector";
import TextInput from "@/components/text-input";
import ResultsPanel from "@/components/results-panel";
import DiscussionModal from "@/components/discussion-modal";
import UserMenu from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  const [showUserHistory, setShowUserHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: savedAnalyses = [], refetch: refetchSaved } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses/saved"],
    // Always fetch saved analyses for the count, but refetch when showing the panel
    staleTime: showSavedAnalyses ? 0 : 5 * 60 * 1000, // 5 minutes when not showing panel
  });

  const { data: userHistoryAnalyses = [], refetch: refetchHistory } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses/mine"],
    enabled: showUserHistory,
  });

  const handleNewAnalysis = () => {
    setCurrentAnalysisId(null);
    setIsDiscussionOpen(false);
    setResetKey(prev => prev + 1); // This will force TextInput to reset
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="text-primary text-2xl" data-testid="brain-icon" />
              <h1 className="text-xl font-bold text-gray-900" data-testid="app-title">Psychology Pro</h1>
              <span className="text-sm text-gray-500" data-testid="app-subtitle">Cognitive Profiler</span>
              <a 
                href="mailto:contact@zhisystems.ai" 
                className="text-sm text-blue-600 hover:text-blue-800 underline ml-4"
                data-testid="contact-link"
              >
                Contact Us
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant={showSavedAnalyses ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setShowSavedAnalyses(!showSavedAnalyses)}
                data-testid="saved-analyses-button"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Saved ({savedAnalyses.length})
              </Button>
              <Button variant="ghost" size="sm" data-testid="help-button">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="settings-button">
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/credits'}
                data-testid="credits-button"
              >
                <CreditCard className="h-4 w-4" />
              </Button>
              <UserMenu onShowHistory={() => setShowUserHistory(!showUserHistory)} />
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
                            }}
                            data-testid={`load-analysis-${analysis.id}`}
                          >
                            Load
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {showUserHistory && (
                <div className="bg-white border-b border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">My Analysis History</h3>
                  {userHistoryAnalyses.length === 0 ? (
                    <p className="text-sm text-gray-500">No analyses in your history yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {userHistoryAnalyses.map((analysis) => (
                        <div key={analysis.id} className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm">
                          <div>
                            <span className="font-medium">{analysis.type}</span>
                            <span className="text-blue-600 ml-2">• {analysis.llmProvider}</span>
                            <span className="text-gray-400 ml-2">• {new Date(analysis.createdAt!).toLocaleDateString()}</span>
                            <span className="text-gray-400 ml-2">
                              • {analysis.status === "completed" ? "Completed" : analysis.saved ? "Saved" : "In Progress"}
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setCurrentAnalysisId(analysis.id);
                              setShowUserHistory(false);
                            }}
                            data-testid={`load-user-analysis-${analysis.id}`}
                          >
                            Load
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  onDiscussionToggle={() => setIsDiscussionOpen(true)}
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
