/**
 * SALES FLOW AI - DISTANCE BADGE COMPONENT
 * 
 * Visual indicator for distance to leads
 * Version: 2.0.0
 */

import React from 'react';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistance, getDistanceColorClass } from '@/lib/utils/geolocation';

interface DistanceBadgeProps {
  distanceKm: number;
  showIcon?: boolean;
  className?: string;
}

export const DistanceBadge = React.memo<DistanceBadgeProps>(
  ({ distanceKm, showIcon = true, className }) => {
    const colorClass = getDistanceColorClass(distanceKm);

    return (
      <Badge
        variant="secondary"
        className={cn(
          'border font-medium text-xs',
          colorClass,
          className
        )}
        title={`Entfernung: ${formatDistance(distanceKm)}`}
      >
        {showIcon && <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />}
        {formatDistance(distanceKm)}
      </Badge>
    );
  }
);

DistanceBadge.displayName = 'DistanceBadge';

