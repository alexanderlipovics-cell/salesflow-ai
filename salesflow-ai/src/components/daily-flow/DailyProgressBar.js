/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DAILY PROGRESS BAR                                       ║
 * ║  Animierte Progress Bar Komponente                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Animierte Progress Bar
 * 
 * @param {Object} props
 * @param {string} props.label - Label für die Progress Bar
 * @param {number} props.done - Erledigte Anzahl
 * @param {number} props.target - Ziel-Anzahl
 * @param {string} props.color - Farbe der Progress Bar
 * @param {boolean} [props.showPercentage=true] - Prozent anzeigen
 * @param {boolean} [props.animated=true] - Animation aktivieren
 */
const DailyProgressBar = ({
  label,
  done,
  target,
  color,
  showPercentage = true,
  animated = true,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  const percentage = target > 0 ? Math.min((done / target) * 100, 100) : 0;
  const doneInt = Math.round(done);
  const targetInt = Math.round(target);
  const isComplete = percentage >= 100;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: percentage,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(percentage);
    }
  }, [percentage, animated, progressAnim]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.countContainer}>
          <Text style={styles.count}>
            {doneInt} / {targetInt}
          </Text>
          {showPercentage && (
            <Text style={styles.percentage}> ({Math.round(percentage)}%)</Text>
          )}
        </View>
      </View>
      
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: animatedWidth,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
      
      {isComplete && (
        <Text style={[styles.completeText, { color }]}>✓ Erledigt!</Text>
      )}
    </View>
  );
};

/**
 * Kompakte Progress Bar Variante
 */
export const CompactProgressBar = ({ done, target, color }) => {
  const percentage = target > 0 ? Math.min((done / target) * 100, 100) : 0;

  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactBar}>
        <View
          style={[
            styles.compactFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.compactCount}>
        {Math.round(done)}/{Math.round(target)}
      </Text>
    </View>
  );
};

/**
 * Circular Progress Variante
 */
export const CircularProgress = ({ percentage, size = 60, strokeWidth = 6, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      <View style={styles.circularBackground}>
        <Text style={styles.circularText}>{Math.round(percentage)}%</Text>
      </View>
      {/* Note: For a real circular progress, you'd use SVG or a library like react-native-svg */}
      <View
        style={[
          styles.circularRing,
          {
            width: size,
            height: size,
            borderWidth: strokeWidth,
            borderColor: color,
            borderRadius: size / 2,
            opacity: percentage / 100,
          },
        ]}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Main Progress Bar
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  percentage: {
    fontSize: 13,
    color: '#94a3b8',
  },
  barContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barBackground: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  completeText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // Compact Progress Bar
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactCount: {
    fontSize: 11,
    color: '#94a3b8',
    minWidth: 35,
    textAlign: 'right',
  },

  // Circular Progress
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularBackground: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularText: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  circularRing: {
    position: 'absolute',
  },
});

export default DailyProgressBar;

