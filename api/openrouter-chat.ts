import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const MAX_QUESTION_LENGTH = 2000;

type RequestBody = {
  question?: string;
  context?: {
    studentName?: string;
    termLabel?: string;
    currentGpa?: number | null;
    completedCredits?: number | null;
    selectedCourses?: Array<{
      code: string;
      name: string;
      credits: number;
      difficulty: number;
    }>;
    scheduleScore?: number | null;
    scheduleLabel?: string | null;
    scheduleExplanation?: string[];
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

export const config = {
  maxDuration: 20,
};

function parseBody(request: VercelRequest): RequestBody {
  if (typeof request.body === 'string') {
    return JSON.parse(request.body) as RequestBody;
  }

  return (request.body ?? {}) as RequestBody;
}

function formatContext(context: RequestBody['context']) {
  if (!context) {
    return 'No structured student context was provided.';
  }

  const selectedCourses = context.selectedCourses?.length
    ? context.selectedCourses
        .map(
          (course) =>
            `${course.code} ${course.name} (${course.credits} credits, difficulty ${course.difficulty}/100)`
        )
        .join('\n')
    : 'No courses currently selected.';

  const explanation = context.scheduleExplanation?.length
    ? context.scheduleExplanation.map((line) => `- ${line}`).join('\n')
    : '- No schedule explanation is available yet.';

  return [
    `Student: ${context.studentName ?? 'Unknown student'}`,
    `Target term: ${context.termLabel ?? 'Unknown term'}`,
    `Current GPA: ${context.currentGpa ?? 'Unknown'}`,
    `Completed credits: ${context.completedCredits ?? 'Unknown'}`,
    `Schedule score: ${context.scheduleScore ?? 'Not analyzed'}`,
    `Schedule label: ${context.scheduleLabel ?? 'Not analyzed'}`,
    'Selected courses:',
    selectedCourses,
    'Current schedule analysis:',
    explanation,
  ].join('\n');
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

  const question = body.question?.trim() ?? '';
  if (!question) {
    response.status(400).json({ error: 'Question is required.' });
    return;
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    response.status(400).json({ error: 'Question is too long.' });
    return;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an academic advising assistant inside a university planning app. Give practical, concise guidance. Base your answer on the provided student data. If information is missing, say what assumption you are making. Do not invent university policies, prerequisites, or completed coursework.',
    },
    {
      role: 'user',
      content: [
        'Student context:',
        formatContext(body.context),
        '',
        `Question: ${question}`,
      ].join('\n'),
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
        temperature: 0.4,
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
    if (!text) {
      response.status(502).json({ error: 'OpenRouter returned an empty response.' });
      return;
    }

    response.status(200).json({
      text,
      model: payload?.model ?? model,
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to contact OpenRouter.',
    });
  }
}
