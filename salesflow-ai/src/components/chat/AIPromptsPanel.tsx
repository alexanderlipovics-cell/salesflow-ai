import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AIPrompt {
  id: string;
  name: string;
  category: string;
  description: string;
  usage_count: number;
}

interface AIPromptsPanelProps {
  onPromptSelect: (prompt: AIPrompt) => void;
}

const CATEGORIES = [
  { value: 'objection_handling', label: '🛡️ Einwand-Behandlung', color: 'bg-red-100 text-red-700' },
  { value: 'upselling', label: '📈 Upselling', color: 'bg-green-100 text-green-700' },
  { value: 'coaching', label: '🎯 Coaching', color: 'bg-purple-100 text-purple-700' },
  { value: 'followup', label: '🔄 Follow-up', color: 'bg-blue-100 text-blue-700' },
  { value: 'leadgen', label: '🚀 Lead-Gen', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'nurture', label: '💚 Nurture', color: 'bg-teal-100 text-teal-700' },
];

export default function AIPromptsPanel({ onPromptSelect }: AIPromptsPanelProps) {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCategory) {
      loadPrompts(selectedCategory);
    }
  }, [selectedCategory]);

  const loadPrompts = async (category: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-prompts/categories/${category}`);
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold mb-4">🤖 AI Prompts</h3>

      {/* Category Selection */}
      <div className="space-y-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`
              w-full p-3 rounded-lg text-left font-medium
              transition-all duration-200
              ${selectedCategory === cat.value 
                ? cat.color + ' shadow-md' 
                : 'bg-gray-50 hover:bg-gray-100'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Prompts List */}
      {selectedCategory && (
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Verfügbare Prompts:</h4>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : prompts.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Prompts verfügbar</p>
          ) : (
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => onPromptSelect(prompt)}
                  className="
                    w-full p-3 text-left
                    bg-blue-50 hover:bg-blue-100
                    border border-blue-200
                    rounded-lg
                    transition-all duration-200
                  "
                >
                  <div className="font-semibold text-blue-900">{prompt.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{prompt.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    🔥 {prompt.usage_count} mal verwendet
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

