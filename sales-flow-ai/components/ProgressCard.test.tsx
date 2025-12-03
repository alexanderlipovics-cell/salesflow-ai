// components/ProgressCard.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressCard } from './ProgressCard';

describe('ProgressCard', () => {
  it('sollte die korrekten Daten und Fortschritte rendern und mit Snapshot matchen', () => {
    const props = {
      title: 'Kontakte',
      value: 8,
      target: 20,
      progress: 0.4, // 8/20 = 0.4
    };

    const { getByText, toJSON } = render(<ProgressCard {...props} />);

    // Testet, ob Titel (UPPERCASE) und Werte sichtbar sind
    expect(getByText('KONTAKTE')).toBeTruthy();
    expect(getByText('Ziel: 20')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
    expect(getByText('/20')).toBeTruthy();
    
    // Testet, ob der Fortschrittsbalken mit dem Titel-Wert gematcht wird (Snapshot)
    expect(toJSON()).toMatchSnapshot();
  });
  
  it('sollte den Wert korrekt als String anzeigen', () => {
      const props = {
        title: 'Punkte',
        value: '22',
        target: 40,
        progress: 0.55,
      };

      const { getByText } = render(<ProgressCard {...props} />);
      expect(getByText('22')).toBeTruthy();
  });

  it('sollte Erfolgsindikator anzeigen wenn Ziel erreicht (progress >= 1.0)', () => {
    const props = {
      title: 'Punkte',
      value: 450,
      target: 400,
      progress: 1.125, // 112.5% = Ziel übertroffen
    };

    const { getByText } = render(<ProgressCard {...props} />);
    
    // Erfolgstext sollte erscheinen
    expect(getByText('🎉 Ziel erreicht!')).toBeTruthy();
    expect(getByText('450')).toBeTruthy();
    expect(getByText('/400')).toBeTruthy();
  });
});

