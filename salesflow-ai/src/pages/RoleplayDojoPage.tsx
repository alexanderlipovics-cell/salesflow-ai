import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabaseClient';
import { RoleplaySession } from '../../types/v2';
import { MessageSquare, Trophy, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENARIOS = [
  { id: 'cold_call', name: 'Cold Call', description: 'Erstkontakt mit einem neuen Lead' },
  { id: 'objection_handling', name: 'Einwand-Handling', description: 'Umgang mit typischen Einwänden' },
  { id: 'closing', name: 'Closing', description: 'Abschluss-Gespräch führen' },
  { id: 'recruitment', name: 'Rekrutierung', description: 'Neue Partner gewinnen' },
];

const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Einfach', color: 'bg-green-500' },
  { id: 'medium', name: 'Mittel', color: 'bg-yellow-500' },
  { id: 'hard', name: 'Schwer', color: 'bg-orange-500' },
  { id: 'expert', name: 'Experte', color: 'bg-red-500' },
];

const MOCK_AI_RESPONSES: Record<string, Record<string, string[]>> = {
  cold_call: {
    easy: [
      "Hallo, ich bin interessiert. Erzähl mir mehr!",
      "Klingt interessant, aber ich habe gerade keine Zeit.",
    ],
    medium: [
      "Ich hab keine Zeit für sowas...",
      "Klingt interessant, aber ich hab wirklich keine Zeit.",
      "Wie funktioniert das denn genau?",
    ],
    hard: [
      "Ich bin nicht interessiert. Bitte rufen Sie nicht mehr an.",
      "Das klingt nach einem Scam. Was ist das für ein Unternehmen?",
    ],
    expert: [
      "Ich habe schon viele solcher Angebote gehört. Warum sollte ich Ihnen glauben?",
      "Das ist doch nur ein Pyramidensystem, oder?",
    ],
  },
  objection_handling: {
    easy: ["Okay, ich verstehe. Können Sie mir mehr Details geben?"],
    medium: ["Ich bin skeptisch. Das klingt zu gut, um wahr zu sein."],
    hard: ["Ich habe schon schlechte Erfahrungen gemacht. Warum sollte ich Ihnen vertrauen?"],
    expert: ["Das ist eindeutig ein MLM-System. Ich will nichts damit zu tun haben."],
  },
  closing: {
    easy: ["Okay, ich bin dabei!"],
    medium: ["Ich muss noch mit meinem Partner sprechen."],
    hard: ["Ich bin noch nicht überzeugt. Was ist, wenn es nicht funktioniert?"],
    expert: ["Ich sehe keinen Mehrwert. Warum sollte ich jetzt unterschreiben?"],
  },
  recruitment: {
    easy: ["Das klingt interessant. Wie kann ich anfangen?"],
    medium: ["Ich bin interessiert, aber ich habe keine Erfahrung im Verkauf."],
    hard: ["Ich habe schon ein Vollzeitjob. Wie soll das funktionieren?"],
    expert: ["Ich habe schon andere MLM-Systeme probiert. Warum sollte dieses anders sein?"],
  },
};

export const RoleplayDojoPage: React.FC = () => {
  const [session, setSession] = useState<RoleplaySession | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [userResponse, setUserResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    loadUser();
  }, []);

  const startSession = async () => {
    if (!selectedScenario || !currentUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('roleplay_sessions')
        .insert({
          user_id: currentUserId,
          scenario_type: selectedScenario,
          difficulty_level: selectedDifficulty as any,
          conversation_turns: [],
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: RoleplaySession = {
        ...data,
        conversation_turns: [],
        performance_score: null,
        feedback: null,
      };

      // Add initial AI message
      const aiResponses = MOCK_AI_RESPONSES[selectedScenario]?.[selectedDifficulty] || ['Hallo, wie kann ich Ihnen helfen?'];
      const initialMessage = {
        role: 'ai' as const,
        content: aiResponses[0],
        timestamp: new Date().toISOString(),
      };

      newSession.conversation_turns = [initialMessage];

      setSession(newSession);
    } catch (err) {
      console.error('Error starting session:', err);
      alert('Fehler beim Starten der Session');
    } finally {
      setLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!session || !userResponse.trim() || !currentUserId) return;

    const newTurn = {
      role: 'user' as const,
      content: userResponse,
      timestamp: new Date().toISOString(),
    };

    const updatedTurns = [...session.conversation_turns, newTurn];

    // Add AI response
    const aiResponses = MOCK_AI_RESPONSES[session.scenario_type]?.[session.difficulty_level] || ['Interessant...'];
    const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    const aiTurn = {
      role: 'ai' as const,
      content: randomResponse,
      timestamp: new Date().toISOString(),
    };

    const finalTurns = [...updatedTurns, aiTurn];

    try {
      const { error } = await supabaseClient
        .from('roleplay_sessions')
        .update({
          conversation_turns: finalTurns,
        })
        .eq('id', session.id);

      if (error) throw error;

      setSession({
        ...session,
        conversation_turns: finalTurns,
      });

      setUserResponse('');
    } catch (err) {
      console.error('Error sending response:', err);
    }
  };

  const completeSession = async () => {
    if (!session || !currentUserId) return;

    setLoading(true);
    try {
      // Calculate mock score (in real app, this would be done by AI)
      const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const mockFeedback = {
        strengths: ['Gute Kommunikation', 'Empathisch', 'Professionell'],
        weaknesses: ['Könnte direkter sein', 'Mehr Fragen stellen'],
        tips: ['Nutze mehr offene Fragen', 'Zeige mehr Enthusiasmus'],
        tone_analysis: {
          confidence: Math.floor(Math.random() * 30) + 70,
          empathy: Math.floor(Math.random() * 30) + 70,
          assertiveness: Math.floor(Math.random() * 30) + 70,
        },
      };

      const { data, error } = await supabaseClient
        .from('roleplay_sessions')
        .update({
          status: 'completed',
          performance_score: mockScore,
          feedback: mockFeedback,
        })
        .eq('id', session.id)
        .select()
        .single();

      if (error) throw error;

      setSession(data);
      setScore(mockScore);
    } catch (err) {
      console.error('Error completing session:', err);
    } finally {
      setLoading(false);
    }
  };

  if (session && session.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center"
          >
            <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Session abgeschlossen!</h2>
            <div className="text-6xl font-bold text-yellow-400 mb-6">{session.performance_score}/100</div>

            {session.feedback && (
              <div className="text-left space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2 text-green-400">Stärken</h3>
                  <ul className="space-y-1">
                    {session.feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="text-slate-300">✓ {strength}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2 text-orange-400">Verbesserungen</h3>
                  <ul className="space-y-1">
                    {session.feedback.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-slate-300">• {weakness}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-2 text-blue-400">Tipps</h3>
                  <ul className="space-y-1">
                    {session.feedback.tips.map((tip, idx) => (
                      <li key={idx} className="text-slate-300">→ {tip}</li>
                    ))}
                  </ul>
                </div>

                {session.feedback.tone_analysis && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Ton-Analyse</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Selbstvertrauen</div>
                        <div className="text-2xl font-bold">{session.feedback.tone_analysis.confidence}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Empathie</div>
                        <div className="text-2xl font-bold">{session.feedback.tone_analysis.empathy}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400 mb-1">Durchsetzungsfähigkeit</div>
                        <div className="text-2xl font-bold">{session.feedback.tone_analysis.assertiveness}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setSession(null);
                setScore(null);
                setSelectedScenario('');
              }}
              className="mt-8 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-all"
            >
              Neue Session starten
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <MessageSquare className="h-10 w-10 text-green-400" />
            Roleplay Dojo
          </h1>
          <p className="text-slate-400 mb-8">Übe deine Verkaufsgespräche mit KI</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {SCENARIOS.map((scenario) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedScenario(scenario.id)}
                className={`bg-slate-900 border rounded-xl p-6 cursor-pointer transition-all ${
                  selectedScenario === scenario.id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{scenario.name}</h3>
                <p className="text-slate-400">{scenario.description}</p>
              </motion.div>
            ))}
          </div>

          {selectedScenario && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold mb-4">Schwierigkeitsgrad</h3>
              <div className="grid grid-cols-4 gap-4">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedDifficulty(level.id)}
                    className={`${level.color} text-white font-semibold py-3 rounded-lg transition-all ${
                      selectedDifficulty === level.id ? 'ring-4 ring-white/50' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startSession}
            disabled={!selectedScenario || loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all"
          >
            {loading ? 'Starte Session...' : 'Session starten'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Roleplay Session</h1>
          {score !== null && (
            <div className="text-3xl font-bold text-yellow-400">{score}/100</div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 min-h-[400px] flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto mb-4">
            <AnimatePresence>
              {session.conversation_turns.map((turn, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      turn.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {turn.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendResponse()}
              placeholder="Deine Antwort..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendResponse}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              Senden
            </button>
          </div>
        </div>

        <button
          onClick={completeSession}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-700 text-white font-bold py-4 rounded-lg transition-all"
        >
          {loading ? 'Wertung wird berechnet...' : 'Session abschließen'}
        </button>
      </div>
    </div>
  );
};

