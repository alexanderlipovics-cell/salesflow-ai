/**
 * Herbalife Ranks & Career Titles
 * Complete compensation plan data for Herbalife MLM
 */

export interface HerbalifeRank {
  id: string;
  name: string;
  nameDE: string;
  order: number;
  icon: string;
  requirements: {
    volumePoints?: number;
    consecutiveMonths?: number;
    royaltyPoints?: number;
    orgVolume?: number;
  };
  benefits: {
    retailProfit?: number;
    wholesaleCommission?: number;
    royaltyOverrides?: number;
    productionBonus?: number;
  };
}

export const HERBALIFE_RANKS: HerbalifeRank[] = [
  {
    id: "distributor",
    name: "Distributor",
    nameDE: "Berater",
    order: 1,
    icon: "🌱",
    requirements: { volumePoints: 0 },
    benefits: { retailProfit: 25, wholesaleCommission: 0, royaltyOverrides: 0 }
  },
  {
    id: "senior_consultant",
    name: "Senior Consultant",
    nameDE: "Senior Berater",
    order: 2,
    icon: "🌿",
    requirements: { volumePoints: 500 },
    benefits: { retailProfit: 35, wholesaleCommission: 10, royaltyOverrides: 0 }
  },
  {
    id: "success_builder",
    name: "Success Builder",
    nameDE: "Success Builder",
    order: 3,
    icon: "🚀",
    requirements: { volumePoints: 1000 },
    benefits: { retailProfit: 42, wholesaleCommission: 17, royaltyOverrides: 0 }
  },
  {
    id: "qualified_producer",
    name: "Qualified Producer",
    nameDE: "Qualifizierter Producer",
    order: 4,
    icon: "🎖️",
    requirements: { volumePoints: 2500 },
    benefits: { retailProfit: 42, wholesaleCommission: 17, royaltyOverrides: 0 }
  },
  {
    id: "supervisor",
    name: "Supervisor",
    nameDE: "Supervisor",
    order: 5,
    icon: "🏆",
    requirements: { volumePoints: 4000 },
    benefits: { retailProfit: 50, wholesaleCommission: 25, royaltyOverrides: 5 }
  },
  {
    id: "world_team",
    name: "World Team",
    nameDE: "World Team",
    order: 6,
    icon: "🌍",
    requirements: { volumePoints: 2500, consecutiveMonths: 4 },
    benefits: { retailProfit: 50, wholesaleCommission: 25, royaltyOverrides: 5 }
  },
  {
    id: "get_team",
    name: "Global Expansion Team",
    nameDE: "GET Team",
    order: 7,
    icon: "💎",
    requirements: { royaltyPoints: 1000, orgVolume: 20000 },
    benefits: { retailProfit: 50, royaltyOverrides: 5, productionBonus: 2 }
  },
  {
    id: "millionaire_team",
    name: "Millionaire Team",
    nameDE: "Millionaire Team",
    order: 8,
    icon: "💎💎",
    requirements: { royaltyPoints: 4000, orgVolume: 80000 },
    benefits: { retailProfit: 50, royaltyOverrides: 5, productionBonus: 4 }
  },
  {
    id: "presidents_team",
    name: "President's Team",
    nameDE: "President's Team",
    order: 9,
    icon: "👑",
    requirements: { royaltyPoints: 10000, orgVolume: 200000 },
    benefits: { retailProfit: 50, royaltyOverrides: 5, productionBonus: 7 }
  }
];

export default HERBALIFE_RANKS;

