/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - AI CHAT STREAMING EDGE FUNCTION                           ║
 * ║  Dedizierte Streaming-Funktion für CHIEF Chat                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * DEPLOYMENT:
 * supabase functions deploy ai-chat-stream
 * 
 * Diese Funktion ist optimiert für Streaming Responses.
 * Für normale Requests nutze ai-chat.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING HANDLER
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const request: StreamRequest = await req.json();

    if (!request.messages || request.messages.length === 0) {
      throw new Error('messages[] is required');
    }

    const model = request.model || 'gpt-4o-mini';
    const temperature = request.temperature ?? 0.8;
    const maxTokens = request.max_tokens || 1500;

    // OpenAI Streaming Request
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI error: ${openaiResponse.status} - ${error}`);
    }

    // Transform SSE zu plain text stream
    const reader = openaiResponse.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const transformStream = new ReadableStream({
      async start(controller) {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      },
    });

    return new Response(transformStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Streaming Error:', error);

    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

