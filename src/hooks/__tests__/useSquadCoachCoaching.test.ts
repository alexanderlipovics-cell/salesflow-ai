// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react';
import { useSquadCoachCoaching } from '../useSquadCoachCoaching';
import * as coachingApi from '@/services/coachingApi';

jest.mock('@/services/coachingApi');

describe('useSquadCoachCoaching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lädt Coaching Daten erfolgreich', async () => {
    const mockReport = [
      {
        user_id: 'user-1',
        email: 'rep@example.com',
        full_name: 'Rep One',
        role: 'rep',
        leads_created: 10,
        contacts_contacted: 20,
        contacts_signed: 3,
        first_messages: 15,
        reply_events: 9,
        reply_rate_percent: 45,
        conversion_rate_percent: 15,
        overdue_followups: 2,
        high_priority_open_followups: 1,
        avg_priority_score: 72,
        focus_area: 'balanced',
      },
    ];

    const mockCoaching = {
      timeframe_days: 30,
      language: 'de',
      team_summary: {
        headline: 'Team Fokus',
        description: 'Performance Hinweise',
        suggested_team_actions: ['Daily Command stärken'],
      },
      reps: [
        {
          user_id: 'user-1',
          display_name: 'Rep One',
          focus_area: 'balanced',
          diagnosis: 'Gute Basisleistung',
          suggested_actions: ['Mehr Erstkontakte'],
          script_ideas: ['Nutze Hook XYZ'],
        },
      ],
    };

    (coachingApi.fetchSquadCoachReport as jest.Mock).mockResolvedValue(mockReport);
    (coachingApi.fetchFollowupsScored as jest.Mock).mockResolvedValue([]);
    (coachingApi.buildCoachingInput as jest.Mock).mockReturnValue({});
    (coachingApi.requestCoachingFromChief as jest.Mock).mockResolvedValue(mockCoaching);

    const { result } = renderHook(() =>
      useSquadCoachCoaching({ workspaceId: 'workspace-1', refreshInterval: 1000 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.report).toEqual(mockReport);
    expect(result.current.coaching).toEqual(mockCoaching);
    expect(result.current.error).toBeNull();
  });

  it('meldet Fehler weiter', async () => {
    (coachingApi.fetchSquadCoachReport as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useSquadCoachCoaching({ workspaceId: 'workspace-err', onError })
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(onError).toHaveBeenCalled();
  });
});

