import { z } from 'zod';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  SquadCoachRowSchema,
  FollowupScoredSchema,
  CoachingInputSchema,
  CoachingOutputSchema,
  type SquadCoachRow,
  type FollowupScored,
  type CoachingInput,
  type CoachingOutput,
} from '@/types/coaching';

export async function fetchSquadCoachReport(
  workspaceId: string,
  daysBack: number
): Promise<SquadCoachRow[]> {
  const { data, error } = await supabaseClient.rpc('squad_coach_report', {
    p_workspace_id: workspaceId,
    p_days_back: daysBack,
  });

  if (error) {
    throw new Error(`Failed to fetch squad coach report: ${error.message}`);
  }

  const parsed = z.array(SquadCoachRowSchema).safeParse(data);
  if (!parsed.success) {
    console.error('Squad Coach Report validation error', parsed.error);
    throw new Error('Invalid squad coach report data');
  }

  return parsed.data;
}

export async function fetchFollowupsScored(
  workspaceId: string,
  limit = 2000
): Promise<FollowupScored[]> {
  const { data, error } = await supabaseClient
    .from('view_followups_scored')
    .select(
      `
        task_id,
        workspace_id,
        assigned_user_id,
        contact_id,
        contact_name,
        contact_status,
        task_status,
        due_at,
        last_action_type,
        last_contact_at,
        segment_inferred,
        priority_score
      `
    )
    .eq('workspace_id', workspaceId)
    .order('priority_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch followups: ${error.message}`);
  }

  const parsed = z.array(FollowupScoredSchema).safeParse(data);
  if (!parsed.success) {
    console.error('Followups validation error', parsed.error);
    throw new Error('Invalid followups data');
  }

  return parsed.data;
}

export async function requestCoachingFromChief(
  input: CoachingInput,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<CoachingOutput> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  const validatedInput = CoachingInputSchema.parse(input);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/coaching/squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedInput),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`CHIEF API request failed (${response.status}): ${text}`);
      }

      const raw = await response.json();
      const parsed = CoachingOutputSchema.safeParse(raw);
      if (!parsed.success) {
        console.error('Coaching output validation error', parsed.error);
        throw new Error('Invalid coaching response structure');
      }

      return parsed.data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      if (err.message.includes('Invalid')) {
        throw err;
      }

      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('CHIEF API request failed after retries');
}

export function buildCoachingInput(
  workspaceId: string,
  daysBack: number,
  language: string,
  report: SquadCoachRow[],
  followups: FollowupScored[]
): CoachingInput {
  if (report.length === 0) {
    throw new Error('Cannot build coaching input: empty report');
  }

  const totalReps = report.length;
  const avgReplyRate =
    report.reduce((sum, row) => sum + row.reply_rate_percent, 0) / totalReps;
  const avgConversion =
    report.reduce((sum, row) => sum + row.conversion_rate_percent, 0) / totalReps;
  const avgOverdue =
    report.reduce((sum, row) => sum + row.overdue_followups, 0) / totalReps;

  const followupsByUser = new Map<string, FollowupScored[]>();
  for (const followup of followups) {
    const existing = followupsByUser.get(followup.assigned_user_id) ?? [];
    existing.push(followup);
    followupsByUser.set(followup.assigned_user_id, existing);
  }

  const reps = report.map((row) => {
    const userFollowups =
      followupsByUser.get(row.user_id)?.sort((a, b) => b.priority_score - a.priority_score) ?? [];

    const displayName = row.full_name || row.email?.split('@')[0] || null;

    return {
      user_id: row.user_id,
      email: row.email,
      display_name: displayName,
      focus_area: row.focus_area,
      metrics: {
        leads_created: row.leads_created,
        contacts_contacted: row.contacts_contacted,
        contacts_signed: row.contacts_signed,
        first_messages: row.first_messages,
        reply_events: row.reply_events,
        reply_rate_percent: row.reply_rate_percent,
        conversion_rate_percent: row.conversion_rate_percent,
      },
      followups: {
        overdue_followups: row.overdue_followups,
        high_priority_open_followups: row.high_priority_open_followups,
        avg_priority_score: row.avg_priority_score,
      },
      recent_examples: {
        high_priority_contacts: userFollowups.slice(0, 5).map((item) => ({
          contact_name: item.contact_name,
          segment: item.segment_inferred,
          priority_score: item.priority_score,
          status: item.contact_status,
          due_at: item.due_at,
          last_contact_at: item.last_contact_at,
        })),
      },
    };
  });

  return {
    workspace_id: workspaceId,
    timeframe_days: daysBack,
    language,
    team_summary: {
      total_reps: totalReps,
      avg_reply_rate_percent: Number(avgReplyRate.toFixed(2)),
      avg_conversion_rate_percent: Number(avgConversion.toFixed(2)),
      avg_overdue_followups: Number(avgOverdue.toFixed(2)),
    },
    reps,
  };
}

