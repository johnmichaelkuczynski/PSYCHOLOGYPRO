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
      label: "Intelligence Protocol (Normal)",
      description: "Phase 1 only: 18 direct questions with anti-midwit calibration",
      icon: Brain,
      color: "blue"
    },
    {
      id: "enhanced-cognitive-comprehensive" as EnhancedAnalysisTypeType,
      label: "Intelligence Protocol (Comprehensive)",
      description: "4-Phase: Questions + Pushback + Walmart Metric + Final Validation",
      icon: Brain,
      color: "blue"
    },
    {
      id: "enhanced-psychological-normal" as EnhancedAnalysisTypeType,
      label: "Psychological Protocol (Normal)",
      description: "Phase 1 only: 18 psychological questions with enhanced calibration",
      icon: Zap,
      color: "green"
    },
    {
      id: "enhanced-psychological-comprehensive" as EnhancedAnalysisTypeType,
      label: "Psychological Protocol (Comprehensive)",
      description: "4-Phase: Psychological profiling with pushback and sniper amendments",
      icon: Zap,
      color: "green"
    },
    {
      id: "enhanced-psychopathological-normal" as EnhancedAnalysisTypeType,
      label: "Psychopathology Protocol (Normal)",
      description: "Phase 1 only: 15 pathology questions with enhanced scoring",
      icon: AlertTriangle,
      color: "red"
    },
    {
      id: "enhanced-psychopathological-comprehensive" as EnhancedAnalysisTypeType,
      label: "Psychopathology Protocol (Comprehensive)",
      description: "4-Phase: Pathology assessment with comprehensive validation",
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
          Enhanced protocols with anti-midwit calibration, pushback validation, Walmart metrics, and sniper amendments addressing quality issues with standard analysis.
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