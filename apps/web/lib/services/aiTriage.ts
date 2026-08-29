import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TriageResult {
  summary: string;
  suggested_priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  suggested_component: string;
  confidence_reason: string;
  next_steps: string[];
}

export function buildTriagePrompt(bug: any, comments: any[]): string {
  const commentText = comments
    .slice(0, 30)
    .map((c, i) => `Comment ${i + 1} (${c.author_username || 'user'}):\n${c.body}`)
    .join('\n\n---\n\n');

  return `You are an expert bug triage assistant. Analyze Bug #${bug.id}:
Title: ${bug.summary}
Description: ${bug.description || 'No description provided.'}
Priority: ${bug.priority} | Severity: ${bug.severity} | Status: ${bug.status}

Comments (up to 30):
${commentText || 'No comments yet.'}

Respond strictly with a JSON object matching this schema:
{
  "summary": "Concise 1-2 sentence root cause synthesis",
  "suggested_priority": "P1" | "P2" | "P3" | "P4" | "P5",
  "suggested_component": "Name of likely component",
  "confidence_reason": "Reason for priority/component recommendation",
  "next_steps": ["Step 1", "Step 2"]
}`;
}

export async function callLLMTriage(
  bug: any,
  comments: any[]
): Promise<TriageResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 4000);

  try {
    const prompt = buildTriagePrompt(bug, comments);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const responseText = result.response.text();
    if (!responseText) return null;

    const parsed = JSON.parse(responseText) as TriageResult;
    return {
      summary: parsed.summary || 'AI Triage summary generated',
      suggested_priority: parsed.suggested_priority || bug.priority || 'P3',
      suggested_component: parsed.suggested_component || 'General',
      confidence_reason: parsed.confidence_reason || 'Based on bug details and comments',
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
