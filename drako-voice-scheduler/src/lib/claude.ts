import Anthropic from '@anthropic-ai/sdk';
import type { ScheduleEvent } from './redis';

let claude: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!claude) {
    claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return claude;
}

export interface ValidationResult {
  ok: boolean;
  conflict?: string;
  suggestion?: string;
}

export async function validateScheduleChange(
  currentSchedule: ScheduleEvent[],
  action: 'add' | 'move' | 'remove',
  description: string
): Promise<ValidationResult> {
  const claude = getClaude();
  
  const scheduleText = currentSchedule.length > 0
    ? currentSchedule.map(e => `${e.start}${e.end ? '-' + e.end : ''}: ${e.title}`).join('\n')
    : 'No events scheduled';

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Check if this schedule change has conflicts.

Current schedule:
${scheduleText}

Proposed change: ${action} - ${description}

Respond with JSON only:
{"ok": true} if no conflicts
{"ok": false, "conflict": "reason", "suggestion": "alternative"} if there's a conflict

Be lenient - only flag actual time overlaps, not just busy days.`
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{"ok": true}';
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}
