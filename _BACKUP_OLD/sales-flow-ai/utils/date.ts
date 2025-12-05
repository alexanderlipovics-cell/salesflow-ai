// utils/date.ts

/**
 * Formatiert ein ISO-Datum für die Anzeige des Fälligkeitsdatums.
 * Passt sich an die aktuellen Zeitangaben an (Heute/Überfällig).
 */
export const formatDueDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date(); // In der App: aktuelles Datum, in Tests: mockbar
  
  // Berechnung der Differenz in Stunden
  const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Fall 1: Überfällig (in der Vergangenheit)
  if (diffInHours < 0) return 'Überfällig';
  
  // Fall 2: Heute fällig (innerhalb der nächsten 24 Stunden)
  if (diffInHours < 24) {
    // Deutsche Lokalisierung (z.B. 15:00 Uhr)
    const timeString = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `Heute ${timeString}`;
  }
  
  // Fall 3: Später fällig
  return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

