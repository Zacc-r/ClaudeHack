import { NextRequest, NextResponse } from 'next/server';
import { getClaude } from '@/lib/claude';

export const maxDuration = 30;

interface SlotInput {
  id: string;
  label: string;
  emoji: string;
  startMinutes: number;
  durationMinutes: number;
  days: string[];
}

export async function POST(req: NextRequest) {
  const { message, slots } = (await req.json()) as { message: string; slots: SlotInput[] };

  if (!message || !slots) {
    return NextResponse.json({ error: 'Missing message or slots' }, { status: 400 });
  }

  const slotDesc = slots.map(s => {
    const sh = Math.floor(s.startMinutes / 60), sm = s.startMinutes % 60;
    const eh = Math.floor((s.startMinutes + s.durationMinutes) / 60), em = (s.startMinutes + s.durationMinutes) % 60;
    const fmt = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    return `  "${s.id}": ${s.emoji} ${s.label} — ${fmt(sh, sm)} to ${fmt(eh, em)} (${s.durationMinutes}min), days: [${s.days.join(',')}]`;
  }).join('\n');

  const response = await getClaude().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content:
`Current schedule blocks:
${slotDesc}

User says: "${message}"

Modify the schedule according to the user's request. Return ONLY a JSON object with:
{
  "reply": "Short friendly confirmation of what you changed",
  "slots": [
    { "id": "work", "startMinutes": 540, "durationMinutes": 480, "days": ["Mon","Tue","Wed","Thu","Fri"] },
    ...
  ]
}

Rules:
- Keep all existing slots unless the user explicitly removes one
- startMinutes is minutes from midnight (e.g. 9 AM = 540)
- durationMinutes minimum 15, maximum 480
- days must be from: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Respond ONLY with the JSON object, no other text` }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ reply: "Sorry, I couldn't understand that. Try something like 'move gym to 7am' or 'make work shorter'.", slots });
  }

  try {
    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ reply: "Something went wrong parsing. Try rephrasing?", slots });
  }
}
