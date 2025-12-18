import React, { useState } from 'react';
import InteractiveChatMessage from './InteractiveChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  options?: Array<{ label: string; value: string; action: string }>;
}

export default function GPTFunctionCallsDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hallo! Ich bin dein Sales-KI-Assistent. Wie kann ich dir heute helfen?',
      options: [
        { label: '🛡️ Einwand behandeln', value: 'objection', action: 'handle_objection' },
        { label: '📧 E-Mail schreiben', value: 'email', action: 'write_email' },
        { label: '📱 WhatsApp senden', value: 'whatsapp', action: 'send_whatsapp' },
        { label: '🎯 Lead analysieren', value: 'analyze', action: 'analyze_lead' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input }
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Call GPT with function calling enabled
      const response = await fetch('/api/ai-prompts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          use_functions: true
        })
      });

      const data = await response.json();

      // Add AI response
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.message,
          options: data.options || undefined
        }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = async (option: any) => {
    // Simulate user clicking an option
    const optionMessage = `${option.label}`;
    
    setMessages([
      ...messages,
      { role: 'user', content: optionMessage }
    ]);

    setLoading(true);

    try {
      // Here you would call the appropriate action
      // For demo purposes, just add a simple response
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Okay, ich helfe dir mit: ${option.label}. Was genau möchtest du wissen?`
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error handling option:', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-blue-600 text-white p-4 shadow-md">
        <h2 className="text-xl font-bold">🤖 Sales AI Assistant</h2>
        <p className="text-sm text-blue-100">Powered by GPT-4 mit Function Calling</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <InteractiveChatMessage
            key={index}
            message={msg.content}
            options={msg.options}
            onOptionSelect={handleOptionSelect}
            isAi={msg.role === 'assistant'}
          />
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm">KI denkt nach...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Nachricht schreiben..."
            className="
              flex-1 p-3 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
            "
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="
              px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}

