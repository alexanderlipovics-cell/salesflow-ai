/**
 * SALES FLOW AI - LOCATION STATUS COMPONENT
 * 
 * Display current geolocation status and accuracy
 * Version: 2.0.0
 */

import React from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GeolocationState } from '@/types/geolocation';
import { getAccuracyLevel, formatCoordinates } from '@/lib/utils/geolocation';

interface LocationStatusProps {
  state: GeolocationState;
  onRefresh?: () => void;
  showCoordinates?: boolean;
  className?: string;
}

export const LocationStatus = React.memo<LocationStatusProps>(
  ({ state, onRefresh, showCoordinates = false, className }) => {
    const accuracy = state.coordinates
      ? getAccuracyLevel(state.coordinates.accuracy)
      : null;

    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          {state.isLoading && (
            <Badge variant="secondary">
              <Navigation className="h-3 w-3 mr-1 animate-pulse" />
              Standort wird ermittelt...
            </Badge>
          )}
          
          {state.error && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Standort nicht verfügbar
            </Badge>
          )}
          
          {state.coordinates && accuracy && (
            <Badge
              variant="secondary"
              className={
                accuracy.level === 'excellent' || accuracy.level === 'good'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              }
            >
              <MapPin className="h-3 w-3 mr-1" />
              {accuracy.description}
            </Badge>
          )}

          {showCoordinates && state.coordinates && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatCoordinates(state.coordinates)}
            </span>
          )}

          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={state.isLoading}
            >
              <Navigation className={`h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

LocationStatus.displayName = 'LocationStatus';

