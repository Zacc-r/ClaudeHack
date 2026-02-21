const TAVUS_API_URL = 'https://api.tavus.io/v2';

function getHeaders(): Record<string, string> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    throw new Error('TAVUS_API_KEY environment variable is required');
  }
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
}

interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface CreatePersonaParams {
  name: string;
  systemPrompt: string;
  context: string;
  tools: Tool[];
}

interface PersonaResponse {
  persona_id: string;
  persona_name: string;
}

export async function createPersona(params: CreatePersonaParams): Promise<PersonaResponse> {
  const response = await fetch(`${TAVUS_API_URL}/personas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      persona_name: params.name,
      system_prompt: params.systemPrompt,
      context: params.context,
      default_replica_id: process.env.TAVUS_REPLICA_ID,
      layers: {
        llm: {
          model: 'tavus-gpt-4o',
          tools: params.tools,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavus createPersona failed: ${response.status} ${error}`);
  }

  return response.json();
}

export async function listPersonas(): Promise<PersonaResponse[]> {
  const response = await fetch(`${TAVUS_API_URL}/personas`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavus listPersonas failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

interface CreateConversationParams {
  personaId: string;
  context: string;
  callbackUrl: string;
}

interface ConversationResponse {
  conversation_id: string;
  conversation_url: string;
}

export async function createConversation(params: CreateConversationParams): Promise<ConversationResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const response = await fetch(`${TAVUS_API_URL}/conversations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      persona_id: params.personaId,
      conversation_name: `DRAKO Session ${new Date().toISOString()}`,
      conversational_context: params.context,
      callback_url: params.callbackUrl,
      properties: {
        max_call_duration: 600,
        enable_recording: true,
        apply_greenscreen: false,
        language: 'english',
        enable_closed_captions: true,
        tools_callback_url: `${appUrl}/api/tavus/tools`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavus createConversation failed: ${response.status} ${error}`);
  }

  return response.json();
}

export async function endConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${TAVUS_API_URL}/conversations/${conversationId}/end`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavus endConversation failed: ${response.status} ${error}`);
  }
}
