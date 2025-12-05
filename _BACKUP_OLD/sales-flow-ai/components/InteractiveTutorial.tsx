import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetComponent: string;  // ID of component to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'step1',
    title: 'Füge deinen ersten Lead hinzu',
    description: 'Tippe auf den + Button, um einen neuen Lead hinzuzufügen. Du kannst tippen oder Sprache nutzen!',
    targetComponent: 'add-lead-button',
    position: 'bottom',
  },
  {
    id: 'step2',
    title: 'Chatte mit der KI',
    description: 'Erzähle der KI von deinem Gespräch. Sie extrahiert automatisch die Lead-Details.',
    targetComponent: 'ai-chat-button',
    position: 'bottom',
  },
  {
    id: 'step3',
    title: 'Prüfe den BANT Score',
    description: 'Sieh wie qualifiziert jeder Lead ist mit automatischem BANT Scoring.',
    targetComponent: 'bant-score',
    position: 'top',
  },
  {
    id: 'step4',
    title: 'Folge den Empfehlungen',
    description: 'Die KI sagt dir die beste Zeit für den Kontakt und was du sagen sollst.',
    targetComponent: 'recommendations',
    position: 'top',
  },
];

interface InteractiveTutorialProps {
  visible: boolean;
  onComplete: () => void;
}

export default function InteractiveTutorial({ visible, onComplete }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [overlayOpacity] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(overlayOpacity, {
        toValue: 0.7,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  if (!visible) return null;

  const step = tutorialSteps[currentStep];

  return (
    <Modal transparent visible={visible} animationType="fade">
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

      {/* Tutorial Card */}
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Progress */}
          <View style={styles.progress}>
            <Text style={styles.progressText}>
              {currentStep + 1} / {tutorialSteps.length}
            </Text>
          </View>

          {/* Content */}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Tutorial überspringen</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentStep === tutorialSteps.length - 1 ? 'Fertig' : 'Weiter'}
              </Text>
              <ArrowRight size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arrow pointing to target (optional) */}
        {/* Add arrow SVG here based on position */}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progress: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#999',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

