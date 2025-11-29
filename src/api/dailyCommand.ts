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

const DAYS_TO_MS = 86_400_000;
const MOCK_DELAY_MS = 420;

const formatFutureDate = (daysFromNow: number, hours: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const DAILY_COMMAND_MOCK: DailyCommandItem[] = [
  {
    id: "dc-hera",
    name: "Lena Hartmann",
    email: "lena@nexonic.ai",
    company: "Nexonic GmbH",
    status: "hot",
    next_action: "Executive Recap finalisieren",
    next_action_at: formatFutureDate(0, 10),
    deal_value: 54000,
    needs_action: true,
  },
  {
    id: "dc-helix",
    name: "Marco Di Luca",
    email: "marco@helixcloud.eu",
    company: "Helix Cloud",
    status: "warm",
    next_action: "Security Review terminieren",
    next_action_at: formatFutureDate(1, 9),
    deal_value: 32000,
    needs_action: true,
  },
  {
    id: "dc-aster",
    name: "Sara Nguyen",
    email: "sara@astermobility.io",
    company: "Aster Mobility",
    status: "customer",
    next_action: "Renewal Pricing verschicken",
    next_action_at: formatFutureDate(2, 11),
    deal_value: 86000,
    needs_action: false,
  },
  {
    id: "dc-omni",
    name: "Tom Richter",
    email: "tom@omnibuild.de",
    company: "OmniBuild",
    status: "cold",
    next_action: "Speed-Hunter Batch vorbereiten",
    next_action_at: null,
    deal_value: 27000,
    needs_action: true,
  },
  {
    id: "dc-volt",
    name: "Elisa Vogt",
    email: "elisa@voltra.io",
    company: "Voltra Labs",
    status: "warm",
    next_action: "Pilot KPIs einsammeln",
    next_action_at: formatFutureDate(3, 14),
    deal_value: 41000,
    needs_action: true,
  },
  {
    id: "dc-zen",
    name: "Jan Novak",
    email: "jan@zenloop.cz",
    company: "Zenloop Analytics",
    status: "neu",
    next_action: "Intro Call bestätigen",
    next_action_at: formatFutureDate(4, 16),
    deal_value: null,
    needs_action: true,
  },
];

const withinHorizon = (item: DailyCommandItem, horizonEnd: number) => {
  if (!item.next_action_at) {
    return item.needs_action;
  }
  const due = Date.parse(item.next_action_at);
  if (Number.isNaN(due)) {
    return true;
  }
  return due <= horizonEnd;
};

const sortByDueDate = (a: DailyCommandItem, b: DailyCommandItem) => {
  const aTime = Date.parse(a.next_action_at ?? "") || Number.MAX_SAFE_INTEGER;
  const bTime = Date.parse(b.next_action_at ?? "") || Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
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
  const horizonEnd = Date.now() + horizonDays * DAYS_TO_MS;
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

  const curatedList = DAILY_COMMAND_MOCK.filter((item) =>
    withinHorizon(item, horizonEnd)
  )
    .sort(sortByDueDate)
    .slice(0, limit);

  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  return curatedList;
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
