import { Text, View, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Crosshair, Phone, MessageCircle, Check, SkipForward, Trophy } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import type { HunterTask } from '../../types/database';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────────────────────────

async function fetchHunterTasks(): Promise<HunterTask[]> {
  const { data, error } = await supabase
    .from('lead_tasks')
    .select(`
      *,
      lead:leads(*)
    `)
    .eq('task_type', 'hunter')
    .eq('status', 'open')
    .order('due_at', { ascending: true })
    .limit(20);

  if (error) {
    logger.error('Hunter Tasks laden fehlgeschlagen', error);
    throw new Error(error.message);
  }

  return (data as HunterTask[]) || [];
}

async function markTaskAs(taskId: string, status: 'done' | 'skipped'): Promise<void> {
  const { error } = await supabase
    .from('lead_tasks')
    .update({ status })
    .eq('id', taskId);

  if (error) {
    logger.error('Task Update fehlgeschlagen', error);
    throw new Error(error.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  // Alle nicht-Ziffern entfernen, außer führendes +
  let cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d]/g, '');
  if (hasPlus && cleaned.length > 0) {
    cleaned = '+' + cleaned;
  }
  // Deutsche Nummer ohne Ländercode
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+49' + cleaned.slice(1);
  }
  return cleaned;
}

function buildWhatsAppUrl(phone: string, leadName: string): string {
  const cleanPhone = cleanPhoneNumber(phone).replace('+', '');
  const firstName = leadName?.split(' ')[0] || '';
  const message = `Hi ${firstName}, kurze Frage: Hast du gerade 2 Minuten?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function HunterScreen() {
  const queryClient = useQueryClient();

  // Fetch hunter tasks
  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ['hunterTasks'],
    queryFn: fetchHunterTasks,
  });

  // Mark task mutation
  const mutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'done' | 'skipped' }) =>
      markTaskAs(taskId, status),
    onSuccess: () => {
      // Optimistic UI: Liste sofort aktualisieren
      queryClient.invalidateQueries({ queryKey: ['hunterTasks'] });
    },
  });

  // Current task (Stapel-Logik: immer nur der erste)
  const currentTask = tasks[0];
  const lead = currentTask?.lead;
  const remainingCount = tasks.length;

  // Action handlers
  const handleDone = async () => {
    if (!currentTask) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    mutation.mutate({ taskId: currentTask.id, status: 'done' });
  };

  const handleSkip = async () => {
    if (!currentTask) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mutation.mutate({ taskId: currentTask.id, status: 'skipped' });
  };

  const handleWhatsApp = async () => {
    if (!lead?.phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = buildWhatsAppUrl(lead.phone, lead.name);
    Linking.openURL(url);
  };

  const handleCall = async () => {
    if (!lead?.phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanPhone = cleanPhoneNumber(lead.phone);
    Linking.openURL(`tel:${cleanPhone}`);
  };

  // ─────────────────────────────────────────────────────────────────
  // Render: Loading State
  // ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-slate-400 mt-4">Lade Hunter Tasks...</Text>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Error State
  // ─────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <View className="w-20 h-20 bg-red-500/10 rounded-full items-center justify-center mb-6">
          <Crosshair size={40} color="#ef4444" />
        </View>
        <Text className="text-white text-xl font-bold mb-2">Fehler</Text>
        <Text className="text-slate-500 text-center">
          {(error as Error)?.message || 'Tasks konnten nicht geladen werden.'}
        </Text>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Empty State (Alles erledigt!)
  // ─────────────────────────────────────────────────────────────────

  if (!currentTask) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <View className="w-24 h-24 bg-emerald-500/10 rounded-full items-center justify-center mb-6">
          <Trophy size={48} color="#10B981" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">Alles erledigt! 🎯</Text>
        <Text className="text-slate-500 text-center">
          Keine offenen Hunter Tasks. Zeit für einen Kaffee ☕
        </Text>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Current Task Card
  // ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 bg-emerald-500/10 rounded-full items-center justify-center">
            <Crosshair size={20} color="#10B981" />
          </View>
          <Text className="text-white text-xl font-bold">Hunter Mode</Text>
        </View>
        <View className="bg-slate-800 px-3 py-1 rounded-full">
          <Text className="text-slate-400 text-sm font-semibold">
            {remainingCount} offen
          </Text>
        </View>
      </View>

      {/* Task Card */}
      <View className="flex-1 justify-center">
        <View className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
          {/* Lead Info */}
          <View className="mb-6">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold">
                  {lead?.name || 'Unbekannter Lead'}
                </Text>
                <Text className="text-slate-400 text-base mt-1">
                  {lead?.company || 'Keine Firma'}
                </Text>
              </View>
              {lead?.vertical && (
                <View className="bg-slate-800 px-3 py-1 rounded-full">
                  <Text className="text-slate-500 text-xs font-bold uppercase">
                    {lead.vertical}
                  </Text>
                </View>
              )}
            </View>

            {/* Note */}
            {currentTask.note && (
              <View className="bg-slate-800/50 rounded-xl p-3 mt-4">
                <Text className="text-slate-300 text-sm italic">
                  "{currentTask.note}"
                </Text>
              </View>
            )}
          </View>

          {/* Contact Buttons */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={handleCall}
              disabled={!lead?.phone}
              className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl ${
                lead?.phone ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-slate-800 opacity-50'
              }`}
            >
              <Phone size={20} color={lead?.phone ? '#3b82f6' : '#64748b'} />
              <Text className={`font-bold ${lead?.phone ? 'text-blue-400' : 'text-slate-500'}`}>
                Anrufen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsApp}
              disabled={!lead?.phone}
              className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl ${
                lead?.phone ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800 opacity-50'
              }`}
            >
              <MessageCircle size={20} color={lead?.phone ? '#10B981' : '#64748b'} />
              <Text className={`font-bold ${lead?.phone ? 'text-emerald-400' : 'text-slate-500'}`}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleSkip}
              disabled={mutation.isPending}
              className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-slate-800 border border-slate-700"
            >
              <SkipForward size={20} color="#94a3b8" />
              <Text className="text-slate-300 font-bold">Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDone}
              disabled={mutation.isPending}
              className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600"
              style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check size={20} color="#fff" />
              )}
              <Text className="text-white font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Progress indicator */}
      <View className="py-4 items-center">
        <Text className="text-slate-600 text-sm">
          Nur dieser eine Task zählt. Focus! 🎯
        </Text>
      </View>
    </SafeAreaView>
  );
}
