export interface ZinzinoRank {
  id: number;
  name: string;
  icon: string;
  color: string;
  requirements: {
    pcp?: number; // Personal Customer Points
    personal_credits?: number;
    balanced_credits?: number;
    balanced_customer_points?: number;
  };
}

export const ZINZINO_RANKS: ZinzinoRank[] = [
  { id: 0, name: "Partner", icon: "👤", color: "#6B7280", requirements: {} },
  { id: 1, name: "Q-Team", icon: "🌱", color: "#10B981", requirements: { pcp: 4, personal_credits: 20 } },
  { id: 2, name: "X-Team", icon: "⚡", color: "#3B82F6", requirements: { pcp: 10, personal_credits: 50 } },
  { id: 3, name: "Bronze", icon: "🥉", color: "#CD7F32", requirements: { pcp: 4, personal_credits: 20 } },
  { id: 4, name: "Silver", icon: "🥈", color: "#C0C0C0", requirements: { balanced_credits: 750 } },
  { id: 5, name: "Gold", icon: "🥇", color: "#FFD700", requirements: { balanced_credits: 1500 } },
  { id: 6, name: "Executive", icon: "💼", color: "#8B5CF6", requirements: { balanced_credits: 3000 } },
  { id: 7, name: "Platinum", icon: "💎", color: "#E5E4E2", requirements: { balanced_credits: 6000 } },
  { id: 8, name: "Diamond", icon: "💠", color: "#B9F2FF", requirements: { balanced_credits: 12000 } },
  { id: 9, name: "Director", icon: "🎯", color: "#EC4899", requirements: { balanced_customer_points: 1500 } },
  { id: 10, name: "Crown", icon: "👑", color: "#F59E0B", requirements: { balanced_customer_points: 3000 } },
  { id: 11, name: "Royal Crown", icon: "👑✨", color: "#EF4444", requirements: { balanced_customer_points: 5000 } },
  { id: 12, name: "Black Crown", icon: "🖤👑", color: "#1F2937", requirements: { balanced_customer_points: 7500 } },
  { id: 13, name: "Ambassador", icon: "🌟", color: "#6366F1", requirements: { balanced_customer_points: 10000 } },
  { id: 14, name: "Royal Ambassador", icon: "🌟✨", color: "#7C3AED", requirements: { balanced_customer_points: 12500 } },
  { id: 15, name: "Black Ambassador", icon: "🖤🌟", color: "#111827", requirements: { balanced_customer_points: 15000 } },
  { id: 16, name: "President", icon: "🏆", color: "#000000", requirements: { balanced_customer_points: 20000 } },
];

export const ZINZINO_KPIS = {
  pcp: { label: "PCP", description: "Personal Customer Points", target: 10 },
  active_credits: { label: "Credits", description: "Persönliches Bestellvolumen", target: 50 },
  balanced_credits: { label: "Team Credits", description: "Balanced Credits im Team", target: null },
  balance_ratio: { label: "Balance", description: "Links/Rechts Verhältnis", target: "1:1" },
  z4f_progress: { label: "Z4F", description: "Zinzino For Free Status", target: 4 },
  pipeline: { label: "Pipeline", description: "Kontakte in Präsentation", target: 5 },
};

export const ZINZINO_BONUSES = {
  cash_bonus: {
    base: 0.10, // 10% Basis
    a_team: 0.20, // 25 Kunden
    pro_team: 0.25, // 50 Kunden
    top_team: 0.30, // 100 Kunden
  },
  team_commission: {
    min: 0.075, // 7.5%
    max: 0.15, // 15%
  },
};

