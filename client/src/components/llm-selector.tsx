import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LLMProviderType } from "@shared/schema";

interface LLMSelectorProps {
  selectedLLM: LLMProviderType;
  onLLMChange: (llm: LLMProviderType) => void;
}

const LLM_OPTIONS: { key: LLMProviderType; label: string; available: boolean }[] = [
  { key: "zhi1", label: "ZHI 1", available: true },
  { key: "zhi2", label: "ZHI 2", available: true },
  { key: "zhi3", label: "ZHI 3", available: true },
  { key: "zhi4", label: "ZHI 4", available: true },
];

export default function LLMSelector({ selectedLLM, onLLMChange }: LLMSelectorProps) {
  return (
    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200" data-testid="llm-selector">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Analysis Engine
      </label>
      <div className="grid grid-cols-2 gap-2">
        {LLM_OPTIONS.map((option) => (
          <Button
            key={option.key}
            variant={selectedLLM === option.key ? "default" : "outline"}
            className="btn-llm"
            onClick={() => onLLMChange(option.key)}
            data-testid={`llm-${option.key}`}
          >
            <Bot className="mr-2 h-4 w-4" />
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
