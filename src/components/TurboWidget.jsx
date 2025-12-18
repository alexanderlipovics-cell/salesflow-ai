import React, { useState, useEffect } from 'react';
import { Zap, ChevronRight } from 'lucide-react';

const API_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TurboWidget = ({ onOpenTurbo }) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCount();
  }, []);

  const fetchCount = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_URL}/api/sequences/turbo-today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCount(data.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || count === 0) return null;

  return (
    <button
      onClick={onOpenTurbo}
      className="w-full p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 rounded-xl transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white">{count} Follow-ups heute</p>
            <p className="text-sm text-gray-400">Turbo Mode starten</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-400">{count}</span>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
};

export default TurboWidget;

