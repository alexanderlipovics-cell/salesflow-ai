/**
 * PM-International Ranks & Career Titles
 * Complete compensation plan data for PM-International MLM
 */

export interface PMRank {
  id: string;
  name: string;
  nameDE: string;
  order: number;
  icon: string;
  requirements: {
    points?: number;
    checkAssurance?: number;
    activeLegs?: number;
  };
  benefits: {
    retailMargin?: number;
    levelBonus?: number;
    carBonus?: number;
    travelIncentive?: boolean;
    pensionPlan?: boolean;
  };
}

export const PM_RANKS: PMRank[] = [
  {
    id: "team_partner",
    name: "Team Partner",
    nameDE: "Teampartner",
    order: 1,
    icon: "🌱",
    requirements: { points: 0 },
    benefits: { retailMargin: 20 }
  },
  {
    id: "manager",
    name: "Manager",
    nameDE: "Manager",
    order: 2,
    icon: "📊",
    requirements: { points: 1500, checkAssurance: 600 },
    benefits: { retailMargin: 30 }
  },
  {
    id: "sales_manager",
    name: "Sales Manager",
    nameDE: "Vertriebsmanager",
    order: 3,
    icon: "📈",
    requirements: { points: 2500, activeLegs: 1 },
    benefits: { levelBonus: 4 }
  },
  {
    id: "marketing_manager",
    name: "Marketing Manager",
    nameDE: "Marketing Manager",
    order: 4,
    icon: "🎯",
    requirements: { points: 5000, activeLegs: 2 },
    benefits: { levelBonus: 5 }
  },
  {
    id: "imm",
    name: "International Marketing Manager",
    nameDE: "IMM",
    order: 5,
    icon: "🚗",
    requirements: { points: 10000, activeLegs: 3 },
    benefits: { carBonus: 111, travelIncentive: true }
  },
  {
    id: "vp",
    name: "Vice President",
    nameDE: "Vize-Präsident",
    order: 6,
    icon: "🏛️",
    requirements: { points: 25000, activeLegs: 3 },
    benefits: { carBonus: 222 }
  },
  {
    id: "evp",
    name: "Executive Vice President",
    nameDE: "EVP",
    order: 7,
    icon: "🌟",
    requirements: { points: 50000, activeLegs: 3 },
    benefits: { carBonus: 333 }
  },
  {
    id: "presidents_team",
    name: "President's Team",
    nameDE: "Präsident",
    order: 8,
    icon: "🦅",
    requirements: { points: 100000, activeLegs: 5 },
    benefits: { carBonus: 500, pensionPlan: true }
  },
  {
    id: "silver_president",
    name: "Silver President",
    nameDE: "Silber Präsident",
    order: 9,
    icon: "🥈",
    requirements: { points: 200000, activeLegs: 3 },
    benefits: { carBonus: 650 }
  },
  {
    id: "gold_president",
    name: "Gold President",
    nameDE: "Gold Präsident",
    order: 10,
    icon: "🥇",
    requirements: { points: 400000, activeLegs: 3 },
    benefits: { carBonus: 1000 }
  },
  {
    id: "platinum_president",
    name: "Platinum President",
    nameDE: "Platin Präsident",
    order: 11,
    icon: "💎",
    requirements: { points: 600000, activeLegs: 4 },
    benefits: { carBonus: 2000 }
  },
  {
    id: "champion_league",
    name: "Champion's League",
    nameDE: "Champion's League",
    order: 12,
    icon: "👑",
    requirements: { points: 1000000, activeLegs: 5 },
    benefits: { carBonus: 3000 }
  }
];

export default PM_RANKS;

