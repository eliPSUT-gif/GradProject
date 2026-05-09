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
