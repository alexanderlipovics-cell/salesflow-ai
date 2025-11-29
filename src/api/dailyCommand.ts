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

type MockLead = {
  name: string;
  action: string;
  company?: string;
  status?: string;
  email?: string;
  dealValue?: number;
};

const mockDailyCommand = {
  message: "Heute: 5 Follow-ups, 2 Demos geplant",
  leads: [
    { name: "Max Müller", action: "Follow-up senden" },
    { name: "Anna Schmidt", action: "Demo bestätigen" },
  ],
} satisfies { message: string; leads: MockLead[] };

const SHOULD_USE_MOCK =
  (import.meta.env.VITE_USE_MOCK_DAILY_COMMAND ?? "true") !== "false";

const DAILY_COMMAND_ENDPOINT = "/api/leads/daily-command";

export async function fetchDailyCommand(
  horizonDays: number = 3,
  limit: number = 20
): Promise<DailyCommandItem[]> {
  if (SHOULD_USE_MOCK) {
    return buildMockDailyCommandItems({ horizonDays, limit });
  }

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

function buildMockDailyCommandItems({
  horizonDays,
  limit,
}: {
  horizonDays: number;
  limit: number;
}): DailyCommandItem[] {
  const baseDate = new Date();
  baseDate.setHours(10, 0, 0, 0);

  return mockDailyCommand.leads.slice(0, limit).map((lead, index) => {
    const dueDate = new Date(baseDate);
    dueDate.setDate(baseDate.getDate() + Math.min(index, Math.max(horizonDays - 1, 0)));

    return {
      id: `${index + 1}`,
      name: lead.name,
      email: lead.email ?? null,
      company: lead.company ?? "Direktkontakt",
      status: lead.status ?? "neu",
      next_action: lead.action,
      next_action_at: dueDate.toISOString(),
      deal_value: lead.dealValue ?? null,
      needs_action: true,
    };
  });
}
