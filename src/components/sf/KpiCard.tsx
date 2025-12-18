// ============================================================================
// FILE: src/components/sf/KpiCard.tsx
// DESCRIPTION: KPI card component (wrapper around SFKpiCard)
// ============================================================================

import React from 'react';
import { SFKpiCard } from './SFKpiCard';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  isLoading?: boolean;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = (props) => {
  return <SFKpiCard {...props} />;
};

