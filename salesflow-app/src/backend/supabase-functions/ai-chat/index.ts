/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - AI CHAT EDGE FUNCTION                                     ║
 * ║  Supabase Edge Function für OpenAI/Anthropic Integration                   ║
 * ║                                                                            ║
 * ║  Unterstützt:                                                              ║
 * ║  - CHIEF Chat (Multi-Message Konversation)                                 ║
 * ║  - DISC Analysis (Single Prompt)                                           ║
 * ║  - Follow-up Generation (Single Prompt)                                    ║
 * ║  - Streaming Responses                                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * DEPLOYMENT:
 * 1. Supabase CLI installieren: npm install -g supabase
 * 2. Login: supabase login
 * 3. Deploy: supabase functions deploy ai-chat
 * 
 * ENVIRONMENT VARIABLES (in Supabase Dashboard → Settings → Edge Functions):
 * - OPENAI_API_KEY: sk-...
 * - ANTHROPIC_API_KEY: sk-ant-... (optional)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequest {
  // Legacy Format (einzelne Prompts)
  system_prompt?: string;
  user_prompt?: string;
  
  // Chat Format (Multi-Message)
  messages?: Message[];
  
  // Optionen
  json_mode?: boolean;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  mode?: 'chief-chat' | 'disc-analysis' | 'followup' | 'default';
}

// ═══════════════════════════════════════════════════════════════════════════
// CORS HEADERS
// ═══════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════
// OPENAI INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

async function callOpenAI(request: AIRequest): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const model = request.model || 'gpt-4o-mini';
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.max_tokens || 1500;

  // Baue Messages Array
  let messages: Message[];
  
  if (request.messages) {
    // Chat Mode: Nutze das komplette Messages Array
    messages = request.messages;
  } else {
    // Legacy Mode: System + User Prompt
    messages = [
      { role: 'system', content: request.system_prompt || '' },
      { role: 'user', content: request.user_prompt || '' },
    ];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: request.json_mode ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// OPENAI STREAMING
// ═══════════════════════════════════════════════════════════════════════════

async function streamOpenAI(request: AIRequest): Promise<ReadableStream> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const model = request.model || 'gpt-4o-mini';
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.max_tokens || 1500;

  // Baue Messages Array
  let messages: Message[];
  
  if (request.messages) {
    messages = request.messages;
  } else {
    messages = [
      { role: 'system', content: request.system_prompt || '' },
      { role: 'user', content: request.user_prompt || '' },
    ];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  // Transform SSE Stream zu Text Stream
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      
      if (done) {
        controller.close();
        return;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.close();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          } catch {
            // Ignore parse errors for partial chunks
          }
        }
      }
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTHROPIC INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

async function callAnthropic(request: AIRequest): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const model = request.model || 'claude-3-haiku-20240307';
  const maxTokens = request.max_tokens || 1500;

  // Für Anthropic: System separat, Messages ohne System Role
  let systemPrompt = '';
  let userMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (request.messages) {
    // Chat Mode: Extrahiere System-Messages und konvertiere
    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n\n';
      } else {
        userMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }
  } else {
    // Legacy Mode
    systemPrompt = request.system_prompt || '';
    userMessages = [{ role: 'user', content: request.user_prompt || '' }];
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt.trim(),
      messages: userMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: AIRequest = await req.json();

    // Validate request
    const hasLegacyFormat = request.system_prompt || request.user_prompt;
    const hasChatFormat = request.messages && request.messages.length > 0;

    if (!hasLegacyFormat && !hasChatFormat) {
      throw new Error('Missing required fields: either (system_prompt + user_prompt) or messages[]');
    }

    // Determine provider based on model name
    const isAnthropic = request.model?.startsWith('claude');

    // Streaming Mode
    if (request.stream && !isAnthropic) {
      const stream = await streamOpenAI(request);
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-Streaming Mode
    let content: string;
    if (isAnthropic) {
      content = await callAnthropic(request);
    } else {
      content = await callOpenAI(request);
    }

    // Return response
    return new Response(
      JSON.stringify({ 
        content, 
        success: true,
        mode: request.mode || 'default',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('AI Chat Error:', error);
    
    // Determine error type for better client handling
    const errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    let errorType = 'internal_error';

    if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
      statusCode = 503;
      errorType = 'configuration_error';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      statusCode = 429;
      errorType = 'rate_limit';
    } else if (errorMessage.includes('Missing required')) {
      statusCode = 400;
      errorType = 'validation_error';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        error_type: errorType,
        success: false,
        fallback_hint: 'Use local fallback functions (quickDiscEstimate, getQuickFollowUpTemplate)',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});
