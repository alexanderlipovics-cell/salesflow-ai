import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Phone, MessageCircle, Clock, Building2, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LeadScoreBadge } from '../leads/LeadScoreBadge';
import type { FollowUpTask } from '../../types/database';

type FollowUpTaskCardProps = {
  task: FollowUpTask;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  isLoading?: boolean;
};

function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  let cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d]/g, '');
  if (hasPlus && cleaned.length > 0) {
    cleaned = '+' + cleaned;
  }
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+49' + cleaned.slice(1);
  }
  return cleaned;
}

function buildWhatsAppUrl(phone: string, leadName: string): string {
  const cleanPhone = cleanPhoneNumber(phone).replace('+', '');
  const firstName = leadName?.split(' ')[0] || '';
  const message = `Hi ${firstName}, ich wollte kurz nachfragen – wie sieht's bei dir aus?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return 'Kein Datum';
  
  const due = new Date(dueAt);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `${Math.abs(diffDays)}d überfällig`;
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Morgen';
  if (diffDays <= 7) return `In ${diffDays} Tagen`;
  
  return due.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function getDueDateColor(dueAt: string | null): string {
  if (!dueAt) return 'text-slate-500';
  
  const due = new Date(dueAt);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'text-red-400';
  if (diffDays === 0) return 'text-amber-400';
  if (diffDays <= 2) return 'text-yellow-400';
  return 'text-slate-400';
}

export function FollowUpTaskCard({
  task,
  onComplete,
  onSkip,
  isLoading = false,
}: FollowUpTaskCardProps) {
  const lead = task.lead;
  const score = lead?.score ?? 0;
  const hasPhone = !!lead?.phone;

  const handleCall = async () => {
    if (!lead?.phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanPhone = cleanPhoneNumber(lead.phone);
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = async () => {
    if (!lead?.phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = buildWhatsAppUrl(lead.phone, lead.name);
    Linking.openURL(url);
  };

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onComplete(task.id);
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip(task.id);
  };

  return (
    <View className="bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-800">
      {/* Header: Lead Name + Score */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 mb-1">
            <User size={14} color="#64748b" />
            <Text className="text-white text-lg font-bold" numberOfLines={1}>
              {lead?.name || 'Unbekannt'}
            </Text>
          </View>
          
          <View className="flex-row items-center gap-2">
            <Building2 size={12} color="#475569" />
            <Text className="text-slate-500 text-sm" numberOfLines={1}>
              {lead?.company || 'Keine Firma'}
            </Text>
          </View>
        </View>

        {/* Score Badge */}
        <LeadScoreBadge score={score} size="md" showIcon showLabel />
      </View>

      {/* Due Date & Note */}
      <View className="flex-row items-center gap-2 mb-3">
        <Clock size={14} color="#64748b" />
        <Text className={`text-sm font-medium ${getDueDateColor(task.due_at)}`}>
          {formatDueDate(task.due_at)}
        </Text>
        {lead?.vertical && (
          <View className="bg-slate-800 px-2 py-0.5 rounded-full ml-auto">
            <Text className="text-slate-500 text-xs font-semibold uppercase">
              {lead.vertical}
            </Text>
          </View>
        )}
      </View>

      {/* Note */}
      {task.note && (
        <View className="bg-slate-800/50 rounded-xl p-3 mb-3">
          <Text className="text-slate-300 text-sm italic">"{task.note}"</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        {/* Contact Buttons */}
        <TouchableOpacity
          onPress={handleCall}
          disabled={!hasPhone}
          className={`flex-row items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl ${
            hasPhone
              ? 'bg-blue-500/10 border border-blue-500/30'
              : 'bg-slate-800 opacity-40'
          }`}
        >
          <Phone size={16} color={hasPhone ? '#3b82f6' : '#64748b'} />
          <Text className={`text-sm font-semibold ${hasPhone ? 'text-blue-400' : 'text-slate-500'}`}>
            Call
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleWhatsApp}
          disabled={!hasPhone}
          className={`flex-row items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl ${
            hasPhone
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-slate-800 opacity-40'
          }`}
        >
          <MessageCircle size={16} color={hasPhone ? '#10B981' : '#64748b'} />
          <Text className={`text-sm font-semibold ${hasPhone ? 'text-emerald-400' : 'text-slate-500'}`}>
            WA
          </Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Status Buttons */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700"
        >
          <Text className="text-slate-400 text-sm font-semibold">Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleComplete}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-600"
        >
          <Text className="text-white text-sm font-bold">Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

