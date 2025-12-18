/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DISC PROFILE VISUALIZATION                                                ║
 * ║  Kreisdiagramm & Details für DISC-Persönlichkeitstypen                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

// =============================================================================
// TYPES
// =============================================================================

interface DISCScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

interface DISCVisualizationProps {
  primaryType: 'D' | 'I' | 'S' | 'C' | '?';
  secondaryType?: 'D' | 'I' | 'S' | 'C' | null;
  scores?: DISCScores;
  confidence: number;
  communicationStyle?: string;
  toneRecommendation?: string;
  messagesAnalyzed?: number;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DISC_CONFIG = {
  D: {
    name: 'Dominant',
    color: '#EF4444',
    icon: 'flash',
    emoji: '🔴',
    description: 'Direkt, ergebnisorientiert, will Kontrolle',
    tips: ['Komm zum Punkt', 'Zeig ROI & Ergebnisse', 'Sei selbstbewusst'],
  },
  I: {
    name: 'Initiativ',
    color: '#F59E0B',
    icon: 'happy',
    emoji: '🟡',
    description: 'Enthusiastisch, beziehungsorientiert, offen',
    tips: ['Sei begeistert', 'Erzähle Stories', 'Mach es persönlich'],
  },
  S: {
    name: 'Stetig',
    color: '#22C55E',
    icon: 'leaf',
    emoji: '🟢',
    description: 'Ruhig, harmoniebedürftig, geduldig',
    tips: ['Gib Zeit zum Nachdenken', 'Betone Sicherheit', 'Kein Druck'],
  },
  C: {
    name: 'Gewissenhaft',
    color: '#3B82F6',
    icon: 'flask',
    emoji: '🔵',
    description: 'Analytisch, detailorientiert, vorsichtig',
    tips: ['Bring Zahlen & Daten', 'Sei präzise', 'Biete Dokumentation'],
  },
};

const SIZES = {
  small: { chart: 80, font: 10 },
  medium: { chart: 120, font: 12 },
  large: { chart: 160, font: 14 },
};

// =============================================================================
// CHART COMPONENT
// =============================================================================

const DISCChart = ({ 
  scores, 
  size = 120 
}: { 
  scores: DISCScores; 
  size: number;
}) => {
  const center = size / 2;
  const radius = (size / 2) - 10;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  
  // Normalisiere Scores auf 0-100
  const total = Math.max(scores.D + scores.I + scores.S + scores.C, 0.01);
  const normalized = {
    D: (scores.D / total) * 100,
    I: (scores.I / total) * 100,
    S: (scores.S / total) * 100,
    C: (scores.C / total) * 100,
  };
  
  // Berechne Segmente
  let currentOffset = 0;
  const segments = (['D', 'I', 'S', 'C'] as const).map(type => {
    const percentage = normalized[type];
    const dashArray = (percentage / 100) * circumference;
    const segment = {
      type,
      color: DISC_CONFIG[type].color,
      dashArray,
      dashOffset: circumference - currentOffset,
    };
    currentOffset += dashArray;
    return segment;
  });
  
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background Circle */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#1E293B"
        strokeWidth={strokeWidth}
      />
      
      {/* Segments */}
      <G rotation="-90" origin={`${center}, ${center}`}>
        {segments.map((seg, i) => (
          <Circle
            key={seg.type}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
          />
        ))}
      </G>
      
      {/* Center Text */}
      <SvgText
        x={center}
        y={center + 4}
        textAnchor="middle"
        fontSize={size / 4}
        fontWeight="bold"
        fill="#F8FAFC"
      >
        {Math.round(Math.max(normalized.D, normalized.I, normalized.S, normalized.C))}%
      </SvgText>
    </Svg>
  );
};

// =============================================================================
// SCORE BAR COMPONENT
// =============================================================================

const ScoreBar = ({ 
  type, 
  score, 
  maxScore 
}: { 
  type: 'D' | 'I' | 'S' | 'C'; 
  score: number; 
  maxScore: number;
}) => {
  const config = DISC_CONFIG[type];
  const percentage = Math.min((score / Math.max(maxScore, 0.01)) * 100, 100);
  
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarLabel}>
        <Text style={[styles.scoreBarType, { color: config.color }]}>
          {config.emoji} {type}
        </Text>
        <Text style={styles.scoreBarValue}>{Math.round(score * 100)}%</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View 
          style={[
            styles.scoreBarFill, 
            { 
              width: `${percentage}%`,
              backgroundColor: config.color,
            }
          ]} 
        />
      </View>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DISCVisualization({
  primaryType,
  secondaryType,
  scores,
  confidence,
  communicationStyle,
  toneRecommendation,
  messagesAnalyzed,
  size = 'medium',
  showDetails = true,
}: DISCVisualizationProps) {
  const sizeConfig = SIZES[size];
  const config = primaryType !== '?' ? DISC_CONFIG[primaryType] : null;
  
  // Default scores wenn nicht vorhanden
  const displayScores = scores || {
    D: primaryType === 'D' ? 0.6 : 0.1,
    I: primaryType === 'I' ? 0.6 : 0.1,
    S: primaryType === 'S' ? 0.6 : 0.1,
    C: primaryType === 'C' ? 0.6 : 0.1,
  };
  
  const maxScore = Math.max(displayScores.D, displayScores.I, displayScores.S, displayScores.C);
  
  if (primaryType === '?') {
    return (
      <View style={styles.unknownContainer}>
        <Ionicons name="help-circle-outline" size={32} color="#6B7280" />
        <Text style={styles.unknownText}>DISC-Profil noch nicht erkannt</Text>
        <Text style={styles.unknownSubtext}>Mehr Nachrichten für Analyse nötig</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeIndicator, { backgroundColor: config?.color }]}>
          <Ionicons name={config?.icon as any} size={20} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.typeName}>
            {config?.emoji} {primaryType}-Typ: {config?.name}
          </Text>
          {secondaryType && (
            <Text style={styles.secondaryType}>
              Sekundär: {secondaryType}-Typ ({DISC_CONFIG[secondaryType].name})
            </Text>
          )}
        </View>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
        </View>
      </View>
      
      {/* Chart & Scores */}
      <View style={styles.chartSection}>
        <DISCChart scores={displayScores} size={sizeConfig.chart} />
        
        <View style={styles.scoresSection}>
          {(['D', 'I', 'S', 'C'] as const).map(type => (
            <ScoreBar 
              key={type} 
              type={type} 
              score={displayScores[type]} 
              maxScore={maxScore}
            />
          ))}
        </View>
      </View>
      
      {/* Details */}
      {showDetails && config && (
        <>
          {/* Description */}
          <View style={styles.descriptionBox}>
            <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
            <Text style={styles.descriptionText}>{config.description}</Text>
          </View>
          
          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Kommunikations-Tipps:</Text>
            {config.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
          
          {/* Tone Recommendation */}
          {toneRecommendation && (
            <View style={styles.toneBox}>
              <Text style={styles.toneLabel}>🎯 Empfohlener Ton:</Text>
              <Text style={[styles.toneBadge, { backgroundColor: config.color + '30', color: config.color }]}>
                {toneRecommendation}
              </Text>
            </View>
          )}
          
          {/* Messages Analyzed */}
          {messagesAnalyzed && (
            <Text style={styles.messagesAnalyzed}>
              📊 Basierend auf {messagesAnalyzed} Nachrichten
            </Text>
          )}
        </>
      )}
    </View>
  );
}

// =============================================================================
// COMPACT VERSION
// =============================================================================

export function DISCCompact({
  primaryType,
  confidence,
}: {
  primaryType: 'D' | 'I' | 'S' | 'C' | '?';
  confidence: number;
}) {
  if (primaryType === '?') return null;
  
  const config = DISC_CONFIG[primaryType];
  
  return (
    <View style={[styles.compactContainer, { borderColor: config.color }]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.compactText, { color: config.color }]}>
        {primaryType}-Typ ({Math.round(confidence * 100)}%)
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    margin: 8,
  },
  unknownContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    margin: 8,
    alignItems: 'center',
  },
  unknownText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  unknownSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  secondaryType: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  
  // Chart Section
  chartSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoresSection: {
    flex: 1,
    marginLeft: 16,
  },
  
  // Score Bar
  scoreBarContainer: {
    marginBottom: 8,
  },
  scoreBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreBarType: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBarValue: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  scoreBarTrack: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Description
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  descriptionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#9CA3AF',
  },
  
  // Tips
  tipsSection: {
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tipBullet: {
    color: '#22C55E',
    marginRight: 8,
    fontSize: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
  },
  
  // Tone
  toneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toneLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginRight: 8,
  },
  toneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Messages
  messagesAnalyzed: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default DISCVisualization;

