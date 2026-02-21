const TAVUS_BASE = 'https://tavusapi.com/v2';

const headers = () => ({
  'Content-Type': 'application/json',
  'x-api-key': process.env.TAVUS_API_KEY!,
});

export const createPersona = async (config: {
  name: string;
  systemPrompt: string;
  context?: string;
  replicaId?: string;
  tools?: any[];
}) => {
  const res = await fetch(`${TAVUS_BASE}/personas`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      persona_name: config.name,
      pipeline_mode: 'full',
      system_prompt: config.systemPrompt,
      context: config.context || '',
      default_replica_id: config.replicaId || 're8e740a42',
      layers: {
        llm: {
          tools: config.tools || [],
        },
        tts: {
          tts_engine: 'cartesia',
          tts_emotion_control: true,
        },
      },
    }),
  });
  return res.json();
};

export const createConversation = async (config: {
  personaId: string;
  replicaId?: string;
  context?: string;
  callbackUrl?: string;
}) => {
  const res = await fetch(`${TAVUS_BASE}/conversations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      persona_id: config.personaId,
      replica_id: config.replicaId || 're8e740a42',
      conversational_context: config.context || '',
      callback_url: config.callbackUrl || '',
      properties: {
        max_call_duration: 600,
        participant_left_timeout: 30,
      },
    }),
  });
  return res.json();
};

export const listPersonas = async () => {
  const res = await fetch(`${TAVUS_BASE}/personas`, { headers: headers() });
  return res.json();
};

export const endConversation = async (conversationId: string) => {
  const res = await fetch(`${TAVUS_BASE}/conversations/${conversationId}/end`, {
    method: 'POST',
    headers: headers(),
  });
  return res.json();
};
