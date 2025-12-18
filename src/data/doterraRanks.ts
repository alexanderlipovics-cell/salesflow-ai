/**
 * doTERRA Ranks & Career Titles
 * Complete compensation plan data for doTERRA MLM
 */

export interface DoterraRank {
  id: string;
  name: string;
  nameDE: string;
  order: number;
  icon: string;
  requirements: {
    pv?: number;  // Personal Volume
    ov?: number;  // Organization Volume
    executiveLegs?: number;
    eliteLegs?: number;
    premierLegs?: number;
    silverLegs?: number;
    goldLegs?: number;
    platinumLegs?: number;
  };
  benefits: {
    retailProfit?: number;
    unilevelDepth?: number;
    empowermentBonus?: boolean;
    leadershipPool?: number;
    diamondPool?: number;
  };
}

export const DOTERRA_RANKS: DoterraRank[] = [
  {
    id: "wellness_advocate",
    name: "Wellness Advocate",
    nameDE: "Wellness-Botschafter",
    order: 1,
    icon: "🌿",
    requirements: { pv: 50 },
    benefits: { retailProfit: 25 }
  },
  {
    id: "manager",
    name: "Manager",
    nameDE: "Manager",
    order: 2,
    icon: "📊",
    requirements: { pv: 100, ov: 500 },
    benefits: { unilevelDepth: 2 }
  },
  {
    id: "director",
    name: "Director",
    nameDE: "Direktor",
    order: 3,
    icon: "📈",
    requirements: { pv: 100, ov: 1000 },
    benefits: { unilevelDepth: 3 }
  },
  {
    id: "executive",
    name: "Executive",
    nameDE: "Executive",
    order: 4,
    icon: "💼",
    requirements: { pv: 100, ov: 2000 },
    benefits: { unilevelDepth: 4 }
  },
  {
    id: "elite",
    name: "Elite",
    nameDE: "Elite",
    order: 5,
    icon: "🌟",
    requirements: { pv: 100, ov: 3000 },
    benefits: { unilevelDepth: 5 }
  },
  {
    id: "premier",
    name: "Premier",
    nameDE: "Premier",
    order: 6,
    icon: "🏆",
    requirements: { pv: 100, ov: 5000, executiveLegs: 2 },
    benefits: { unilevelDepth: 6, empowermentBonus: true }
  },
  {
    id: "silver",
    name: "Silver",
    nameDE: "Silver",
    order: 7,
    icon: "🥈",
    requirements: { pv: 100, eliteLegs: 3 },
    benefits: { unilevelDepth: 7, leadershipPool: 1 }
  },
  {
    id: "gold",
    name: "Gold",
    nameDE: "Gold",
    order: 8,
    icon: "🥇",
    requirements: { pv: 100, premierLegs: 3 },
    benefits: { unilevelDepth: 7, leadershipPool: 5 }
  },
  {
    id: "platinum",
    name: "Platinum",
    nameDE: "Platinum",
    order: 9,
    icon: "💎",
    requirements: { pv: 100, silverLegs: 3 },
    benefits: { unilevelDepth: 7, leadershipPool: 10 }
  },
  {
    id: "diamond",
    name: "Diamond",
    nameDE: "Diamond",
    order: 10,
    icon: "💎💎",
    requirements: { pv: 100, silverLegs: 4 },
    benefits: { unilevelDepth: 7, diamondPool: 1 }
  },
  {
    id: "blue_diamond",
    name: "Blue Diamond",
    nameDE: "Blue Diamond",
    order: 11,
    icon: "💙",
    requirements: { pv: 100, goldLegs: 5 },
    benefits: { unilevelDepth: 7, diamondPool: 2 }
  },
  {
    id: "presidential_diamond",
    name: "Presidential Diamond",
    nameDE: "Presidential Diamond",
    order: 12,
    icon: "👑",
    requirements: { pv: 100, platinumLegs: 6 },
    benefits: { unilevelDepth: 7, diamondPool: 3 }
  }
];

export default DOTERRA_RANKS;

