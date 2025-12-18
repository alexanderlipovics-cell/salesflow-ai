/**
 * Zinzino Ranks & Career Titles
 * Complete compensation plan data for Zinzino MLM
 */

export interface ZinzinoRank {
  id: string;
  name: string;
  nameDE: string;
  icon: string;
  order: number;
  type: 'customer' | 'partner' | 'starter';
  requirements?: {
    customer_points?: number;
    pcv?: number;
    mcv?: number;
    pcp?: number;
  };
  benefits?: {
    cash_bonus?: string;
    monthly_bonus?: string;
    team_provision?: string;
    extras?: string[];
  };
}

// CUSTOMER CAREER TITLES (Kunden-Karriere)
export const CUSTOMER_CAREER_TITLES: ZinzinoRank[] = [
  {
    id: 'q-team',
    name: 'Q-Team',
    nameDE: 'Q-Team',
    icon: '🥉',
    order: 1,
    type: 'customer',
    requirements: {
      customer_points: 4,
      pcv: 20,
    },
    benefits: {
      cash_bonus: '10%',
      monthly_bonus: 'Zinzino4Free',
    },
  },
  {
    id: 'x-team',
    name: 'X-Team',
    nameDE: 'X-Team',
    icon: '🥈',
    order: 2,
    type: 'customer',
    requirements: {
      customer_points: 10,
      pcv: 50,
    },
    benefits: {
      cash_bonus: '10%',
      monthly_bonus: '50 Z-Rewards',
    },
  },
  {
    id: 'a-team',
    name: 'A-Team',
    nameDE: 'A-Team',
    icon: '🥇',
    order: 3,
    type: 'customer',
    requirements: {
      customer_points: 25,
      pcv: 125,
    },
    benefits: {
      cash_bonus: '20%',
      monthly_bonus: '100 PP',
    },
  },
  {
    id: 'pro-team',
    name: 'Pro-Team',
    nameDE: 'Pro-Team',
    icon: '💎',
    order: 4,
    type: 'customer',
    requirements: {
      customer_points: 50,
      pcv: 250,
    },
    benefits: {
      cash_bonus: '25%',
      monthly_bonus: '200 PP',
    },
  },
  {
    id: 'top-team',
    name: 'Top-Team',
    nameDE: 'Top-Team',
    icon: '👑',
    order: 5,
    type: 'customer',
    requirements: {
      customer_points: 100,
      pcv: 500,
    },
    benefits: {
      cash_bonus: '30%',
      monthly_bonus: '400 PP',
    },
  },
  {
    id: 'top-team-200',
    name: 'Top-Team 200',
    nameDE: 'Top-Team 200',
    icon: '🌟',
    order: 6,
    type: 'customer',
    requirements: {
      customer_points: 200,
      pcv: 1000,
    },
    benefits: {
      cash_bonus: '30%',
      monthly_bonus: '1000 PP',
    },
  },
];

// PARTNER CAREER TITLES (Partner-Karriere)
export const PARTNER_CAREER_TITLES: ZinzinoRank[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    nameDE: 'Bronze',
    icon: '🥉',
    order: 7,
    type: 'partner',
    requirements: {
      mcv: 375,
      pcp: 4,
      pcv: 20,
    },
    benefits: {
      team_provision: '10%',
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    nameDE: 'Silber',
    icon: '🥈',
    order: 8,
    type: 'partner',
    requirements: {
      mcv: 750,
      pcp: 4,
      pcv: 20,
    },
    benefits: {
      team_provision: '10%',
      extras: ['100 PP Bonus'],
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    nameDE: 'Gold',
    icon: '🥇',
    order: 9,
    type: 'partner',
    requirements: {
      mcv: 1500,
      pcp: 4,
      pcv: 20,
    },
    benefits: {
      team_provision: '10%',
      extras: ['200 PP Bonus'],
    },
  },
  {
    id: 'executive',
    name: 'Executive',
    nameDE: 'Executive',
    icon: '💼',
    order: 10,
    type: 'partner',
    requirements: {
      mcv: 3000,
      pcp: 10,
      pcv: 50,
    },
    benefits: {
      team_provision: '15%',
      extras: ['Z-Phone'],
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    nameDE: 'Platin',
    icon: '💎',
    order: 11,
    type: 'partner',
    requirements: {
      mcv: 6000,
      pcp: 10,
      pcv: 50,
    },
    benefits: {
      team_provision: '15%',
      extras: ['2% Volume'],
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    nameDE: 'Diamant',
    icon: '💠',
    order: 12,
    type: 'partner',
    requirements: {
      mcv: 12000,
      pcp: 10,
      pcv: 50,
    },
    benefits: {
      team_provision: '15%',
      extras: ['Z-Car', '3% Volume'],
    },
  },
  {
    id: 'crown',
    name: 'Crown',
    nameDE: 'Krone',
    icon: '👑',
    order: 13,
    type: 'partner',
    requirements: {
      mcv: 25000,
      pcp: 10,
      pcv: 50,
    },
    benefits: {
      team_provision: '15%',
      extras: ['4% Volume'],
    },
  },
  {
    id: 'royal-crown',
    name: 'Royal Crown',
    nameDE: 'Königskrone',
    icon: '👑👑',
    order: 14,
    type: 'partner',
    requirements: {
      mcv: 50000,
      pcp: 10,
      pcv: 50,
    },
    benefits: {
      team_provision: '15%',
      extras: ['1% Bonus Pool'],
    },
  },
  {
    id: 'black-crown',
    name: 'Black Crown',
    nameDE: 'Schwarze Krone',
    icon: '⚫👑',
    order: 15,
    type: 'partner',
    requirements: {
      mcv: 100000,
      pcp: 10,
      pcv: 50,
    },
    benefits: {
      team_provision: '15%',
      extras: ['2% Bonus Pool'],
    },
  },
];

// ALL RANKS (for display)
export const ZINZINO_ALL_RANKS: ZinzinoRank[] = [
  {
    id: 'partner',
    name: 'Partner',
    nameDE: 'Partner',
    icon: '👤',
    order: 0,
    type: 'starter',
  },
  ...CUSTOMER_CAREER_TITLES,
  ...PARTNER_CAREER_TITLES,
];

// FAST START PLAN
export interface FastStartMilestone {
  days: number;
  premier_customers: number;
  pay_points: number;
}

export const FAST_START_MILESTONES: FastStartMilestone[] = [
  { days: 30, premier_customers: 2, pay_points: 50 },
  { days: 60, premier_customers: 4, pay_points: 100 },
  { days: 90, premier_customers: 8, pay_points: 200 },
  { days: 120, premier_customers: 12, pay_points: 300 },
];

// CAB BONUS TIERS
export interface CABTier {
  tier: string;
  left_credits: number;
  right_credits: number;
  pay_points: number;
}

export const CAB_TIERS: CABTier[] = [
  { tier: 'S', left_credits: 150, right_credits: 150, pay_points: 100 },
  { tier: 'M', left_credits: 500, right_credits: 500, pay_points: 200 },
  { tier: 'L', left_credits: 1500, right_credits: 1500, pay_points: 300 },
  { tier: 'XL', left_credits: 7500, right_credits: 7500, pay_points: 400 },
  { tier: 'XXL', left_credits: 15000, right_credits: 15000, pay_points: 500 },
];

