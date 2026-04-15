import type { BilingualEnrichment, PaperCandidate, SupportedLanguage } from './types.js';

import { detectLanguage, mergeUniqueStrings, normalizeWhitespace, topWords } from './utils.js';

const METHOD_RULES = [
  { en: 'survey', zh: 'survey', patterns: [/survey/i, /questionnaire/i] },
  { en: 'experiment', zh: 'experiment', patterns: [/experiment/i] },
  { en: 'interview', zh: 'interview', patterns: [/interview/i] },
  { en: 'content analysis', zh: 'content analysis', patterns: [/content analysis/i] },
  { en: 'case study', zh: 'case study', patterns: [/case study/i] },
  { en: 'computational analysis', zh: 'computational analysis', patterns: [/machine learning/i, /computational/i, /algorithm/i] },
  { en: 'network analysis', zh: 'network analysis', patterns: [/network analysis/i] },
  { en: 'discourse analysis', zh: 'discourse analysis', patterns: [/discourse analysis/i] },
  { en: 'review', zh: 'review', patterns: [/review/i, /meta-analysis/i] }
];

const inferZhKeywords = (text: string) => {
  const chunks = normalizeWhitespace(text)
    .split(/[\s,.;:]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  return Array.from(new Set(chunks)).slice(0, 6);
};

export const inferKeywords = (title: string, abstract: string, language: SupportedLanguage) => {
  if (language === 'zh') {
    return inferZhKeywords(`${title} ${abstract}`);
  }

  return topWords(`${title} ${abstract}`, 6).map((word) => word.replace(/^\w/, (char) => char.toUpperCase()));
};

export const detectMethods = (candidate: PaperCandidate) => {
  const source = `${candidate.title ?? ''} ${candidate.abstract ?? ''}`;
  const matches = METHOD_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(source)));

  if (matches.length === 0) {
    return {
      en: ['mixed methods'],
      zh: ['mixed methods']
    };
  }

  return {
    en: Array.from(new Set(matches.map((item) => item.en))),
    zh: Array.from(new Set(matches.map((item) => item.zh)))
  };
};

export const buildFallbackEnrichment = (candidate: PaperCandidate): BilingualEnrichment => {
  const rawTitle = normalizeWhitespace(candidate.title);
  const rawAbstract = normalizeWhitespace(candidate.abstract);
  const language = candidate.language ?? detectLanguage(rawTitle, rawAbstract);
  const originalKeywords = candidate.keywords ?? [];
  const inferred = originalKeywords.length === 0 ? inferKeywords(rawTitle, rawAbstract, language) : [];
  const methods = detectMethods(candidate);
  const topicSeed = mergeUniqueStrings(originalKeywords, inferred).slice(0, 4);
  const topicText = topicSeed.join(', ') || 'digital media, platform governance, audience behavior';

  return {
    title_en: rawTitle,
    title_zh: rawTitle,
    abstract_en: rawAbstract,
    abstract_zh: rawAbstract,
    keywords_en: [...originalKeywords],
    keywords_zh: [...originalKeywords],
    inferred_keywords_en: [...inferred],
    inferred_keywords_zh: [...inferred],
    plain_summary_en: `This paper studies ${rawTitle || 'a recent communication topic'}. In plain terms, it asks what is happening, why it matters for public communication, and what evidence the authors use. The likely focus is ${topicText}. The abstract suggests a ${methods.en.join(', ')} approach, which makes the work useful for understanding how communication changes in everyday life.`,
    plain_summary_zh: `This paper studies ${rawTitle || 'a recent communication topic'}. In plain terms, it asks what is happening, why it matters for public communication, and what evidence the authors use. The likely focus is ${topicText}. The abstract suggests a ${methods.en.join(', ')} approach, which makes the work useful for understanding how communication changes in everyday life.`,
    research_direction_en: `The paper points to an active research direction around ${topicText}, especially how institutions, platforms, and audiences shape communication outcomes.`,
    research_direction_zh: `The paper points to an active research direction around ${topicText}, especially how institutions, platforms, and audiences shape communication outcomes.`,
    method_tags_zh: methods.zh,
    method_tags_en: methods.en
  };
};

export const sanitizeEnrichment = (enrichment: BilingualEnrichment, fallback: BilingualEnrichment): BilingualEnrichment => ({
  title_en: normalizeWhitespace(enrichment.title_en) || fallback.title_en,
  title_zh: normalizeWhitespace(enrichment.title_zh) || fallback.title_zh,
  abstract_en: normalizeWhitespace(enrichment.abstract_en) || fallback.abstract_en,
  abstract_zh: normalizeWhitespace(enrichment.abstract_zh) || fallback.abstract_zh,
  keywords_en: (enrichment.keywords_en ?? []).filter(Boolean),
  keywords_zh: (enrichment.keywords_zh ?? []).filter(Boolean),
  inferred_keywords_en: (enrichment.inferred_keywords_en ?? []).filter(Boolean),
  inferred_keywords_zh: (enrichment.inferred_keywords_zh ?? []).filter(Boolean),
  plain_summary_zh: normalizeWhitespace(enrichment.plain_summary_zh) || fallback.plain_summary_zh,
  plain_summary_en: normalizeWhitespace(enrichment.plain_summary_en) || fallback.plain_summary_en,
  research_direction_zh: normalizeWhitespace(enrichment.research_direction_zh) || fallback.research_direction_zh,
  research_direction_en: normalizeWhitespace(enrichment.research_direction_en) || fallback.research_direction_en,
  method_tags_zh: (enrichment.method_tags_zh ?? []).filter(Boolean).length
    ? enrichment.method_tags_zh
    : fallback.method_tags_zh,
  method_tags_en: (enrichment.method_tags_en ?? []).filter(Boolean).length
    ? enrichment.method_tags_en
    : fallback.method_tags_en
});
