// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react';
import { useTodayOverview } from '../useDashboardData';
import { supabaseClient } from '@/lib/supabaseClient';

jest.mock('@/lib/supabaseClient', () => ({
  supabaseClient: {
    rpc: jest.fn(),
  },
}));

describe('useTodayOverview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lädt Today Overview Daten', async () => {
    const mockPayload = [
      {
        tasks_due_today: 4,
        tasks_done_today: 2,
        leads_created_today: 5,
        first_messages_today: 3,
        signups_today: 1,
        revenue_today: 2500,
      },
    ];

    supabaseClient.rpc.mockResolvedValue({ data: mockPayload, error: null });

    const { result } = renderHook(() => useTodayOverview('workspace-demo'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPayload[0]);
  });

  it('liefert Fehler korrekt zurück', async () => {
    supabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'db error', code: '400' },
    });

    const { result } = renderHook(() => useTodayOverview('workspace-demo'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('db error');
  });
});

