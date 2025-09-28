// Pricing data based on provided specifications
export interface PricingTier {
  amount: number; // Dollar amount
  credits: Record<LLMProviderType, number>; // Credits per LLM provider
}

export interface LLMInfo {
  name: string;
  merits: string[];
  demerits: string[];
}

export type LLMProviderType = "zhi1" | "zhi2" | "zhi3" | "zhi4";

export const PRICING_TIERS: PricingTier[] = [
  {
    amount: 5,
    credits: {
      zhi1: 4275000, // OpenAI
      zhi2: 106840,  // Anthropic
      zhi3: 702000,  // DeepSeek
      zhi4: 6410255, // Perplexity
    },
  },
  {
    amount: 10,
    credits: {
      zhi1: 8977500,
      zhi2: 224360,
      zhi3: 1474200,
      zhi4: 13461530,
    },
  },
  {
    amount: 25,
    credits: {
      zhi1: 23512500,
      zhi2: 587625,
      zhi3: 3861000,
      zhi4: 35256400,
    },
  },
  {
    amount: 50,
    credits: {
      zhi1: 51300000,
      zhi2: 1282100,
      zhi3: 8424000,
      zhi4: 76923050,
    },
  },
  {
    amount: 100,
    credits: {
      zhi1: 115425000,
      zhi2: 2883400,
      zhi3: 18954000,
      zhi4: 173176900,
    },
  },
];

export const LLM_INFO: Record<LLMProviderType, LLMInfo> = {
  zhi1: {
    name: "ZHI 1 (OpenAI)",
    merits: [
      "Fast, cheap, widely compatible",
      "Good balance of creativity + accuracy",
      "Reliable at short/medium rewrites and commercial text",
    ],
    demerits: [
      "Struggles with very dense scholarly material (drops nuance)",
      "More \"AI-detected\" feel in raw outputs (less human signal)",
      "Occasionally hallucinates stylistic quirks",
    ],
  },
  zhi2: {
    name: "ZHI 2 (Anthropic Claude)",
    merits: [
      "Excellent on scholarly, philosophical, and \"thinking-through\" tasks",
      "Strong at staying consistent in long rewrites",
      "More \"polished\" tone, good for academic-sounding prose",
    ],
    demerits: [
      "By far the most expensive",
      "Sometimes cautious / verbose, especially when asked for edgy or non-academic rewrites",
      "Can \"over-summarize\" instead of fully transforming",
    ],
  },
  zhi3: {
    name: "ZHI 3 (DeepSeek)",
    merits: [
      "Cheapest by far",
      "Handles bulk text rewriting and simple transformations well",
      "Decent logical coherence, especially for structured rewriting",
    ],
    demerits: [
      "Noticeably slower than the others",
      "Less nuanced on subtle philosophy/literature than Anthropic",
      "Output can feel mechanical if pushed beyond bulk processing",
    ],
  },
  zhi4: {
    name: "ZHI 4 (Perplexity)",
    merits: [
      "Very cheap for API calls (currently subsidized)",
      "Good for quick turnarounds, exploratory rewrites",
      "Sometimes surprisingly concise and pointed",
    ],
    demerits: [
      "Quality varies — can be shallow compared to Anthropic/OpenAI",
      "Weak on sustained long-form consistency",
    ],
  },
};

// Calculate credits needed for a typical analysis (estimated word count)
export const ANALYSIS_CREDIT_COST = {
  cognitive: 2000,
  "comprehensive-cognitive": 5000,
  microcognitive: 500,
  psychological: 1500,
  "comprehensive-psychological": 4000,
  micropsychological: 400,
  psychopathological: 1500,
  "comprehensive-psychopathological": 4000,
  micropsychopathological: 400,
} as const;