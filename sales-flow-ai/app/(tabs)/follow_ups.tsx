import { useState, useCallback } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Clock,
  ArrowUpDown,
  Flame,
  Filter,
  CheckCircle2,
  Trophy,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { FollowUpTaskCard } from '../../components/followup/FollowUpTaskCard';
import { LeadScoreBadge } from '../../components/leads/LeadScoreBadge';
import type { FollowUpTask } from '../../types/database';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type SortOption = 'due_date' | 'score' | 'name';
type FilterOption = 'all' | 'hot' | 'today' | 'overdue';

// ─────────────────────────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────────────────────────

async function fetchFollowUpTasks(
  sortBy: SortOption,
  filter: FilterOption
): Promise<FollowUpTask[]> {
  // Basis Query: Tasks mit Lead und Score
  let query = supabase
    .from('lead_tasks')
    .select(`
      *,
      lead:leads!inner(
        *,
        lead_scores(score)
      )
    `)
    .eq('task_type', 'follow_up')
    .eq('status', 'open');

  // Filter anwenden
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  switch (filter) {
    case 'today':
      query = query
        .gte('due_at', todayStart.toISOString())
        .lt('due_at', todayEnd.toISOString());
      break;
    case 'overdue':
      query = query.lt('due_at', now.toISOString());
      break;
    // 'hot' wird client-seitig gefiltert da Score im Lead ist
  }

  // Sortierung anwenden
  switch (sortBy) {
    case 'due_date':
      query = query.order('due_at', { ascending: true, nullsFirst: false });
      break;
    case 'name':
      query = query.order('lead(name)', { ascending: true });
      break;
    case 'score':
      // Score-Sortierung wird client-seitig gemacht
      query = query.order('due_at', { ascending: true });
      break;
  }

  query = query.limit(50);

  const { data, error } = await query;

  if (error) {
    logger.error('Follow-Up Tasks laden fehlgeschlagen', error);
    throw new Error(error.message);
  }

  // Transformiere Daten: Score aus lead_scores extrahieren
  let tasks = (data || []).map((task: any) => {
    const leadScore = task.lead?.lead_scores?.[0]?.score ?? 0;
    const temperature =
      leadScore >= 70 ? 'hot' : leadScore >= 40 ? 'warm' : 'cold';

    return {
      ...task,
      lead: {
        ...task.lead,
        score: leadScore,
        temperature,
        lead_scores: undefined, // Cleanup
      },
    };
  }) as FollowUpTask[];

  // Client-seitige Filter für Hot Leads
  if (filter === 'hot') {
    tasks = tasks.filter((t) => (t.lead?.score ?? 0) >= 70);
  }

  // Client-seitige Sortierung nach Score
  if (sortBy === 'score') {
    tasks.sort((a, b) => (b.lead?.score ?? 0) - (a.lead?.score ?? 0));
  }

  return tasks;
}

async function updateTaskStatus(
  taskId: string,
  status: 'done' | 'skipped'
): Promise<void> {
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
// Filter Chips Component
// ─────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  icon: Icon,
  isActive,
  onPress,
  color = '#64748b',
  activeColor = '#10B981',
}: {
  label: string;
  icon?: any;
  isActive: boolean;
  onPress: () => void;
  color?: string;
  activeColor?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full mr-2 ${
        isActive
          ? 'bg-emerald-500/20 border border-emerald-500/50'
          : 'bg-slate-800 border border-slate-700'
      }`}
    >
      {Icon && <Icon size={14} color={isActive ? activeColor : color} />}
      <Text
        className={`text-sm font-semibold ${
          isActive ? 'text-emerald-400' : 'text-slate-400'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sort Dropdown
// ─────────────────────────────────────────────────────────────────

function SortButton({
  currentSort,
  onSort,
}: {
  currentSort: SortOption;
  onSort: (sort: SortOption) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const sortLabels: Record<SortOption, string> = {
    due_date: 'Datum',
    score: 'Score',
    name: 'Name',
  };

  const handleSelect = (sort: SortOption) => {
    onSort(sort);
    setIsOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="relative">
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-full border border-slate-700"
      >
        <ArrowUpDown size={14} color="#64748b" />
        <Text className="text-slate-400 text-sm font-semibold">
          {sortLabels[currentSort]}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View className="absolute top-12 right-0 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden z-50 shadow-lg min-w-[120px]">
          {(Object.keys(sortLabels) as SortOption[]).map((sort) => (
            <TouchableOpacity
              key={sort}
              onPress={() => handleSelect(sort)}
              className={`px-4 py-3 ${
                currentSort === sort ? 'bg-emerald-500/20' : ''
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  currentSort === sort ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {sortLabels[sort]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stats Header
// ─────────────────────────────────────────────────────────────────

function StatsHeader({ tasks }: { tasks: FollowUpTask[] }) {
  const totalTasks = tasks.length;
  const hotTasks = tasks.filter((t) => (t.lead?.score ?? 0) >= 70).length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_at) return false;
    return new Date(t.due_at) < new Date();
  }).length;

  return (
    <View className="flex-row gap-3 mb-4">
      <View className="flex-1 bg-slate-900 rounded-xl p-3 border border-slate-800">
        <Text className="text-slate-500 text-xs font-medium mb-1">Offen</Text>
        <Text className="text-white text-xl font-bold">{totalTasks}</Text>
      </View>
      <View className="flex-1 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
        <Text className="text-red-400 text-xs font-medium mb-1">🔥 Hot</Text>
        <Text className="text-red-400 text-xl font-bold">{hotTasks}</Text>
      </View>
      <View className="flex-1 bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
        <Text className="text-amber-400 text-xs font-medium mb-1">⚠️ Überfällig</Text>
        <Text className="text-amber-400 text-xl font-bold">{overdueTasks}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function FollowUpsScreen() {
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['follow-up-tasks', sortBy, filter],
    queryFn: () => fetchFollowUpTasks(sortBy, filter),
  });

  // Update task mutation
  const mutation = useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: 'done' | 'skipped';
    }) => updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
    },
  });

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Handlers
  const handleComplete = (taskId: string) => {
    mutation.mutate({ taskId, status: 'done' });
  };

  const handleSkip = (taskId: string) => {
    mutation.mutate({ taskId, status: 'skipped' });
  };

  const handleFilterChange = (newFilter: FilterOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  };

  // ─────────────────────────────────────────────────────────────────
  // Render: Loading State
  // ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-slate-400 mt-4">Lade Follow-Ups...</Text>
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
          <Clock size={40} color="#ef4444" />
        </View>
        <Text className="text-white text-xl font-bold mb-2">Fehler</Text>
        <Text className="text-slate-500 text-center">
          {(error as Error)?.message || 'Tasks konnten nicht geladen werden.'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-6 px-6 py-3 bg-emerald-600 rounded-xl"
        >
          <Text className="text-white font-bold">Erneut versuchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Empty State
  // ─────────────────────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
        <View className="w-24 h-24 bg-emerald-500/10 rounded-full items-center justify-center mb-6">
          <Trophy size={48} color="#10B981" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">
          Keine Follow-Ups! 🎉
        </Text>
        <Text className="text-slate-500 text-center">
          {filter !== 'all'
            ? 'Keine Tasks mit diesem Filter. Probiere einen anderen.'
            : 'Alle Follow-Ups erledigt. Super Arbeit!'}
        </Text>
        {filter !== 'all' && (
          <TouchableOpacity
            onPress={() => setFilter('all')}
            className="mt-6 px-6 py-3 bg-slate-800 rounded-xl border border-slate-700"
          >
            <Text className="text-slate-300 font-semibold">Alle anzeigen</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Task List
  // ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-emerald-500/10 rounded-full items-center justify-center">
              <Clock size={20} color="#10B981" />
            </View>
            <Text className="text-white text-xl font-bold">Follow-Ups</Text>
          </View>
          <SortButton currentSort={sortBy} onSort={setSortBy} />
        </View>

        {/* Stats */}
        <StatsHeader tasks={tasks} />

        {/* Filter Chips */}
        <View className="flex-row mb-2">
          <FilterChip
            label="Alle"
            isActive={filter === 'all'}
            onPress={() => handleFilterChange('all')}
          />
          <FilterChip
            label="Hot"
            icon={Flame}
            isActive={filter === 'hot'}
            onPress={() => handleFilterChange('hot')}
            color="#ef4444"
            activeColor="#ef4444"
          />
          <FilterChip
            label="Heute"
            icon={Clock}
            isActive={filter === 'today'}
            onPress={() => handleFilterChange('today')}
          />
          <FilterChip
            label="Überfällig"
            isActive={filter === 'overdue'}
            onPress={() => handleFilterChange('overdue')}
            color="#f59e0b"
            activeColor="#f59e0b"
          />
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FollowUpTaskCard
            task={item}
            onComplete={handleComplete}
            onSkip={handleSkip}
            isLoading={mutation.isPending}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
        ItemSeparatorComponent={() => <View className="h-1" />}
      />
    </SafeAreaView>
  );
}

