// ============================================================================
// FILE: src/hooks/__tests__/useSquadCoachReport.test.ts
// DESCRIPTION: Unit tests for useSquadCoachReport hook
// ============================================================================

import { renderHook, waitFor } from '@testing-library/react';
import { useSquadCoachReport } from '../useSquadCoachReport';
import { supabase } from '@/lib/supabaseClient';

jest.mock('@/lib/supabaseClient');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useSquadCoachReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches reports successfully', async () => {
    const mockData = [
      {
        user_id: '1',
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'Sales Rep',
        health_score: 85,
        focus_area: 'balanced',
        coaching_priority: 4,
        conversion_rate_percent: 15,
        reply_rate_percent: 25,
        contacts_contacted: 100,
        contacts_signed: 15,
        overdue_followups: 2,
        high_priority_open_followups: 5,
        avg_days_to_reply: 1.5,
      },
    ];

    mockSupabase.rpc.mockResolvedValue({
      data: mockData,
      error: null,
    } as any);

    const { result } = renderHook(() => useSquadCoachReport('workspace-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.analytics.totalReps).toBe(1);
    expect(result.current.analytics.avgHealthScore).toBe(85);
  });

  it('handles errors correctly', async () => {
    const mockError = new Error('Database error');
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: mockError,
    } as any);

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useSquadCoachReport('workspace-1', { onError })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('computes analytics correctly', async () => {
    const mockData = [
      {
        user_id: '1',
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'Sales Rep',
        health_score: 80,
        focus_area: 'balanced',
        coaching_priority: 4,
        conversion_rate_percent: 15,
        reply_rate_percent: 25,
        contacts_contacted: 100,
        contacts_signed: 15,
        overdue_followups: 2,
        high_priority_open_followups: 5,
        avg_days_to_reply: 1.5,
      },
      {
        user_id: '2',
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Sales Rep',
        health_score: 60,
        focus_area: 'timing_help',
        coaching_priority: 2,
        conversion_rate_percent: 10,
        reply_rate_percent: 15,
        contacts_contacted: 80,
        contacts_signed: 8,
        overdue_followups: 8,
        high_priority_open_followups: 12,
        avg_days_to_reply: 3.5,
      },
    ];

    mockSupabase.rpc.mockResolvedValue({
      data: mockData,
      error: null,
    } as any);

    const { result } = renderHook(() => useSquadCoachReport('workspace-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics.totalReps).toBe(2);
    expect(result.current.analytics.needsCoaching).toBe(1); // priority <= 3
    expect(result.current.analytics.avgHealthScore).toBe(70); // (80+60)/2
    expect(result.current.analytics.focusAreaDistribution).toEqual({
      balanced: 1,
      timing_help: 1,
    });
  });

  it('identifies top and bottom performers', async () => {
    const mockData = [
      {
        user_id: '1',
        full_name: 'Top Performer',
        email: 'top@example.com',
        role: 'Sales Rep',
        health_score: 95,
        focus_area: 'balanced',
        coaching_priority: 5,
        conversion_rate_percent: 20,
        reply_rate_percent: 30,
        contacts_contacted: 120,
        contacts_signed: 24,
        overdue_followups: 0,
        high_priority_open_followups: 3,
        avg_days_to_reply: 1.0,
      },
      {
        user_id: '2',
        full_name: 'Bottom Performer',
        email: 'bottom@example.com',
        role: 'Sales Rep',
        health_score: 40,
        focus_area: 'timing_help',
        coaching_priority: 1,
        conversion_rate_percent: 5,
        reply_rate_percent: 10,
        contacts_contacted: 50,
        contacts_signed: 2,
        overdue_followups: 15,
        high_priority_open_followups: 20,
        avg_days_to_reply: 5.0,
      },
    ];

    mockSupabase.rpc.mockResolvedValue({
      data: mockData,
      error: null,
    } as any);

    const { result } = renderHook(() => useSquadCoachReport('workspace-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.analytics.topPerformer?.full_name).toBe('Top Performer');
    expect(result.current.analytics.bottomPerformer?.full_name).toBe('Bottom Performer');
  });

  it('handles empty workspace ID', async () => {
    const { result } = renderHook(() => useSquadCoachReport(''));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Workspace ID is required');
    });
  });
});

