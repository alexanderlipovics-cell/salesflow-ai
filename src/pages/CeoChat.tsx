import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Send, Loader2, Plus, Trash2, MessageSquare, Sparkles, Zap, Brain, Bot } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model_name?: string;
  provider?: string;
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const MODEL_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  'claude': { icon: <Brain className="w-4 h-4" />, color: 'text-orange-400', label: 'Claude' },
  'gpt4': { icon: <Sparkles className="w-4 h-4" />, color: 'text-green-400', label: 'GPT-4' },
  'gpt4-mini': { icon: <Bot className="w-4 h-4" />, color: 'text-blue-400', label: 'GPT-4 Mini' },
  'groq': { icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400', label: 'Groq' },
  'gemini': { icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-400', label: 'Gemini' },
};

export default function CeoChat() {
  const { user, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    if (user?.role === 'ceo') {
      loadSessions();
    }
  }, [user]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/ceo/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/ceo/sessions/${sessionId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistic UI update
    const tempUserMsg: Message = {
      id: 'temp-user',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/ceo/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: userMessage,
          model: selectedModel,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        })
      });

      if (!res.ok) throw new Error('Chat request failed');

      const data = await res.json();
      
      // Update session if new
      if (!currentSessionId) {
        setCurrentSessionId(data.session_id);
        loadSessions();
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: data.session_id + '-' + Date.now(),
        role: 'assistant',
        content: data.message,
        model_name: data.model_used,
        provider: data.provider,
        created_at: data.created_at,
      };

      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), 
        { ...tempUserMsg, id: 'user-' + Date.now() }, 
        assistantMsg
      ]);
      setLastModelUsed(data.model_used);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setLastModelUsed(null);
    inputRef.current?.focus();
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/ceo/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // CEO Protection
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ceo') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar - Sessions */}
      <div className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={startNewChat}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            Neuer Chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                currentSessionId === session.id
                  ? 'bg-cyan-500/20 border border-cyan-500/30'
                  : 'hover:bg-slate-800/50'
              }`}
              onClick={() => setCurrentSessionId(session.id)}
            >
              <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-300 truncate">{session.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Model Selector */}
        <div className="p-4 border-t border-slate-800">
          <label className="text-xs text-slate-500 mb-2 block">Modell</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="auto">🤖 Auto (CHIEF wählt)</option>
            <option value="claude">🧠 Claude (Analyse & Code)</option>
            <option value="gpt4">✨ GPT-4 (Allround)</option>
            <option value="gpt4-mini">💨 GPT-4 Mini (Schnell)</option>
            <option value="groq">⚡ Groq (Ultra-Speed)</option>
          </select>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">CHIEF CEO</h1>
              <p className="text-xs text-slate-400">Multi-AI Assistant</p>
            </div>
          </div>
          {lastModelUsed && MODEL_ICONS[lastModelUsed] && (
            <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full ${MODEL_ICONS[lastModelUsed].color}`}>
              {MODEL_ICONS[lastModelUsed].icon}
              <span className="text-sm">{MODEL_ICONS[lastModelUsed].label}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">CHIEF CEO Edition</h2>
              <p className="text-slate-400 max-w-md">
                Dein Multi-AI Assistent. Stell mir jede Frage - ich wähle automatisch das beste Modell.
              </p>
              <div className="flex gap-4 mt-8">
                <div className="px-4 py-2 bg-slate-800/50 rounded-xl text-sm text-slate-400">
                  <span className="text-orange-400">🧠 Claude</span> für Code & Analyse
                </div>
                <div className="px-4 py-2 bg-slate-800/50 rounded-xl text-sm text-slate-400">
                  <span className="text-yellow-400">⚡ Groq</span> für Speed
                </div>
                <div className="px-4 py-2 bg-slate-800/50 rounded-xl text-sm text-slate-400">
                  <span className="text-green-400">✨ GPT-4</span> für alles andere
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-200'
                  }`}
                >
                  {msg.role === 'assistant' && msg.model_name && MODEL_ICONS[msg.model_name] && (
                    <div className={`flex items-center gap-2 mb-2 text-xs ${MODEL_ICONS[msg.model_name].color}`}>
                      {MODEL_ICONS[msg.model_name].icon}
                      <span>{MODEL_ICONS[msg.model_name].label}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                <span className="text-slate-400">CHIEF denkt nach...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-800">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht an CHIEF..."
              rows={1}
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-5 py-4 pr-14 resize-none focus:outline-none focus:border-cyan-500 placeholder-slate-500"
              style={{ minHeight: '60px', maxHeight: '200px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-600 rounded-xl flex items-center justify-center transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Enter zum Senden • Shift+Enter für neue Zeile
          </p>
        </div>
      </div>
    </div>
  );
}

