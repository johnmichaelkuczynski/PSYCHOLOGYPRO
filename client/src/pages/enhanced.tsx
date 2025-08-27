import { useState } from "react";
import { Brain, Settings, HelpCircle } from "lucide-react";
import Sidebar from "@/components/enhanced-sidebar";
import LLMSelector from "@/components/llm-selector";
import TextInput from "@/components/enhanced-text-input";
import ResultsPanel from "@/components/enhanced-results-panel";
import DiscussionModal from "@/components/discussion-modal";
import { Button } from "@/components/ui/button";
import type { LLMProviderType, EnhancedAnalysisTypeType } from "../../shared/schema.js";

export default function Enhanced() {
  const [selectedFunction, setSelectedFunction] = useState<EnhancedAnalysisTypeType>("enhanced-cognitive-normal");
  const [selectedLLM, setSelectedLLM] = useState<LLMProviderType>("zhi1");
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const handleNewAnalysis = () => {
    setCurrentAnalysisId(null);
    setIsDiscussionOpen(false);
    setResetKey(prev => prev + 1); // This will force TextInput to reset
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
              <span className="text-sm text-gray-500" data-testid="app-subtitle">Enhanced Protocol</span>
              <a 
                href="mailto:contact@zhisystems.ai" 
                className="text-sm text-blue-600 hover:text-blue-800 underline ml-4"
                data-testid="contact-link"
              >
                Contact Us
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" data-testid="help-button">
                <HelpCircle className="h-4 w-4" />
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
                    Enhanced {selectedFunction.includes("cognitive") ? "Cognitive" : 
                             selectedFunction.includes("psychological") ? "Psychological" : 
                             "Psychopathological"} Analysis
                  </h2>
                  <p className="text-sm text-gray-600" data-testid="analysis-description">
                    {selectedFunction.includes("comprehensive") ? "4-Phase Comprehensive Protocol" : "Normal Protocol (Phase 1 Only)"}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="outline" data-testid="save-analysis-button">
                    Save Analysis
                  </Button>
                  <Button variant="outline" data-testid="download-analysis-button">
                    Download TXT
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
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