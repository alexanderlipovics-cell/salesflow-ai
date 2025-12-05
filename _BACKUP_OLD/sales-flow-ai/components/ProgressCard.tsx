// components/ProgressCard.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';

interface ProgressCardProps {
  title: string;              // "Kontakte" oder "Punkte"
  value: string | number;     // Aktueller Wert
  progress: number;           // 0.0 bis 1.0 (oder mehr)
  target: number;             // Zielwert
}

export const ProgressCard: React.FC<ProgressCardProps> = ({ 
  title, 
  value, 
  progress, 
  target 
}) => {
  const [barContainerWidth, setBarContainerWidth] = useState(0);
  
  // 1. Progress normalisieren (für Progress Bar max 1.0)
  const normalizedProgress = Math.min(progress, 1.0);
  const barWidth = barContainerWidth * normalizedProgress;
  
  const handleBarContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setBarContainerWidth(width);
  };
  
  // 2. Farben bestimmen (basierend auf title + progress)
  let barColor: string;
  let cardBackground: string;
  let valueColor: string;
  
  // Standard-Farben basierend auf Titel
  if (title.toLowerCase().includes('kontakt')) {
    // Kontakte: Blau
    cardBackground = '#E3F2FD';
    barColor = '#03A9F4';
    valueColor = '#0277BD';
  } else {
    // Punkte: Orange
    cardBackground = '#FFF3E0';
    barColor = '#FF9800';
    valueColor = '#E65100';
  }
  
  // 3. Erfolg = Grün (bei 100%+)
  const isGoalReached = progress >= 1.0;
  if (isGoalReached) {
    cardBackground = '#E8F5E9';
    barColor = '#4CAF50';
    valueColor = '#2E7D32';
  }
  
  return (
    <View style={[styles.card, { backgroundColor: cardBackground }]}>
      {/* Header: Titel + Ziel */}
      <View style={styles.header}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <Text style={styles.target}>Ziel: {target}</Text>
      </View>
      
      {/* Value Container: Wert + Einheit */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: valueColor }]}>
          {value}
        </Text>
        <Text style={styles.unit}>/{target}</Text>
      </View>
      
      {/* Progress Bar */}
      <View 
        style={styles.progressBarBackground}
        onLayout={handleBarContainerLayout}
      >
        {barContainerWidth > 0 && (
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: barWidth, 
                backgroundColor: barColor 
              }
            ]} 
          />
        )}
      </View>
      
      {/* Erfolgstext (conditional) */}
      {isGoalReached && (
        <Text style={styles.successText}>
          🎉 Ziel erreicht!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 12,
    marginVertical: 5,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    flex: 1, // Für 50/50 Split in Row
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700', // bold
    textTransform: 'uppercase',
    color: '#424242',
    letterSpacing: 0.5,
  },
  target: {
    fontSize: 12,
    fontWeight: '500', // medium
    color: '#757575',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  value: {
    fontSize: 32,
    fontWeight: '900', // ultra-bold
    lineHeight: 38,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600', // semi-bold
    color: '#757575',
    marginLeft: 4,
    marginBottom: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 4,
    textAlign: 'center',
  },
});
