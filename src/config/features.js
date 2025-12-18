export const VERTICALS = {
  network_marketing: {
    name: "Network Marketing",
    features: [
      "dashboard",
      "chat",
      "leads",
      "hunter_board",
      "sequences",
      "objections",
      "finance",
      "power_hour",
      "proposals",
      // MLM-spezifisch:
      "network_dashboard",
      "team_dashboard",
      "rank_tracker",
      "compensation_calc",
      "genealogy_tree",
      "team_duplicator",
    ],
  },
  b2b_sales: {
    name: "B2B Sales",
    features: [
      "dashboard",
      "chat",
      "leads",
      "hunter_board",
      "sequences",
      "objections",
      "finance",
      "proposals",
      // B2B-spezifisch:
      "pipeline_view",
      "forecasting",
    ],
  },
  general: {
    name: "Sales Professional",
    features: [
      "dashboard",
      "chat",
      "leads",
      "hunter_board",
      "sequences",
      "objections",
      "finance",
      "proposals",
    ],
  },
};

export const PLANS = {
  free: {
    max_leads: 50,
    features: ["dashboard", "chat", "leads"],
    ai_requests_per_day: 10,
  },
  starter: {
    max_leads: 500,
    features: ["dashboard", "chat", "leads", "hunter_board", "objections"],
    ai_requests_per_day: 100,
  },
  pro: {
    max_leads: -1, // unlimited
    features: "all",
    ai_requests_per_day: -1,
  },
  business: {
    max_leads: -1,
    features: "all",
    ai_requests_per_day: -1,
    team_members: 10,
  },
};

