import React, { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type ChallengeListItem = {
  id: string;
  squad_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  target_points: number;
  is_active: boolean;
};

type ChallengeReportItem = {
  challenge_id: string;
  title: string;
  start_date: string;
  end_date: string;
  target_points: number;
  total_points: number;
  total_contacts: number;
  member_count: number;
  active_members: number;
  inactive_members: number;
};

type ChallengeReportResponse = {
  squad_id: string;
  squad_name?: string;
  period_from: string;
  period_to: string;
  challenges: ChallengeReportItem[];
  summary: {
    total_challenges: number;
    total_points: number;
    total_contacts: number;
  };
};

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export const SquadChallengeManager: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────
  
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<ChallengeReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    squad_id: "", // TODO: Get from context/auth
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    target_points: 1000,
    is_active: true,
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  
  // ─────────────────────────────────────────────────────────────────
  // Functions
  // ─────────────────────────────────────────────────────────────────
  
  const loadChallenges = async () => {
    if (!form.squad_id) {
      // TODO: Get squad_id from context
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/api/squad/challenges?squad_id=${form.squad_id}`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load challenges: ${response.statusText}`);
      }
      
      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges");
      console.error("Error loading challenges:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadReport = async () => {
    if (!form.squad_id) {
      return;
    }
    
    try {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const dateFrom = firstDay.toISOString().split('T')[0];
      const dateTo = lastDay.toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_BASE}/api/squad/report/challenges?squad_id=${form.squad_id}&date_from=${dateFrom}&date_to=${dateTo}`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to load report: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error("Error loading report:", err);
    }
  };
  
  const handleSelect = (challenge: ChallengeListItem) => {
    setSelectedId(challenge.id);
    setIsEditMode(true);
    
    setForm({
      squad_id: challenge.squad_id,
      title: challenge.title,
      description: challenge.description || "",
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      target_points: challenge.target_points,
      is_active: challenge.is_active,
    });
  };
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleNew = () => {
    setSelectedId(null);
    setIsEditMode(false);
    setForm({
      squad_id: form.squad_id, // Keep squad_id
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      target_points: 1000,
      is_active: true,
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title || !form.start_date || !form.end_date) {
      setError("Bitte fülle alle Pflichtfelder aus");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const url = isEditMode && selectedId
        ? `${API_BASE}/api/squad/challenge/${selectedId}`
        : `${API_BASE}/api/squad/challenge`;
      
      const method = isEditMode ? 'PATCH' : 'POST';
      
      const body: any = {};
      
      if (isEditMode) {
        // Partial update - only send changed fields
        if (form.title) body.title = form.title;
        if (form.description !== undefined) body.description = form.description;
        if (form.start_date) body.start_date = form.start_date;
        if (form.end_date) body.end_date = form.end_date;
        if (form.target_points) body.target_points = form.target_points;
        body.is_active = form.is_active;
      } else {
        // Full create
        body.squad_id = form.squad_id;
        body.title = form.title;
        body.description = form.description || null;
        body.start_date = form.start_date;
        body.end_date = form.end_date;
        body.target_points = form.target_points;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch {
          // Body already consumed or invalid JSON
        }
        throw new Error(errorDetail || `Failed to ${isEditMode ? 'update' : 'create'} challenge`);
      }
      
      // Reload data
      await loadChallenges();
      await loadReport();
      
      // Reset form
      if (!isEditMode) {
        handleNew();
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
      console.error("Error saving challenge:", err);
    } finally {
      setSaving(false);
    }
  };
  
  // ─────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (form.squad_id) {
      loadChallenges();
      loadReport();
    }
  }, [form.squad_id]);
  
  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  
  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Left Side - 50% */}
      <div className="flex w-1/2 flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Squad Challenges</h1>
          <button
            onClick={handleNew}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Neue Challenge
          </button>
        </div>
        
        {/* Challenge List */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-md border border-gray-200 p-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Lädt...</div>
          ) : challenges.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Keine Challenges vorhanden</div>
          ) : (
            challenges.map((challenge) => {
              const isSelected = selectedId === challenge.id;
              const startDate = new Date(challenge.start_date).toLocaleDateString('de-DE');
              const endDate = new Date(challenge.end_date).toLocaleDateString('de-DE');
              
              return (
                <button
                  key={challenge.id}
                  onClick={() => handleSelect(challenge)}
                  className={`flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    isSelected
                      ? 'border border-blue-500 bg-blue-50'
                      : 'border border-gray-200'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{challenge.title}</span>
                    <span
                      className={`text-xs ${
                        challenge.is_active
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {challenge.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {startDate} – {endDate} · Ziel: {challenge.target_points} Punkte
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {/* Report Section */}
        {report && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {report.squad_name || 'Squad'} Report
              </h2>
              <span className="text-xs text-gray-500">
                {new Date(report.period_from).toLocaleDateString('de-DE')} –{' '}
                {new Date(report.period_to).toLocaleDateString('de-DE')}
              </span>
            </div>
            
            {/* Summary Stats */}
            <div className="mb-3 grid grid-cols-3 gap-2 rounded-md bg-white p-2">
              <div className="text-center">
                <div className="text-lg font-bold">{report.summary.total_challenges}</div>
                <div className="text-xs text-gray-500">Challenges</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{report.summary.total_points}</div>
                <div className="text-xs text-gray-500">Punkte</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{report.summary.total_contacts}</div>
                <div className="text-xs text-gray-500">Kontakte</div>
              </div>
            </div>
            
            {/* Challenge Cards */}
            <div className="space-y-2">
              {report.challenges.map((ch) => {
                const startDate = new Date(ch.start_date).toLocaleDateString('de-DE');
                const endDate = new Date(ch.end_date).toLocaleDateString('de-DE');
                const progress = ch.target_points > 0 
                  ? Math.min(100, (ch.total_points / ch.target_points) * 100)
                  : 0;
                
                return (
                  <div
                    key={ch.challenge_id}
                    className="rounded-md bg-white p-2"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{ch.title}</span>
                      <span className="text-gray-500">
                        {startDate} – {endDate}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <div className="font-medium">{ch.total_points}</div>
                        <div className="text-gray-500">Punkte</div>
                        <div className="text-[10px] text-gray-400">
                          {progress.toFixed(0)}% von {ch.target_points}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{ch.total_contacts}</div>
                        <div className="text-gray-500">Kontakte</div>
                      </div>
                      <div>
                        <div className="font-medium">
                          {ch.active_members}/{ch.member_count}
                        </div>
                        <div className="text-gray-500">aktiv</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Right Side - 50% */}
      <div className="flex w-1/2 flex-col gap-4">
        {/* Form Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditMode ? 'Challenge bearbeiten' : 'Neue Challenge'}
          </h2>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 rounded-md border border-gray-200 bg-white p-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Beschreibung
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                Startdatum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={form.start_date}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                Enddatum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={form.end_date}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Target Points */}
          <div>
            <label htmlFor="target_points" className="block text-sm font-medium text-gray-700">
              Ziel-Punkte
            </label>
            <input
              type="number"
              id="target_points"
              name="target_points"
              value={form.target_points}
              onChange={handleInputChange}
              min={0}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          
          {/* Is Active (only in edit mode) */}
          {isEditMode && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={form.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Challenge aktiv
              </label>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving
                ? 'Speichert...'
                : isEditMode
                ? 'Änderungen speichern'
                : 'Challenge anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

