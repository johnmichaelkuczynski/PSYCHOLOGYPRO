import { Brain, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnhancedAnalysisTypeType } from "../../shared/schema.js";

interface SidebarProps {
  selectedFunction: EnhancedAnalysisTypeType;
  onFunctionChange: (func: EnhancedAnalysisTypeType) => void;
}

export default function EnhancedSidebar({ selectedFunction, onFunctionChange }: SidebarProps) {
  const analysisTypes = [
    {
      id: "enhanced-cognitive-normal" as EnhancedAnalysisTypeType,
      label: "Cognitive (Normal)",
      description: "Intelligence analysis - Phase 1 only",
      icon: Brain,
      color: "blue"
    },
    {
      id: "enhanced-cognitive-comprehensive" as EnhancedAnalysisTypeType,
      label: "Cognitive (Comprehensive)",
      description: "Intelligence analysis - 4-Phase Protocol",
      icon: Brain,
      color: "blue"
    },
    {
      id: "enhanced-psychological-normal" as EnhancedAnalysisTypeType,
      label: "Psychological (Normal)",
      description: "Psychological profiling - Phase 1 only",
      icon: Zap,
      color: "green"
    },
    {
      id: "enhanced-psychological-comprehensive" as EnhancedAnalysisTypeType,
      label: "Psychological (Comprehensive)",
      description: "Psychological profiling - 4-Phase Protocol",
      icon: Zap,
      color: "green"
    },
    {
      id: "enhanced-psychopathological-normal" as EnhancedAnalysisTypeType,
      label: "Psychopathological (Normal)",
      description: "Pathology assessment - Phase 1 only",
      icon: AlertTriangle,
      color: "red"
    },
    {
      id: "enhanced-psychopathological-comprehensive" as EnhancedAnalysisTypeType,
      label: "Psychopathological (Comprehensive)",
      description: "Pathology assessment - 4-Phase Protocol",
      icon: AlertTriangle,
      color: "red"
    },
  ];

  return (
    <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto" data-testid="sidebar">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4" data-testid="sidebar-title">
          Enhanced Analysis Types
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          New 4-phase comprehensive protocols with pushback, Walmart metrics, and sniper amendments for accurate scoring.
        </p>
        
        <div className="space-y-3">
          {analysisTypes.map((type) => {
            const IconComponent = type.icon;
            const isSelected = selectedFunction === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => onFunctionChange(type.id)}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
                data-testid={`analysis-type-${type.id}`}
              >
                <div className="flex items-start space-x-3">
                  <IconComponent
                    className={cn(
                      "h-5 w-5 mt-0.5",
                      isSelected
                        ? "text-primary"
                        : type.color === "blue"
                        ? "text-blue-500"
                        : type.color === "green"
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  />
                  <div className="flex-1">
                    <h3 className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-primary" : "text-gray-900"
                    )}>
                      {type.label}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {type.description}
                    </p>
                    {type.id.includes("comprehensive") && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          NEW PROTOCOL
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}