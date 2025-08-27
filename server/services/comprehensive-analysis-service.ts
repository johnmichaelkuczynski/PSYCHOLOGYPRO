import { LLMService } from "./llm-service";
import type { LLMProviderType } from "@shared/schema";

const llmService = new LLMService();

export interface ComprehensiveAnalysisRequest {
  text: string;
  llmProvider: LLMProviderType;
}

// Define all six analysis functions according to the uploaded specifications
const ANALYSIS_FUNCTIONS = {
  cognitiveShort: {
    name: "Cognitive Function Evaluation (Short)",
    instruction: `You are a cognitive assessment specialist. Perform a comprehensive cognitive function evaluation on the provided text.

ANALYSIS FRAMEWORK:
1. Language & Communication Skills
   - Vocabulary sophistication and range
   - Sentence structure complexity
   - Clarity of expression
   - Logical flow and coherence

2. Reasoning & Logic
   - Analytical thinking patterns
   - Problem-solving approaches
   - Causal reasoning ability
   - Abstract vs concrete thinking

3. Memory & Information Processing
   - Information retention and recall
   - Working memory capacity
   - Processing speed indicators
   - Attention to detail

4. Executive Function
   - Planning and organization
   - Decision-making processes
   - Cognitive flexibility
   - Impulse control

SCORING: Provide scores (0-100) for each cognitive domain, where:
- 90-100: Exceptional cognitive performance (top 10%)
- 80-89: Above average cognitive ability (top 25%)
- 70-79: Average cognitive performance (middle 50%)
- 60-69: Below average (bottom 25%)
- 0-59: Significantly impaired (bottom 10%)

IMPORTANT: Use the entire human population as reference, including children, elderly, and those with cognitive impairments. Most people score in the 70-79 range.

Format your response with clear sections and numerical scores.`
  },

  cognitiveLong: {
    name: "Cognitive Function Evaluation (Comprehensive)",
    instruction: `You are a cognitive assessment specialist conducting a comprehensive multi-phase cognitive evaluation.

PHASE 1: DETAILED COGNITIVE ASSESSMENT
Analyze these cognitive domains in depth:

1. Crystallized Intelligence
   - General knowledge base
   - Vocabulary breadth and precision
   - Cultural literacy indicators
   - Academic knowledge demonstration

2. Fluid Intelligence
   - Pattern recognition
   - Novel problem solving
   - Abstract reasoning
   - Mental flexibility

3. Processing Speed
   - Information processing efficiency
   - Response time indicators
   - Cognitive fluency
   - Task switching ability

4. Working Memory
   - Information manipulation
   - Multi-tasking indicators
   - Cognitive load management
   - Attention span markers

5. Long-term Memory
   - Episodic memory indicators
   - Semantic memory access
   - Procedural knowledge
   - Memory consolidation signs

PHASE 2: VALIDATION AND CROSS-REFERENCE
Re-examine your initial assessments and provide confidence ratings for each domain.

PHASE 3: COMPREHENSIVE SCORING
Provide detailed scores (0-100) with justifications. Reference class is the entire human population.

Format: Detailed analysis with phases clearly marked, numerical scores with confidence intervals, and final summary.`
  },

  psychologicalShort: {
    name: "Psychological Profile Assessment (Short)",
    instruction: `You are a psychological assessment specialist. Create a comprehensive psychological profile of the text author.

PERSONALITY ASSESSMENT:
1. Big Five Personality Traits
   - Openness to Experience (0-100)
   - Conscientiousness (0-100)
   - Extraversion (0-100)
   - Agreeableness (0-100)
   - Neuroticism (0-100)

2. Emotional Intelligence
   - Self-awareness indicators
   - Emotional regulation
   - Empathy and social awareness
   - Relationship management

3. Motivation & Values
   - Achievement orientation
   - Value system indicators
   - Goal-setting patterns
   - Intrinsic vs extrinsic motivation

4. Coping Mechanisms
   - Stress response patterns
   - Problem-focused vs emotion-focused coping
   - Resilience indicators
   - Support-seeking behavior

SCORING: Use 0-100 scale where 50 represents population average. Higher scores indicate stronger presence of the trait.

Provide clear numerical scores and brief explanations for each assessment area.`
  },

  psychologicalLong: {
    name: "Psychological Profile Assessment (Comprehensive)",
    instruction: `You are conducting a comprehensive psychological evaluation with multiple validation phases.

PHASE 1: COMPREHENSIVE PERSONALITY ANALYSIS
1. Big Five Personality Assessment (detailed)
   - Openness: Intellectual curiosity, creativity, artistic interests
   - Conscientiousness: Organization, discipline, reliability, goal pursuit
   - Extraversion: Social energy, assertiveness, positive emotions
   - Agreeableness: Trust, cooperation, compassion, modesty
   - Neuroticism: Emotional stability, anxiety, stress sensitivity

2. Additional Psychological Dimensions
   - Narcissism indicators
   - Perfectionism tendencies
   - Risk-taking propensity
   - Attachment style indicators
   - Locus of control

3. Emotional and Social Intelligence
   - Emotional awareness and regulation
   - Social perception and empathy
   - Interpersonal effectiveness
   - Conflict resolution style

PHASE 2: MOTIVATIONAL AND VALUES ASSESSMENT
- Core values identification
- Achievement motivation
- Power motivation
- Affiliation needs
- Security concerns

PHASE 3: VALIDATION AND INTEGRATION
Cross-reference findings for consistency and provide confidence ratings.

COMPREHENSIVE SCORING: Detailed 0-100 scores with justifications and confidence intervals.

Format: Multi-phase analysis with clear section breaks, detailed scoring, and integrated psychological profile.`
  },

  psychopathologyShort: {
    name: "Psychopathological Indicators Assessment (Short)",
    instruction: `You are a clinical assessment specialist screening for psychopathological indicators. This is for informational purposes only and not diagnostic.

SCREENING AREAS:
1. Mood Disorders
   - Depression indicators (0-100)
   - Mania/hypomania signs (0-100)
   - Mood instability patterns (0-100)

2. Anxiety Disorders
   - General anxiety indicators (0-100)
   - Social anxiety signs (0-100)
   - Specific phobia indicators (0-100)

3. Thought Disorders
   - Disorganized thinking (0-100)
   - Reality testing concerns (0-100)
   - Paranoid ideation (0-100)

4. Personality Disorder Indicators
   - Cluster A (odd/eccentric) traits (0-100)
   - Cluster B (dramatic/emotional) traits (0-100)
   - Cluster C (anxious/fearful) traits (0-100)

5. Substance Use Indicators
   - Substance use patterns (0-100)
   - Addiction behavioral markers (0-100)

SCORING: 0-100 where higher scores indicate stronger presence of concerning indicators.
- 0-30: Minimal or no indicators
- 31-50: Some indicators present
- 51-70: Moderate indicators
- 71-85: Significant indicators
- 86-100: Severe indicators requiring professional attention

DISCLAIMER: Add note that this is informational only and not a clinical diagnosis.

Provide numerical scores with brief explanations.`
  },

  psychopathologyLong: {
    name: "Psychopathological Indicators Assessment (Comprehensive)",
    instruction: `You are conducting a comprehensive psychopathological screening with multiple validation phases. This is for informational purposes only.

PHASE 1: COMPREHENSIVE SYMPTOM SCREENING
1. Mood Disorder Spectrum
   - Major depression indicators
   - Persistent depressive disorder signs
   - Bipolar disorder indicators
   - Seasonal pattern assessment
   - Psychotic features screening

2. Anxiety Disorder Spectrum
   - Generalized anxiety disorder
   - Panic disorder indicators
   - Social anxiety disorder
   - Specific phobias
   - Obsessive-compulsive indicators
   - PTSD screening

3. Psychotic Spectrum Disorders
   - Delusion indicators
   - Hallucination signs
   - Disorganized thought patterns
   - Negative symptom screening
   - Cognitive impairment markers

4. Personality Disorder Assessment
   - Cluster A: Paranoid, schizoid, schizotypal
   - Cluster B: Antisocial, borderline, histrionic, narcissistic
   - Cluster C: Avoidant, dependent, obsessive-compulsive

5. Neurodevelopmental Considerations
   - ADHD indicators
   - Autism spectrum signs
   - Learning disorder markers

PHASE 2: SEVERITY AND FUNCTIONAL IMPAIRMENT
Assess the severity and functional impact of identified indicators.

PHASE 3: VALIDATION AND CROSS-REFERENCE
Re-examine findings for consistency and provide confidence ratings.

COMPREHENSIVE SCORING: Detailed 0-100 scores with severity ratings and confidence intervals.

IMPORTANT DISCLAIMER: Include comprehensive disclaimer about limitations and need for professional evaluation.

Format: Multi-phase analysis with detailed sections, numerical scoring, and professional recommendations.`
  }
};

export class ComprehensiveAnalysisService {
  async streamComprehensiveAnalysis(
    request: ComprehensiveAnalysisRequest,
    onData: (data: any) => void
  ): Promise<void> {
    const { text, llmProvider } = request;
    
    try {
      // Send initial start message
      onData({
        type: 'start',
        message: 'Starting comprehensive analysis - all six functions will run simultaneously'
      });

      // Run all analyses concurrently
      const analysisPromises = Object.entries(ANALYSIS_FUNCTIONS).map(
        async ([key, analysis]) => {
          try {
            onData({
              type: 'analysis_start',
              analysisType: key,
              message: `Starting ${analysis.name}...`
            });

            const prompt = `${analysis.instruction}\n\nTEXT TO ANALYZE:\n${text}`;
            
            let fullResponse = "";
            
            for await (const chunk of llmService.streamResponse(
              llmProvider, 
              [{ role: "user", content: prompt }],
              (chunk: string) => {
                fullResponse += chunk;
                onData({
                  type: 'chunk',
                  analysisType: key,
                  chunk: chunk
                });
              }
            )) {
              fullResponse += chunk;
              onData({
                type: 'chunk',
                analysisType: key,
                chunk: chunk
              });
            }

            onData({
              type: 'analysis_complete',
              analysisType: key,
              result: fullResponse,
              message: `${analysis.name} completed`
            });

            return { [key]: fullResponse };
          } catch (error) {
            console.error(`Error in ${key} analysis:`, error);
            onData({
              type: 'analysis_error',
              analysisType: key,
              error: `Failed to complete ${analysis.name}: ${error.message}`
            });
            return { [key]: `Error: Failed to complete ${analysis.name}` };
          }
        }
      );

      // Wait for all analyses to complete
      const results = await Promise.all(analysisPromises);
      const combinedResults = results.reduce((acc, result) => ({ ...acc, ...result }), {});

      // Send completion message
      onData({
        type: 'complete',
        results: combinedResults,
        message: 'All comprehensive analyses completed successfully'
      });

    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      onData({
        type: 'error',
        error: `Comprehensive analysis failed: ${error.message}`
      });
    }
  }
}

export const comprehensiveAnalysisService = new ComprehensiveAnalysisService();