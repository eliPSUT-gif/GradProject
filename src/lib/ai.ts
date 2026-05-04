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
