// ============================================================================
// FILE: src/components/squad-coach/TimeRangeSelector.tsx
// DESCRIPTION: Time range selector for Squad Coach analytics
// ============================================================================

import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
  className?: string;
}

const TIME_RANGES = [
  { value: 7, label: 'Letzte 7 Tage' },
  { value: 14, label: 'Letzte 14 Tage' },
  { value: 30, label: 'Letzte 30 Tage' },
  { value: 60, label: 'Letzte 60 Tage' },
  { value: 90, label: 'Letzte 90 Tage' },
];

export const TimeRangeSelector = React.memo<TimeRangeSelectorProps>(
  ({ value, onChange, className }) => {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Calendar className="h-4 w-4 text-sf-text-muted" aria-hidden="true" />
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sf-select bg-sf-surface border border-sf-border rounded-lg px-3 py-2 text-sm text-sf-text focus:outline-none focus:ring-2 focus:ring-sf-primary"
        >
          {TIME_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

TimeRangeSelector.displayName = 'TimeRangeSelector';

