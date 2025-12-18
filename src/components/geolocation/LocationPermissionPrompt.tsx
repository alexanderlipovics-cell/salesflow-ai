/**
 * SALES FLOW AI - LOCATION PERMISSION PROMPT
 * 
 * UI for requesting geolocation permission
 * Version: 2.0.0
 */

import React, { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LocationPermissionPromptProps {
  onRequestPermission: () => Promise<boolean>;
  error?: string | null;
  className?: string;
}

export const LocationPermissionPrompt = React.memo<LocationPermissionPromptProps>(
  ({ onRequestPermission, error, className }) => {
    const [isRequesting, setIsRequesting] = useState(false);

    const handleRequest = async () => {
      setIsRequesting(true);
      await onRequestPermission();
      setIsRequesting(false);
    };

    return (
      <Alert className={className}>
        <MapPin className="h-4 w-4" />
        <AlertTitle>Standortzugriff erforderlich</AlertTitle>
        <AlertDescription className="space-y-3 mt-2">
          <p className="text-sm text-muted-foreground">
            Um Leads in deiner Nähe zu finden, benötigen wir Zugriff auf deinen Standort.
          </p>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
          <Button
            onClick={handleRequest}
            disabled={isRequesting}
            size="sm"
            className="mt-2"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isRequesting ? 'Warte auf Berechtigung...' : 'Standort aktivieren'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
);

LocationPermissionPrompt.displayName = 'LocationPermissionPrompt';

