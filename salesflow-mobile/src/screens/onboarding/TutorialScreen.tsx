import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'chatbubbles',
    title: 'KI-gestützter Chat',
    description: 'Stelle Fragen zu Verkaufstechniken, Produktwissen oder Einwandbehandlung. Dein persönlicher Sales-Coach ist 24/7 verfügbar.',
    color: COLORS.primary,
  },
  {
    id: '2',
    icon: 'document-text',
    title: 'Professionelle Scripts',
    description: 'Zugriff auf hunderte bewährte Verkaufsskripte. Individuell anpassbar für jede Situation und jeden Kunden.',
    color: COLORS.secondary,
  },
  {
    id: '3',
    icon: 'trending-up',
    title: 'Maximaler Erfolg',
    description: 'Tracke deine Leads, optimiere deine Gespräche und steigere deine Abschlussrate mit datenbasierten Insights.',
    color: COLORS.accent,
  },
];

export default function TutorialScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('CompanySelect');
    }
  };

  const handleSkip = () => {
    navigation.navigate('CompanySelect');
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={80} color={item.color} />
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: SLIDES[currentIndex].color,
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Überspringen</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[SLIDES[currentIndex].color, SLIDES[currentIndex].color + 'DD']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>
              {currentIndex === SLIDES.length - 1 ? 'Weiter' : 'Nächster Schritt'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} von {SLIDES.length}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  skipButton: {
    padding: SPACING.sm,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  slide: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  slideDescription: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  nextButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});

