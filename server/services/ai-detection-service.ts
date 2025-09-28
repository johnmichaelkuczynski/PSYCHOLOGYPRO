export interface AIDetectionResult {
  document_classification: 'HUMAN_ONLY' | 'MIXED' | 'AI_ONLY';
  class_probabilities: {
    human: number;
    ai: number;
    mixed: number;
  };
  predicted_class: string;
  confidence_category: 'high' | 'medium' | 'low';
  completely_generated_prob: number;
  overall_burstiness: number;
  sentences?: Array<{
    sentence: string;
    generated_prob: number;
  }>;
}

export class AIDetectionService {
  private apiKey: string;
  private baseUrl = 'https://api.gptzero.me/v2';

  constructor() {
    const apiKey = process.env.GPTZERO_API_KEY;
    if (!apiKey) {
      throw new Error('GPTZERO_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async detectAI(text: string): Promise<AIDetectionResult> {
    try {
      // Validate text length (GPTZero has a 50,000 character limit)
      if (text.length > 50000) {
        text = text.substring(0, 50000);
      }

      const response = await fetch(`${this.baseUrl}/predict/text`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          document: text,
          multilingual: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPTZero API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: AIDetectionResult = await response.json();
      return result;
    } catch (error) {
      console.error('AI Detection Service error:', error);
      throw error;
    }
  }

  // Helper method to determine if content is flagged as AI
  isAIGenerated(result: AIDetectionResult, threshold: number = 0.5): boolean {
    return result.class_probabilities.ai > threshold || 
           result.document_classification === 'AI_ONLY' ||
           (result.document_classification === 'MIXED' && result.class_probabilities.ai > result.class_probabilities.human);
  }

  // Helper method to get a user-friendly message
  getDetectionMessage(result: AIDetectionResult): string {
    const aiProb = Math.round(result.class_probabilities.ai * 100);
    const humanProb = Math.round(result.class_probabilities.human * 100);
    
    switch (result.document_classification) {
      case 'AI_ONLY':
        return `🚨 HIGH AI DETECTION: This content appears to be ${aiProb}% AI-generated. Consider verifying the authenticity of this submission.`;
      case 'MIXED':
        return `⚠️ MIXED CONTENT DETECTED: This content appears to be ${aiProb}% AI-generated and ${humanProb}% human-written. Some sections may be AI-generated.`;
      case 'HUMAN_ONLY':
        return `✅ HUMAN CONTENT: This content appears to be ${humanProb}% human-written.`;
      default:
        return `Analysis completed with ${result.confidence_category} confidence.`;
    }
  }

  // Helper method to get severity level for UI styling
  getDetectionSeverity(result: AIDetectionResult): 'high' | 'medium' | 'low' {
    if (result.document_classification === 'AI_ONLY') return 'high';
    if (result.document_classification === 'MIXED') return 'medium';
    return 'low';
  }
}