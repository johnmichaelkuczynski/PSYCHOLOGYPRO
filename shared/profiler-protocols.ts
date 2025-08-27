import type { QuestionSet } from "./profiler-schema";

// Psychological Assessment Questions (Normal = Phase 1 only, Comprehensive = Phases 1-4)
export const PSYCHOLOGICAL_QUESTIONS = [
  "Does the text reveal a stable, coherent self-concept, or is the self fragmented/contradictory?",
  "Is there evidence of ego strength (resilience, capacity to tolerate conflict/ambiguity), or does the psyche rely on brittle defenses?",
  "Are defenses primarily mature (sublimation, humor, anticipation), neurotic (intellectualization, repression), or primitive (splitting, denial, projection)?",
  "Does the writing show integration of affect and thought, or are emotions split off / overly intellectualized?",
  "Is the author's stance defensive/avoidant or direct/engaged?",
  "Does the psyche appear narcissistically organized (grandiosity, fragile self-esteem, hunger for validation), or not?",
  "Are desires/drives expressed openly, displaced, or repressed?",
  "Does the voice suggest internal conflict (superego vs. id, competing identifications), or monolithic certainty?",
  "Is there evidence of object constancy (capacity to sustain nuanced view of others) or splitting (others seen as all-good/all-bad)?",
  "Is aggression integrated (channeled productively) or dissociated/projected?",
  "Is the author capable of irony/self-reflection, or trapped in compulsive earnestness / defensiveness?",
  "Does the text suggest psychological growth potential (openness, curiosity, capacity to metabolize experience) or rigidity?",
  "Is the discourse paranoid / persecutory (others as threats, conspiracies) or reality-based?",
  "Does the tone reflect authentic engagement with reality, or phony simulation of depth?",
  "Is the psyche resilient under stress, or fragile / evasive?",
  "Is there evidence of compulsion or repetition (obsessional returns to the same themes), or flexible progression?",
  "Does the author show capacity for intimacy / genuine connection, or only instrumental/defended relations?",
  "Is shame/guilt worked through constructively or disavowed/projected?"
];

export const PSYCHOLOGICAL_INSTRUCTIONS = [
  "Answer these questions in connection with this text.",
  "Also give a score out of 100.",
  "A score of N/100 means (100–N)/100 outperform the subject with respect to the psychological capacity defined by the question.",
  "You are not grading. You are answering questions.",
  "Do not default to diagnostic checklists; describe configuration of psyche.",
  "Do not conflate verbal confidence with psychological strength.",
  "Summarize the text and categorize the psychological presentation (e.g., narcissistic, depressive, obsessional, resilient, fragmented).",
  "Evaluate relative to the general population, not only \"advanced\" or \"pathological\" groups.",
  "Do not penalize honesty, boldness, or extreme statements if they indicate integration rather than breakdown."
];

// Cognitive Assessment Questions 
export const COGNITIVE_QUESTIONS = [
  "Is it insightful?",
  "Does it develop points? (Or, if it is a short excerpt, is there evidence that it would develop points if extended)?",
  "Is the organization merely sequential (just one point after another, little or no logical scaffolding)? Or are the ideas arranged, not just sequentially but hierarchically?",
  "If the points it makes are not insightful, does it operate skillfully with canons of logic/reasoning?",
  "Are the points cliches? Or are they \"fresh\"?",
  "Does it use technical jargon to obfuscate or to render more precise?",
  "Is it organic? Do points develop in an organic, natural way? Do they 'unfold'? Or are they forced and artificial?",
  "Does it open up new domains? Or, on the contrary, does it shut off inquiry (by conditionalizing further discussion of the matters on acceptance of its internal and possibly very faulty logic)?",
  "Is it actually intelligent or just the work of somebody who, judging by the subject-matter, is presumed to be intelligent (but may not be)?",
  "Is it real or is it phony?",
  "Do the sentences exhibit complex and coherent internal logic?",
  "Is the passage governed by a strong concept? Or is the only organization driven purely by expository (as opposed to epistemic) norms?",
  "Is there system-level control over ideas? In other words, does the author seem to recall what he said earlier and to be in a position to integrate it into points he has made since then?",
  "Are the points 'real'? Are they fresh? Or is some institution or some accepted vein of propaganda or orthodoxy just using the author as a mouth piece?",
  "Is the writing evasive or direct?",
  "Are the statements ambiguous?",
  "Does the progression of the text develop according to who said what or according to what entails or confirms what?",
  "Does the author use other authors to develop his ideas or to cloak his own lack of ideas?",
  "Are there terms that are undefined but should be defined, in the sense that, without definitions, it is difficult or impossible to know what is being said or therefore to evaluate what is being said?",
  "Are there \"free variables\" in the text? IE are there qualifications or points that are made but do not connect to anything later or earlier?",
  "Do new statements develop out of old ones? Or are they merely \"added\" to previous ones, without in any sense being generated by them?",
  "Do new statements clarify or do they lead to more lack of clarity?",
  "Is the passage actually (palpably) smart? Or is it only \"presumption-smart\"? IE is it \"smart\" only in the sense that there exists a presumption that a dumb person would not reference such doctrines?",
  "If your judgment is that it is insightful, can you state that insight in a single sentence? Or if it contains multiple insights, can you state those insights, one per sentence?"
];

export const COGNITIVE_INSTRUCTIONS = [
  "Answer these questions in connection with this text.",
  "Also give a score out of 100.",
  "A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question.",
  "You are not grading; you are answering these questions.",
  "You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms.",
  "You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.",
  "If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively \"superlative\" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.",
  "Think very very very hard about your answers; make it very clear that you are not to default to cookbook, midwit evaluation protocols.",
  "Do not give credit merely for use of jargon or for referencing authorities. Focus on substance. Only give points for scholarly references/jargon if they unambiguously increase substance."
];

export const COGNITIVE_METAPOINTS = [
  "METAPOINT 1: This is not a grading app. You grade the intelligence of what you are given. If you are given a brilliant fragment, you give it a high score. You are not grading essays. You are not looking for completeness (unless the text you are given is clearly such that evaluating intelligence coincides with applying a grading-based metric). Tell the LLM not to 'grade'; their job is to answer the questions, period, and to do so on the basis of the text given, making zero assumptions about whether it is complete or incomplete, or for school or for some other context.",
  "METAPOINT 2: Do not overvalue turns of phrase. An author speaking confidently is not necessarily \"shutting down modes of inquiry\". In fact, it is likely to be the opposite; by putting a clear stake in the ground, he is probably opening them. Another example: casual speech does not mean disorganized thoughts. Don't judge a book by its cover.",
  "METAPOINT 3: The app should always (in both normal and comprehensive mode) start by summarizing the text and also categorizing it.",
  "METAPOINT 4: The app should not change the grading based on the category of the text: if a text is categorized as 'advanced scholarship', it should still evaluate it with respect to the general population, not with respect only to 'advanced scholarly works.'",
  "METAPOINT 5: This is not a grading app. Do not penalize boldness. Do not take points away for insights that, if correct, stand on their own. Get rid of the idea that \"argumentation\" is what makes something smart; it isn't. What makes something smart is that it is smart (insightful). Period."
];

// Psychopathological Questions (derived from psychological with focus on pathology)
export const PSYCHOPATHOLOGICAL_QUESTIONS = [
  "Does the text reveal evidence of personality disorder organization (borderline, narcissistic, antisocial, paranoid)?",
  "Are there signs of thought disorder, loose associations, or psychotic process?",
  "Is there evidence of mood disorder (depression, mania, mixed states) affecting cognitive organization?",
  "Does the writing suggest obsessive-compulsive organization or other anxiety-based pathology?",
  "Are there indicators of dissociative processes or trauma-related fragmentation?",
  "Is there evidence of substance-related cognitive impairment or disinhibition?",
  "Does the text suggest neurocognitive disorder or organic brain syndrome?",
  "Are there signs of impulse control disorders or behavioral dysregulation?",
  "Is there evidence of eating disorder psychology or body dysmorphic concerns?",
  "Does the writing suggest conversion or somatic symptom disorder psychology?",
  "Are there indicators of factitious disorder or malingering?",
  "Is there evidence of gender dysphoria or sexual dysfunction psychology?",
  "Does the text suggest sleep disorder effects on cognition and mood?",
  "Are there signs of autism spectrum organization or social communication disorder?",
  "Is there evidence of ADHD or executive function disorder?",
  "Does the writing suggest intellectual disability or specific learning disorder?",
  "Are there indicators of adjustment disorder or acute stress response?",
  "Does the text reveal evidence of PTSD or complex trauma organization?"
];

export const PSYCHOPATHOLOGICAL_INSTRUCTIONS = [
  "Answer these questions in connection with this text.",
  "Also give a score out of 100.",
  "A score of N/100 means (100–N)/100 outperform the subject with respect to psychological health and functioning.",
  "You are not diagnosing. You are answering questions about pathological indicators.",
  "Focus on degree and nature of psychopathology, not diagnostic categories.",
  "Evaluate severity relative to general population mental health norms.",
  "Do not conflate unconventional thinking with pathology.",
  "Summarize the text and categorize the psychopathological presentation if any is evident.",
  "Consider adaptive vs. maladaptive functioning in context."
];

// Question sets by analysis type
export const QUESTION_SETS: Record<string, QuestionSet> = {
  cognitive_short: {
    questions: COGNITIVE_QUESTIONS,
    instructions: COGNITIVE_INSTRUCTIONS,
    metapoints: COGNITIVE_METAPOINTS
  },
  cognitive_long: {
    questions: COGNITIVE_QUESTIONS,
    instructions: COGNITIVE_INSTRUCTIONS,
    metapoints: COGNITIVE_METAPOINTS
  },
  psychological_short: {
    questions: PSYCHOLOGICAL_QUESTIONS,
    instructions: PSYCHOLOGICAL_INSTRUCTIONS,
    metapoints: []
  },
  psychological_long: {
    questions: PSYCHOLOGICAL_QUESTIONS,
    instructions: PSYCHOLOGICAL_INSTRUCTIONS,
    metapoints: []
  },
  psychopathological_short: {
    questions: PSYCHOPATHOLOGICAL_QUESTIONS,
    instructions: PSYCHOPATHOLOGICAL_INSTRUCTIONS,
    metapoints: []
  },
  psychopathological_long: {
    questions: PSYCHOPATHOLOGICAL_QUESTIONS,
    instructions: PSYCHOPATHOLOGICAL_INSTRUCTIONS,
    metapoints: []
  }
};

// Comprehensive mode phases
export const PUSHBACK_PROTOCOL = [
  "Your position is that (100–N)/100 have superior psychological functioning in this respect. Are you sure?",
  "What concrete psychological strengths do those (100–N) people have that this author lacks?",
  "Re-ask Phase 1 questions de novo."
];

export const WALMART_METRIC = [
  "If you claim 20/100 Walmart patrons have more integrated ego strength than this author, provide concrete examples of how. If you can't, revise."
];

export const FINAL_VALIDATION = [
  "Was the subject penalized for unconventional affect or honesty? If yes → recalibrate.",
  "Does the score reflect ego integration and authenticity, not mere social compliance?",
  "Is the Walmart metric grounded in specific superiority, not vague hand-waving?"
];

// Rating scales
export const RATING_SCALES = {
  psychological: {
    "95-100": "authentic, integrated psyche, unignorable",
    "80-94": "strong but with observable defenses / conflict",
    "<80": "rigidity, fragmentation, or dissimulation"
  },
  cognitive: {
    "95-100": "genuine insight and intelligence, unignorable",
    "80-94": "solid reasoning with some limitations",
    "<80": "flawed reasoning, pseudo-intelligence, or lack of substance"
  },
  psychopathological: {
    "95-100": "excellent psychological health and functioning",
    "80-94": "good functioning with minor issues",
    "<80": "significant pathological indicators present"
  }
};

// Phony text example for cognitive assessment
export const PHONY_TEXT_EXAMPLE = `
In this dissertation, I critically examine the philosophy of transcendental empiricism. 
Transcendental empiricism is, among other things, a philosophy of mental content. 
It attempts to dissolve an epistemological dilemma of mental content by splitting the difference between two diametrically 
opposed accounts of content. John McDowell's minimal empiricism and Richard Gaskin's minimalist 
empiricism are two versions of transcendental empiricism. Transcendental empiricism itself originates 
with McDowell's work. This dissertation is divided into five parts. First, in the Introduction, 
I state the Wittgensteinian metaphilosophical orientation of transcendental empiricism. This metaphilosophical 
approach provides a plateau upon which much of the rest of this work may be examined. Second, I offer a 
detailed description of McDowell's minimal empiricism. Third, I critique Gaskin's critique and modification of 
McDowell's minimal empiricism. I argue that (1) Gaskin's critiques are faulty and that (2) Gaskin's minimalist 
empiricism is very dubious. Fourth, I scrutinize the alleged credentials of McDowell's minimal empiricism. 
I argue that McDowell's version of linguistic idealism is problematic. I then comment on a recent dialogue 
between transcendental empiricism and Hubert Dreyfus's phenomenology. The dialogue culminates with Dreyfus's 
accusation of the "Myth of the Mental." I argue that this accusation is correct in which case McDowell's 
direct realism is problematic. I conclude that minimal empiricism does not dissolve the dilemma of mental content. 
Finally, I argue that Tyler Burge successfully undermines the doctrine of disjunctivism, but disjunctivism is crucial 
for transcendental empiricism. Ultimately, however, I aim to show that transcendental empiricism is an attractive alternative 
to philosophies of mental content.
`;