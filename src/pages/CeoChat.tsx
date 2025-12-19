import React, { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Send, Loader2, Plus, Trash2, MessageSquare, 
  Cpu, Zap, Brain, Bot, Paperclip, X, Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { uploadChiefFile, UploadedFile } from '../utils/uploadChiefFile';
import { supabaseClient } from '../lib/supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://salesflow-ai.onrender.com';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model_name?: string;
  provider?: string;
  routing_reason?: string;
  images?: string[];
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const MODEL_INFO: Record<string, { icon: React.ReactNode; color: string; label: string; bgColor: string }> = {
  'claude': { icon: <Brain className="w-3 h-3" />, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Claude' },
  'gpt4': { icon: <Sparkles className="w-3 h-3" />, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'GPT-4' },
  'gpt4-mini': { icon: <Bot className="w-3 h-3" />, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'GPT-4 Mini' },
  'groq': { icon: <Zap className="w-3 h-3" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Groq' },
  'dalle': { icon: <ImageIcon className="w-3 h-3" />, color: 'text-pink-400', bgColor: 'bg-pink-500/20', label: 'DALL-E' },
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
  const [lastRoutingReason, setLastRoutingReason] = useState<string | null>(null);
  
  // File Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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

  // STRG+V Handler - Screenshot Support
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          addFile(blob);
        }
      }
    }
  };

  const addFile = (file: File) => {
    setFiles(prev => [...prev, file]);
    const objectUrl = URL.createObjectURL(file);
    setPreviews(prev => [...prev, objectUrl]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(file => addFile(file));
  };

  const sendMessage = async () => {
    if ((!input.trim() && files.length === 0) || isLoading) return;

    const currentFiles = [...files];
    const currentInput = input.trim();
    const currentPreviews = [...previews];
    
    // Optimistic UI update
    const tempUserMsg: Message = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: currentInput,
      images: currentPreviews,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    
    setInput('');
    setFiles([]);
    setPreviews([]);
    setIsLoading(true);

    try {
      // 1. Upload Files parallel (wenn vorhanden)
      let uploadedAttachments: UploadedFile[] = [];
      
      if (currentFiles.length > 0) {
        setUploadingFiles(true);
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
          try {
            uploadedAttachments = await Promise.all(
              currentFiles.map(f => uploadChiefFile(f, user.id))
            );
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
            alert('Fehler beim Hochladen der Dateien. Bitte versuche es erneut.');
            return;
          }
        }
        setUploadingFiles(false);
      }

      // 2. API Call mit Files
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/ceo/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: currentInput,
          model: selectedModel,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          files: uploadedAttachments.map(f => ({
            url: f.signedUrl || '',
            type: f.type,
            name: f.name
          }))
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.detail || errorData.error || 'Chat request failed');
      }

      const data = await res.json();
      
      // Update session if new
      if (!currentSessionId) {
        setCurrentSessionId(data.session_id);
        loadSessions();
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.message || data.message_used || 'Keine Antwort erhalten',
        model_name: data.model_used,
        provider: data.provider,
        routing_reason: data.routing_reason,
        created_at: data.created_at || new Date().toISOString(),
      };

      setMessages(prev => [...prev.filter(m => !m.id.startsWith('temp-')), 
        { ...tempUserMsg, id: 'user-' + Date.now() }, 
        assistantMsg
      ]);
      setLastModelUsed(data.model_used);
      setLastRoutingReason(data.routing_reason);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      alert(err instanceof Error ? err.message : 'Fehler beim Senden der Nachricht');
    } finally {
      setIsLoading(false);
      setUploadingFiles(false);
      inputRef.current?.focus();
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setLastModelUsed(null);
    setLastRoutingReason(null);
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

  // Render markdown-style content (basic)
  const renderContent = (content: string) => {
    // Check for image markdown: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts = content.split(imageRegex);
    
    if (parts.length === 1) {
      return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
    }

    const elements: React.ReactNode[] = [];
    let i = 0;
    let match;
    let lastIndex = 0;
    
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = regex.exec(content)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${i++}`} className="whitespace-pre-wrap">
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }
      // Add the image
      elements.push(
        <img 
          key={`img-${i++}`} 
          src={match[2]} 
          alt={match[1]} 
          className="rounded-xl max-w-full max-h-96 border border-gray-700 shadow-lg my-3"
        />
      );
      lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-${i++}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex)}
        </span>
      );
    }
    
    return <div className="leading-relaxed">{elements}</div>;
  };

  // CEO Protection
  if (authLoading) {
    return (
      <div className="h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ceo') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-[#0B0F19] text-white overflow-hidden">
      {/* Hidden file input */}
              <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0F1420] border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CHIEF CEO
          </h1>
          <p className="text-xs text-gray-500 mt-1">Multi-AI Assistant</p>
        </div>

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
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => setCurrentSessionId(session.id)}
            >
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-300 truncate">{session.title}</span>
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
        <div className="p-4 border-t border-gray-800">
          <label className="text-xs text-gray-500 mb-2 block">Modell</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-[#1A202C] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="auto">🤖 Auto (CHIEF wählt)</option>
            <option value="claude">🧠 Claude (Analyse & Code)</option>
            <option value="gpt4">✨ GPT-4 (Allround)</option>
            <option value="gpt4-mini">💨 GPT-4 Mini (Schnell)</option>
            <option value="groq">⚡ Groq (Ultra-Speed)</option>
          </select>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative">
        
        {/* HEADER (Fixed) */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-gray-800/50 bg-[#0B0F19]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-medium text-gray-200">CHIEF Active</span>
              </div>
              {lastRoutingReason && (
                <p className="text-xs text-gray-500">{lastRoutingReason}</p>
              )}
            </div>
          </div>
          
          {lastModelUsed && MODEL_INFO[lastModelUsed] && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${MODEL_INFO[lastModelUsed].bgColor} ${MODEL_INFO[lastModelUsed].color}`}>
              {MODEL_INFO[lastModelUsed].icon}
              <span className="text-sm font-medium">{MODEL_INFO[lastModelUsed].label}</span>
            </div>
          )}
        </header>

        {/* CHAT HISTORY (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
                  <Brain className="w-10 h-10 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">CHIEF CEO Edition</h2>
                <p className="text-gray-400 max-w-md mb-8">
                  Dein Multi-AI Assistent. Stell mir jede Frage - ich wähle automatisch das beste Modell.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="px-4 py-2 bg-[#1A202C] rounded-xl text-sm text-gray-400 border border-gray-700">
                    <span className="text-orange-400">🧠 Claude</span> für Code & Analyse
                  </div>
                  <div className="px-4 py-2 bg-[#1A202C] rounded-xl text-sm text-gray-400 border border-gray-700">
                    <span className="text-yellow-400">⚡ Groq</span> für Speed
                  </div>
                  <div className="px-4 py-2 bg-[#1A202C] rounded-xl text-sm text-gray-400 border border-gray-700">
                    <span className="text-pink-400">🎨 DALL-E</span> für Bilder
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-6">STRG+V für Screenshots • Enter zum Senden</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center mr-3 mt-1 shadow-lg flex-shrink-0">
                      <Cpu className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className="max-w-[80%] space-y-2">
                    {/* User Images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {msg.images.map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt="Upload" 
                            className="rounded-xl max-h-40 border border-gray-700 shadow-lg" 
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-5 py-4 shadow-xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none'
                          : 'bg-[#1A202C] border border-gray-700/50 text-gray-100 rounded-bl-none'
                      }`}
                    >
                      {renderContent(msg.content)}
                      
                      {/* Model Badge for Assistant */}
                      {msg.role === 'assistant' && msg.model_name && MODEL_INFO[msg.model_name] && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2">
                          <span className={`text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 ${MODEL_INFO[msg.model_name].color}`}>
                            {MODEL_INFO[msg.model_name].icon}
                            {MODEL_INFO[msg.model_name].label}
                          </span>
                          {msg.routing_reason && (
                            <span className="text-[10px] text-gray-500">• {msg.routing_reason}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center mr-3 shadow-lg">
                  <Cpu className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#1A202C] border border-gray-700/50 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-gray-400 text-sm">CHIEF denkt nach...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT AREA (Fixed at bottom) */}
        <div className="p-4 bg-[#0B0F19]/90 backdrop-blur-lg border-t border-gray-800">
          <div className="max-w-3xl mx-auto">
            
            {/* File Preview Zone */}
            {previews.length > 0 && (
              <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative group flex-shrink-0">
                    <img src={src} className="h-16 w-16 object-cover rounded-lg border border-cyan-500/50 shadow-lg" />
                    <button 
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Indicator */}
            {uploadingFiles && (
              <div className="flex items-center gap-2 text-cyan-400 text-sm mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dateien werden hochgeladen...</span>
              </div>
            )}

            {/* Input Container */}
            <div className="relative flex items-end gap-2 bg-[#131825] border border-gray-700 rounded-xl p-2 shadow-2xl focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
              
              {/* Upload Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Frag CHIEF nach Analysen, Code, Strategie oder drücke STRG+V für Bilder..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm p-2 resize-none focus:outline-none max-h-32 min-h-[44px]"
                style={{ height: 'auto' }}
              />

              {/* Send Button */}
              <button
                onClick={sendMessage}
                disabled={(!input.trim() && files.length === 0) || isLoading}
                className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-600">
                CHIEF wählt automatisch: 
                <span className="text-orange-400 ml-1">Claude</span> (Analyse) • 
                <span className="text-yellow-400 ml-1">Groq</span> (Speed) • 
                <span className="text-green-400 ml-1">GPT-4</span> (Allround) • 
                <span className="text-pink-400 ml-1">DALL-E</span> (Bilder)
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
