export interface StudentAiContext {
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
}

export interface PlannerAiContext {
  studentName?: string;
  termLabel?: string;
  currentGpa?: number | null;
  completedCredits?: number | null;
  scheduleScore?: number | null;
  scheduleLabel?: string | null;
  selectedCourses: Array<{
    code: string;
    name: string;
    credits: number;
    difficulty: number;
    type: string;
  }>;
  factors: Array<{
    label: string;
    score: number;
    detail: string;
  }>;
}

export interface PlannerAiRecommendation {
  title: string;
  reason: string;
  action: string;
  expectedImpact: string;
}

export interface PlannerAiResponse {
  explanation: string[];
  recommendations: PlannerAiRecommendation[];
  model: string;
}

interface AskStudentAdvisorInput {
  question: string;
  context: StudentAiContext;
}

interface AskStudentAdvisorResponse {
  text: string;
  model: string;
}

export async function askStudentAdvisor({
  question,
  context,
}: AskStudentAdvisorInput): Promise<AskStudentAdvisorResponse> {
  const response = await fetch('/api/openrouter-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, context }),
  });

  const payload = (await response.json().catch(() => null)) as
    | AskStudentAdvisorResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Unable to generate AI recommendations right now.'
    );
  }

  return payload as AskStudentAdvisorResponse;
}

export async function analyzePlannerSchedule(context: PlannerAiContext): Promise<PlannerAiResponse> {
  const response = await fetch('/api/openrouter-schedule-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context }),
  });

  const payload = (await response.json().catch(() => null)) as
    | PlannerAiResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Unable to analyze the schedule right now.'
    );
  }

  return payload as PlannerAiResponse;
}
