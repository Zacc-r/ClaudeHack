import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export const getClaude = () => {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
};

export const validateScheduleChange = async (
  currentSchedule: any[],
  action: string,
  details: string
): Promise<{ ok: boolean; conflict?: string; suggestion?: string }> => {
  const claude = getClaude();
  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Current schedule: ${JSON.stringify(currentSchedule)}
Action: ${action}
Details: ${details}
Check for conflicts. Respond ONLY with JSON: { "ok": true/false, "conflict": null or "description", "suggestion": null or "alternative time" }`
    }]
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
};
