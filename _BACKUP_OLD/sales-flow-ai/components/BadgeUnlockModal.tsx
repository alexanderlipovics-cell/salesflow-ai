import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
}

interface BadgeUnlockModalProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function BadgeUnlockModal({ visible, badge, onClose }: BadgeUnlockModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(-50),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible && badge) {
      // Badge entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Confetti animation
      confettiAnims.forEach((anim, index) => {
        Animated.parallel([
          Animated.timing(anim.y, {
            toValue: height,
            duration: 2000 + Math.random() * 1000,
            delay: index * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 720,
            duration: 2000,
            delay: index * 50,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      scaleAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.y.setValue(-50);
        anim.rotate.setValue(0);
      });
    }
  }, [visible, badge]);

  if (!badge) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#007AFF';
    }
  };

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'bronze': return ['#CD7F32', '#8B4513'];
      case 'silver': return ['#C0C0C0', '#808080'];
      case 'gold': return ['#FFD700', '#FFA500'];
      case 'platinum': return ['#E5E4E2', '#A8A8A8'];
      default: return ['#007AFF', '#0051D5'];
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const tierColor = getTierColor(badge.tier);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left: anim.x,
                transform: [
                  { translateY: anim.y },
                  { rotate: anim.rotate.interpolate({
                    inputRange: [0, 720],
                    outputRange: ['0deg', '720deg'],
                  })},
                ],
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][index % 5],
              },
            ]}
          />
        ))}

        {/* Badge Card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              borderColor: tierColor,
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: tierColor,
                transform: [{ rotate: rotation }],
              },
            ]}
          />

          {/* Badge Icon */}
          <Animated.View
            style={[
              styles.badgeIcon,
              {
                backgroundColor: tierColor,
                transform: [{ rotate: rotation }],
              },
            ]}
          >
            <Text style={styles.icon}>
              {badge.tier === 'platinum' ? '💎' :
               badge.tier === 'gold' ? '🥇' :
               badge.tier === 'silver' ? '🥈' : '🥉'}
            </Text>
          </Animated.View>

          {/* Badge Info */}
          <Text style={styles.title}>Achievement Unlocked!</Text>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgeDescription}>{badge.description}</Text>
          
          {/* Tier Badge */}
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{badge.tier.toUpperCase()}</Text>
          </View>

          {/* Points */}
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsValue}>+{badge.points}</Text>
            <Text style={styles.pointsLabel}>XP</Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: tierColor }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  card: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    top: '30%',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.2,
    zIndex: 0,
  },
  badgeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
    marginRight: 8,
  },
  pointsLabel: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 150,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

