import React, { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '../lib/supabaseClient';
import { PowerHourEvent, PowerHourParticipant } from '../../types/v2';
import { Zap, Crown, Trophy, Flame, Users, Target, Clock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityFeedItem {
  id: string;
  user_name: string;
  activity: 'call' | 'message' | 'appointment';
  points: number;
  timestamp: string;
}

export const PowerHourPage: React.FC = () => {
  const [event, setEvent] = useState<PowerHourEvent | null>(null);
  const [participants, setParticipants] = useState<PowerHourParticipant[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    loadUser();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!event || event.status !== 'live') return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!event) return;

    const channel = supabaseClient
      .channel(`power_hour:${event.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'power_hour_participants' },
        async (payload) => {
          // Reload participants
          await loadParticipants();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'power_hour_activity_feed' },
        async (payload) => {
          // Add to activity feed
          if (payload.new) {
            setActivityFeed(prev => [payload.new as ActivityFeedItem, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [event]);

  const loadEvent = async (eventId?: string) => {
    try {
      if (eventId) {
        const { data, error } = await supabaseClient
          .from('power_hour_events')
          .select('*')
          .eq('id', eventId)
          .single();
        
        if (error) throw error;
        setEvent(data);
        await loadParticipants();
      }
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!event) return;
    
    const { data, error } = await supabaseClient
      .from('power_hour_participants')
      .select('*, user:users(name)')
      .eq('event_id', event.id)
      .order('points_earned', { ascending: false });

    if (error) {
      console.error('Error loading participants:', error);
      return;
    }

    setParticipants(data || []);
  };

  const joinEvent = async () => {
    if (!joinCode || !currentUserId) return;

    try {
      const { data: events, error } = await supabaseClient
        .from('power_hour_events')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .eq('status', 'live')
        .limit(1);

      if (error || !events || events.length === 0) {
        alert('Event nicht gefunden oder nicht aktiv');
        return;
      }

      const foundEvent = events[0];
      setEvent(foundEvent);

      // Join as participant
      const { error: joinError } = await supabaseClient
        .from('power_hour_participants')
        .upsert({
          event_id: foundEvent.id,
          user_id: currentUserId,
          calls_made: 0,
          messages_sent: 0,
          appointments_booked: 0,
          points_earned: 0,
          current_streak: 0,
        });

      if (joinError) {
        console.error('Error joining event:', joinError);
      }

      await loadParticipants();
    } catch (err) {
      console.error('Error joining event:', err);
    }
  };

  const logActivity = async (activity: 'call' | 'message' | 'appointment') => {
    if (!event || !currentUserId) return;

    const points = activity === 'appointment' ? 50 : activity === 'call' ? 10 : 5;
    const currentParticipant = participants.find(p => p.user_id === currentUserId);

    if (!currentParticipant) return;

    const updates: any = {
      points_earned: currentParticipant.points_earned + points,
      current_streak: currentParticipant.current_streak + 1,
      last_activity_at: new Date().toISOString(),
    };

    if (activity === 'call') updates.calls_made = currentParticipant.calls_made + 1;
    if (activity === 'message') updates.messages_sent = currentParticipant.messages_sent + 1;
    if (activity === 'appointment') updates.appointments_booked = currentParticipant.appointments_booked + 1;

    const { error } = await supabaseClient
      .from('power_hour_participants')
      .update(updates)
      .eq('id', currentParticipant.id);

    if (error) {
      console.error('Error logging activity:', error);
      return;
    }

    // Add to activity feed
    const { data: { user } } = await supabaseClient.auth.getUser();
    await supabaseClient.from('power_hour_activity_feed').insert({
      event_id: event.id,
      user_id: currentUserId,
      activity_type: activity,
      points_earned: points,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentParticipant = participants.find(p => p.user_id === currentUserId);
  const teamTotalPoints = participants.reduce((sum, p) => sum + p.points_earned, 0);
  const teamProgress = event ? (teamTotalPoints / event.team_goal) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Lade Power Hour...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-md w-full"
        >
          <Zap className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Power Hour beitreten</h2>
          <p className="text-slate-300 mb-6 text-center">Gib den Join-Code ein, um teilzunehmen</p>
          
          <div className="space-y-4">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="JOIN-CODE"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              onKeyPress={(e) => e.key === 'Enter' && joinEvent()}
            />
            <button
              onClick={joinEvent}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all"
            >
              Beitreten
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{event.event_name}</h1>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold">{formatTime(timeRemaining)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>{participants.length} Teilnehmer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Goal Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-400" />
              <span className="font-semibold">Team-Ziel</span>
            </div>
            <span className="text-2xl font-bold">{teamTotalPoints} / {event.team_goal} Punkte</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(teamProgress, 100)}%` }}
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-400" />
                Leaderboard
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {participants.map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0 ? 'bg-yellow-400/20 border-2 border-yellow-400' :
                        index === 1 ? 'bg-slate-400/20 border-2 border-slate-400' :
                        index === 2 ? 'bg-orange-400/20 border-2 border-orange-400' :
                        'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold w-8">
                          {index === 0 ? <Crown className="h-6 w-6 text-yellow-400" /> : `#${index + 1}`}
                        </div>
                        <div>
                          <div className="font-semibold">{participant.user?.name || 'Teilnehmer'}</div>
                          <div className="text-sm text-slate-300 flex items-center gap-2">
                            <Flame className="h-4 w-4 text-orange-400" />
                            {participant.current_streak} Streak
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{participant.points_earned}</div>
                        <div className="text-xs text-slate-400">Punkte</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Activity Feed & Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h3 className="font-bold mb-4">Aktionen</h3>
              <div className="space-y-2">
                <button
                  onClick={() => logActivity('call')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  📞 Anruf (+10 Pkt)
                </button>
                <button
                  onClick={() => logActivity('message')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  💬 Nachricht (+5 Pkt)
                </button>
                <button
                  onClick={() => logActivity('appointment')}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  📅 Termin (+50 Pkt)
                </button>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Feed
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {activityFeed.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm bg-white/5 p-2 rounded"
                    >
                      <span className="font-semibold">{item.user_name}</span>
                      {' '}
                      {item.activity === 'call' ? '📞 Anruf' : item.activity === 'message' ? '💬 Nachricht' : '📅 Termin'}
                      {' '}
                      <span className="text-yellow-400">+{item.points} Pkt</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

