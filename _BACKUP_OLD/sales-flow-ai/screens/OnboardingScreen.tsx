import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'slide1',
    title: 'Willkommen bei Sales Flow AI',
    description: 'Dein KI-Vertriebs-Copilot, der dir hilft, mehr Abschlüsse mit derselben Leadmenge zu erreichen',
    icon: '🚀',
  },
  {
    key: 'slide2',
    title: 'Intelligentes Lead-Management',
    description: 'KI extrahiert automatisch Lead-Daten aus deinen Gesprächen und bewertet sie',
    icon: '🎯',
  },
  {
    key: 'slide3',
    title: 'Nie mehr Follow-ups verpassen',
    description: 'Erhalte KI-Empfehlungen für den perfekten Zeitpunkt, um jeden Lead zu kontaktieren',
    icon: '⏰',
  },
  {
    key: 'slide4',
    title: 'Baue dein Team auf',
    description: 'Manage dein Team, tracke Performance und wachst gemeinsam',
    icon: '👥',
  },
  {
    key: 'slide5',
    title: 'Lass uns starten!',
    description: 'Erstelle deinen ersten Lead und erlebe die Magie',
    icon: '✨',
  },
];

interface OnboardingScreenProps {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleGetStarted = async () => {
    // Mark onboarding as complete
    await AsyncStorage.setItem('onboarding_completed', 'true');
    navigation.replace('Main');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    navigation.replace('Main');
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: width * index, animated: true });
  };

  const renderSlide = (slide: any, index: number) => (
    <View style={[styles.slide, { width }]} key={slide.key}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{slide.icon}</Text>
      </View>
      
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.description}>{slide.description}</Text>

      {index === slides.length - 1 ? (
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedButtonText}>Los geht's</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Überspringen</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Progress Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot
            ]}
            onPress={() => scrollToIndex(index)}
          />
        ))}
      </View>

      {/* Next Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => scrollToIndex(currentIndex + 1)}
        >
          <Text style={styles.nextButtonText}>Weiter</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 40,
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    height: 60,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    backgroundColor: '#D1D1D6',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#007AFF',
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

