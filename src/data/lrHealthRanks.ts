/**
 * LR Health & Beauty Ranks & Career Titles
 * Complete compensation plan data for LR Health & Beauty MLM
 */

export interface LRRank {
  id: string;
  name: string;
  nameDE: string;
  order: number;
  icon: string;
  requirements: {
    pw?: number;  // Partner-Wert (Partner Value)
    totalPW?: number;
    ownPW?: number;
    activeLines?: number;
    twentyOnePercentLines?: number;
  };
  benefits: {
    retailMargin?: number;
    bonus?: number;
    fastTrack?: number;
    carSubsidy?: boolean;
    specialBonus?: number;
    depthBonus?: boolean;
    topCar?: boolean;
  };
}

export const LR_RANKS: LRRank[] = [
  {
    id: "partner",
    name: "Partner",
    nameDE: "Partner",
    order: 1,
    icon: "🌱",
    requirements: { pw: 0 },
    benefits: { retailMargin: 30 }
  },
  {
    id: "junior_manager",
    name: "Junior Manager",
    nameDE: "Junior Manager",
    order: 2,
    icon: "🚗",
    requirements: { totalPW: 4000, ownPW: 100, activeLines: 2 },
    benefits: { bonus: 14, fastTrack: 250 }
  },
  {
    id: "manager",
    name: "Manager",
    nameDE: "Manager",
    order: 3,
    icon: "📊",
    requirements: { totalPW: 8000, ownPW: 100, activeLines: 2 },
    benefits: { bonus: 16, fastTrack: 500 }
  },
  {
    id: "junior_team_leader",
    name: "Junior Team Leader",
    nameDE: "Junior Teamleiter",
    order: 4,
    icon: "🎯",
    requirements: { totalPW: 12000, ownPW: 100, activeLines: 3 },
    benefits: { bonus: 21, fastTrack: 1000, carSubsidy: true }
  },
  {
    id: "team_leader",
    name: "Team Leader",
    nameDE: "Teamleiter",
    order: 5,
    icon: "🏆",
    requirements: { totalPW: 16000, ownPW: 100, activeLines: 4 },
    benefits: { bonus: 21, fastTrack: 1250 }
  },
  {
    id: "org_leader_bronze",
    name: "Org Leader Bronze",
    nameDE: "Orgaleiter Bronze",
    order: 6,
    icon: "🥉",
    requirements: { twentyOnePercentLines: 2 },
    benefits: { specialBonus: 7, depthBonus: true }
  },
  {
    id: "org_leader_silver",
    name: "Org Leader Silver",
    nameDE: "Orgaleiter Silber",
    order: 7,
    icon: "🥈",
    requirements: { twentyOnePercentLines: 4 },
    benefits: { specialBonus: 8, depthBonus: true }
  },
  {
    id: "org_leader_gold",
    name: "Org Leader Gold",
    nameDE: "Orgaleiter Gold",
    order: 8,
    icon: "🥇",
    requirements: { twentyOnePercentLines: 6 },
    benefits: { specialBonus: 9, topCar: true }
  },
  {
    id: "org_leader_platinum",
    name: "Org Leader Platinum",
    nameDE: "Orgaleiter Platin",
    order: 9,
    icon: "💎",
    requirements: { twentyOnePercentLines: 10 },
    benefits: { specialBonus: 10, topCar: true }
  }
];

export default LR_RANKS;

