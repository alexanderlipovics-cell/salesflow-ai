export type DailyCommandItem = {
  id: string | number;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  status?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  deal_value?: number | null;
  needs_action: boolean;
};

export type DailyCommandResponse = {
  items: DailyCommandItem[];
};

const DAILY_COMMAND_ENDPOINT = "/api/leads/daily-command";

export async function fetchDailyCommand(
  horizonDays: number = 3,
  limit: number = 20
): Promise<DailyCommandItem[]> {
  const params = new URLSearchParams({
    horizon_days: String(horizonDays),
    limit: String(limit),
  });

  const response = await fetch(`${DAILY_COMMAND_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Daily Command request failed (${response.status}): ${
        errorText || response.statusText
      }`
    );
  }

  const data: DailyCommandResponse = await response.json();
  if (!data?.items) {
    return [];
  }

  return data.items;
}
