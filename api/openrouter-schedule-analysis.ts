import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';

type PlannerRecommendation = {
  title: string;
  reason: string;
  action: string;
  expectedImpact: string;
};

type RequestBody = {
  context?: {
    studentName?: string;
    termLabel?: string;
    currentGpa?: number | null;
    completedCredits?: number | null;
    scheduleScore?: number | null;
    scheduleLabel?: string | null;
    selectedCourses?: Array<{
      code: string;
      name: string;
      credits: number;
      difficulty: number;
      type: string;
    }>;
    factors?: Array<{
      label: string;
      score: number;
      detail: string;
    }>;
  };
};

type OpenRouterResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type StructuredPlannerResponse = {
  explanation?: string[];
  recommendations?: PlannerRecommendation[];
};

export const config = {
  maxDuration: 20,
};

function parseBody(request: VercelRequest): RequestBody {
  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as RequestBody;
  }

  return (request.body ?? {}) as RequestBody;
}

function getReferer(request: VercelRequest) {
  const host = String(request.headers.host ?? '').trim();
  if (!host) {
    return 'http://localhost:3000';
  }

  const protocol = host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

function extractText(payload: OpenRouterResponse) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
  }

  return '';
}

function extractJsonObject(text: string) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function normalizeStructuredResponse(payload: StructuredPlannerResponse | null) {
  const explanation = Array.isArray(payload?.explanation)
    ? payload.explanation
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const recommendations = Array.isArray(payload?.recommendations)
    ? payload.recommendations
        .map((item) => ({
          title: String(item?.title ?? '').trim(),
          reason: String(item?.reason ?? '').trim(),
          action: String(item?.action ?? '').trim(),
          expectedImpact: String(item?.expectedImpact ?? '').trim(),
        }))
        .filter((item) => item.title && item.reason && item.action && item.expectedImpact)
        .slice(0, 4)
    : [];

  return {
    explanation,
    recommendations,
  };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    response.status(500).json({ error: 'OpenRouter API key is not configured.' });
    return;
  }

  let body: RequestBody;
  try {
    body = parseBody(request);
  } catch {
    response.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  if (!body.context?.selectedCourses?.length) {
    response.status(400).json({ error: 'Selected courses are required.' });
    return;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an academic schedule review assistant for a real student planner. Return strict JSON only. Do not use markdown. Do not wrap the JSON in code fences. Base your answer only on the provided schedule context. Keep advice practical and concise. Do not mention placeholders, mock data, demos, internal tools, implementation details, model limitations, scaffolding, or how the review was generated. Speak as if you are presenting a direct schedule review to the student.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Review this student schedule and produce brief explanation bullets plus actionable recommendations.',
        output_schema: {
          explanation: ['string', 'string', 'string'],
          recommendations: [
            {
              title: 'string',
              reason: 'string',
              action: 'string',
              expectedImpact: 'string',
            },
          ],
        },
        constraints: {
          explanation_count: '3 to 4',
          recommendation_count: '1 to 4',
          max_sentence_length: 'short',
          forbidden_phrases: [
            'placeholder',
            'mock',
            'demo',
            'prototype',
            'internal score',
            'scaffolding',
            'generated by the model',
          ],
          tone: 'direct academic advising language',
        },
        schedule_context: body.context,
      }),
    },
  ];

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': getReferer(request),
        'X-OpenRouter-Title': 'Smart Academic Advisor',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
      }),
    });

    const payload = (await upstream.json().catch(() => null)) as OpenRouterResponse | null;

    if (!upstream.ok) {
      response.status(upstream.status).json({
        error: payload?.error?.message ?? 'OpenRouter request failed.',
      });
      return;
    }

    const text = payload ? extractText(payload) : '';
    const jsonText = extractJsonObject(text);
    if (!jsonText) {
      response.status(502).json({ error: 'OpenRouter returned an unparseable schedule analysis.' });
      return;
    }

    const structured = normalizeStructuredResponse(JSON.parse(jsonText) as StructuredPlannerResponse);
    if (structured.explanation.length === 0 && structured.recommendations.length === 0) {
      response.status(502).json({ error: 'OpenRouter returned an empty schedule analysis.' });
      return;
    }

    response.status(200).json({
      ...structured,
      model: payload?.model ?? model,
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to contact OpenRouter.',
    });
  }
}
