import { Lightbulb, Brain, Users, UserCheck, Stethoscope, ClipboardCheck, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisTypeType } from "@shared/schema";

interface SidebarProps {
  selectedFunction: AnalysisTypeType;
  onFunctionChange: (func: AnalysisTypeType) => void;
}

const FUNCTIONS = [
  {
    key: "cognitive" as AnalysisTypeType,
    label: "Cognitive",
    icon: Lightbulb,
    available: true,
  },
  {
    key: "comprehensive-cognitive" as AnalysisTypeType,
    label: "Comprehensive Cognitive", 
    icon: Brain,
    available: true,
  },
  {
    key: "microcognitive" as AnalysisTypeType,
    label: "Micro Cognitive (Fast)",
    icon: Zap,
    available: true,
  },
  {
    key: "psychological" as AnalysisTypeType,
    label: "Psychological",
    icon: UserCheck,
    available: true,
  },
  {
    key: "comprehensive-psychological" as AnalysisTypeType,
    label: "Comprehensive Psychological",
    icon: Users,
    available: true,
  },
  {
    key: "micropsychological" as AnalysisTypeType,
    label: "Micro Psychological (Fast)",
    icon: Zap,
    available: true,
  },
  {
    key: "psychopathological" as AnalysisTypeType,
    label: "Psychopathological",
    icon: Stethoscope,
    available: true,
  },
  {
    key: "comprehensive-psychopathological" as AnalysisTypeType,
    label: "Comprehensive Psychopathological",
    icon: ClipboardCheck,
    available: true,
  },
  {
    key: "micropsychopathological" as AnalysisTypeType,
    label: "Micro Psychopathological (Fast)",
    icon: Zap,
    available: true,
  },
];

const RECENT_ANALYSES: string[] = [];

export default function Sidebar({ selectedFunction, onFunctionChange }: SidebarProps) {
  return (
    <aside className="w-72 bg-white shadow-sm border-r border-gray-200" data-testid="sidebar">
      <nav className="mt-8 px-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Analysis Functions
          </div>
          
          {FUNCTIONS.map((func) => {
            const Icon = func.icon;
            const isSelected = selectedFunction === func.key;
            const isAvailable = func.available;
            
            return (
              <Button
                key={func.key}
                variant={isSelected ? "default" : "ghost"}
                className="w-full justify-start text-sm font-medium h-auto py-3 px-3"
                onClick={() => onFunctionChange(func.key)}
                data-testid={`function-${func.key}`}
              >
                <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="text-left leading-tight">{func.label}</span>
              </Button>
            );
          })}
        </div>

        {RECENT_ANALYSES.length > 0 && (
          <div className="mt-8">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Recent Analyses
            </div>
            <div className="space-y-2">
              {RECENT_ANALYSES.map((filename, index) => (
                <div 
                  key={index}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 cursor-pointer p-2 rounded hover:bg-gray-50"
                  data-testid={`recent-analysis-${index}`}
                >
                  <FileText className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="truncate">{filename}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
