import type { BilingualEnrichment, PaperCandidate, RuntimeConfig } from './types.js';

import { fetchJson } from './client.js';
import { buildFallbackEnrichment, sanitizeEnrichment } from './fallback.js';
import { logger } from './logger.js';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const extractJsonObject = (raw: string) => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }

  return raw.slice(start, end + 1);
};

export const enrichCandidateWithAi = async (candidate: PaperCandidate, runtime: RuntimeConfig) => {
  const fallback = buildFallbackEnrichment(candidate);

  if (!runtime.openAiApiKey) {
    logger.warn(`OPENAI_API_KEY is missing; using fallback enrichment for ${candidate.title ?? candidate.url}`);
    return fallback;
  }

  const prompt = {
    journalName: candidate.journalName,
    title: candidate.title ?? '',
    abstract: candidate.abstract ?? '',
    keywords: candidate.keywords ?? [],
    authors: candidate.authors,
    detectedLanguage: candidate.language ?? 'unknown',
    rules: [
      'Return valid JSON only.',
      'If the original title/abstract/keywords are in English, keep them in *_en and translate them into *_zh.',
      'If the original title/abstract/keywords are in Chinese, keep them in *_zh and translate them into *_en.',
      'If original keywords are missing, keep keywords_en and keywords_zh as empty arrays, and put inferred keywords into inferred_keywords_en and inferred_keywords_zh.',
      'plain_summary_zh and plain_summary_en must be easy for non-experts to understand.',
      'research_direction_* should summarize the broader research direction, not repeat the abstract.',
      'method_tags_* should be short arrays like survey, experiment, content analysis, interview, case study.'
    ],
    outputSchema: {
      title_en: 'string',
      title_zh: 'string',
      abstract_en: 'string',
      abstract_zh: 'string',
      keywords_en: ['string'],
      keywords_zh: ['string'],
      inferred_keywords_en: ['string'],
      inferred_keywords_zh: ['string'],
      plain_summary_zh: 'string',
      plain_summary_en: 'string',
      research_direction_zh: 'string',
      research_direction_en: 'string',
      method_tags_zh: ['string'],
      method_tags_en: ['string']
    }
  };

  try {
    const payload = await fetchJson<ChatCompletionResponse>(
      `${runtime.openAiBaseUrl.replace(/\/$/, '')}/chat/completions`,
      runtime,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${runtime.openAiApiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: runtime.openAiModel,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are a communication studies research assistant. Produce strict JSON only. Translate faithfully, write plain-language summaries, and keep method tags concise.'
            },
            {
              role: 'user',
              content: JSON.stringify(prompt)
            }
          ]
        })
      },
      'AI enrichment'
    );

    const rawContent = payload.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(extractJsonObject(rawContent)) as BilingualEnrichment;
    return sanitizeEnrichment(parsed, fallback);
  } catch (error) {
    logger.warn(`AI enrichment failed for ${candidate.title ?? candidate.url}: ${(error as Error).message}`);
    return fallback;
  }
};
