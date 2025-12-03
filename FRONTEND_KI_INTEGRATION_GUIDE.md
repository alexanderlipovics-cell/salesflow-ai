# 🎨 Sales Flow AI - Frontend KI Integration Guide

## React Native / Expo Integration für KI-Features

### 📋 Inhaltsverzeichnis
1. [API Client Setup](#api-client-setup)
2. [UI Components](#ui-components)
3. [Screens](#screens)
4. [State Management](#state-management)
5. [Beispiel-Flows](#beispiel-flows)

---

## 🔌 API Client Setup

### 1. KI API Client (`services/kiApi.ts`)

```typescript
// services/kiApi.ts
import { apiClient } from './api';

export interface BANTScores {
  budget_score: number;
  authority_score: number;
  need_score: number;
  timeline_score: number;
}

export interface BANTAssessment {
  id: string;
  lead_id: string;
  total_score: number;
  traffic_light: 'green' | 'yellow' | 'red';
  budget_score: number;
  authority_score: number;
  need_score: number;
  timeline_score: number;
  next_steps?: string;
  assessed_at: string;
}

export interface PersonalityProfile {
  id: string;
  lead_id: string;
  primary_type: 'D' | 'I' | 'S' | 'C';
  confidence_score: number;
  communication_tips: {
    tone: string;
    key_phrases: string[];
    avoid: string[];
  };
}

export interface AIRecommendation {
  id: string;
  lead_id?: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description?: string;
  reasoning?: string;
  confidence_score: number;
  created_at: string;
}

export interface ScoredLead {
  id: string;
  name: string;
  bant_score?: number;
  bant_traffic_light?: 'green' | 'yellow' | 'red';
  personality_type?: 'D' | 'I' | 'S' | 'C';
  overall_health_score: number;
  health_status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  days_since_contact: number;
  pending_recommendations: number;
}

export const kiApi = {
  // BANT Assessment
  async createBANT(leadId: string, scores: BANTScores, notes?: any): Promise<BANTAssessment> {
    const response = await apiClient.post('/api/ki/bant/assess', {
      lead_id: leadId,
      ...scores,
      ...notes,
    });
    return response.data;
  },

  async getBANT(leadId: string): Promise<BANTAssessment> {
    const response = await apiClient.get(`/api/ki/bant/${leadId}`);
    return response.data;
  },

  // Personality Profile
  async analyzePersonality(leadId: string): Promise<PersonalityProfile> {
    const response = await apiClient.post(`/api/ki/personality/analyze/${leadId}`);
    return response.data;
  },

  async getDISGRecommendations(leadId: string): Promise<any> {
    const response = await apiClient.get(`/api/ki/personality/${leadId}/recommendations`);
    return response.data;
  },

  // Intelligence
  async getLeadIntelligence(leadId: string): Promise<any> {
    const response = await apiClient.get(`/api/ki/intelligence/${leadId}`);
    return response.data;
  },

  async updateLeadMemory(leadId: string): Promise<any> {
    const response = await apiClient.post('/api/ki/memory/update', {
      lead_id: leadId,
    });
    return response.data;
  },

  // Recommendations
  async getRecommendations(limit: number = 10): Promise<AIRecommendation[]> {
    const response = await apiClient.get(`/api/ki/recommendations?limit=${limit}`);
    return response.data;
  },

  async getFollowupRecommendations(limit: number = 5): Promise<any> {
    const response = await apiClient.get(`/api/ki/recommendations/followups?limit=${limit}`);
    return response.data;
  },

  async updateRecommendationStatus(
    recommendationId: string,
    status: 'accepted' | 'dismissed' | 'completed',
    dismissedReason?: string
  ): Promise<AIRecommendation> {
    const response = await apiClient.patch(`/api/ki/recommendations/${recommendationId}`, {
      status,
      dismissed_reason: dismissedReason,
    });
    return response.data;
  },

  // Scripts
  async generateScript(
    leadId: string,
    scriptType: 'follow-up' | 'opening' | 'closing' | 'objection' = 'follow-up'
  ): Promise<{ script: string; compliance_checked: boolean }> {
    const response = await apiClient.post(
      `/api/ki/scripts/generate/${leadId}?script_type=${scriptType}`
    );
    return response.data;
  },

  // Analytics
  async getScoredLeads(limit: number = 50): Promise<ScoredLead[]> {
    const response = await apiClient.get(`/api/ki/analytics/scored-leads?limit=${limit}`);
    return response.data;
  },

  async getConversionFunnel(): Promise<any> {
    const response = await apiClient.get('/api/ki/analytics/conversion-funnel');
    return response.data;
  },

  async getPersonalityInsights(): Promise<any> {
    const response = await apiClient.get('/api/ki/analytics/personality-insights');
    return response.data;
  },
};
```

---

## 🎨 UI Components

### 1. BANT Traffic Light (`components/BANTTrafficLight.tsx`)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BANTTrafficLightProps {
  trafficLight: 'green' | 'yellow' | 'red';
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export const BANTTrafficLight: React.FC<BANTTrafficLightProps> = ({
  trafficLight,
  score,
  size = 'medium',
}) => {
  const getColor = () => {
    switch (trafficLight) {
      case 'green':
        return '#10B981'; // Green
      case 'yellow':
        return '#F59E0B'; // Yellow
      case 'red':
        return '#EF4444'; // Red
    }
  };

  const getEmoji = () => {
    switch (trafficLight) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'red':
        return '🔴';
    }
  };

  const getLabel = () => {
    switch (trafficLight) {
      case 'green':
        return 'HOT LEAD';
      case 'yellow':
        return 'WARM';
      case 'red':
        return 'NEEDS WORK';
    }
  };

  const sizeStyles = {
    small: { width: 60, height: 60, fontSize: 12 },
    medium: { width: 80, height: 80, fontSize: 14 },
    large: { width: 100, height: 100, fontSize: 16 },
  };

  return (
    <View style={[styles.container, { width: sizeStyles[size].width }]}>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: getColor(),
            width: sizeStyles[size].height,
            height: sizeStyles[size].height,
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: sizeStyles[size].fontSize * 2 }]}>
          {getEmoji()}
        </Text>
        <Text style={[styles.score, { fontSize: sizeStyles[size].fontSize + 2 }]}>
          {score}
        </Text>
      </View>
      <Text style={[styles.label, { fontSize: sizeStyles[size].fontSize }]}>
        {getLabel()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    marginBottom: 4,
  },
  score: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  label: {
    color: '#6B7280',
    fontWeight: '600',
  },
});
```

### 2. Personality Type Badge (`components/PersonalityBadge.tsx`)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PersonalityBadgeProps {
  type: 'D' | 'I' | 'S' | 'C';
  confidence?: number;
}

export const PersonalityBadge: React.FC<PersonalityBadgeProps> = ({ type, confidence }) => {
  const getTypeInfo = () => {
    switch (type) {
      case 'D':
        return { label: 'Dominant', color: '#EF4444', emoji: '💪' };
      case 'I':
        return { label: 'Influence', color: '#F59E0B', emoji: '✨' };
      case 'S':
        return { label: 'Steadiness', color: '#10B981', emoji: '🤝' };
      case 'C':
        return { label: 'Conscientiousness', color: '#3B82F6', emoji: '📊' };
    }
  };

  const info = getTypeInfo();

  return (
    <View style={[styles.container, { backgroundColor: info.color }]}>
      <Text style={styles.emoji}>{info.emoji}</Text>
      <Text style={styles.type}>{type}</Text>
      <Text style={styles.label}>{info.label}</Text>
      {confidence && (
        <Text style={styles.confidence}>{Math.round(confidence * 100)}% confident</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  type: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  confidence: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 4,
  },
});
```

### 3. Recommendation Card (`components/RecommendationCard.tsx`)

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AIRecommendation } from '../services/kiApi';

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onAccept: () => void;
  onDismiss: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onAccept,
  onDismiss,
}) => {
  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getPriorityEmoji = () => {
    switch (recommendation.priority) {
      case 'urgent':
        return '🔥';
      case 'high':
        return '⚡';
      case 'medium':
        return '💡';
      default:
        return '📋';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
          <Text style={styles.priorityEmoji}>{getPriorityEmoji()}</Text>
          <Text style={styles.priorityText}>{recommendation.priority.toUpperCase()}</Text>
        </View>
        <Text style={styles.confidence}>
          {Math.round(recommendation.confidence_score * 100)}% confident
        </Text>
      </View>

      <Text style={styles.title}>{recommendation.title}</Text>

      {recommendation.description && (
        <Text style={styles.description}>{recommendation.description}</Text>
      )}

      {recommendation.reasoning && (
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningLabel}>💭 Why?</Text>
          <Text style={styles.reasoning}>{recommendation.reasoning}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>✅ Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>✕ Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityEmoji: {
    marginRight: 4,
    fontSize: 16,
  },
  priorityText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  confidence: {
    color: '#6B7280',
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  reasoningBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  reasoning: {
    fontSize: 13,
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
});
```

---

## 📱 Screens

### 1. BANT Assessment Screen (`screens/BANTAssessmentScreen.tsx`)

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { kiApi } from '../services/kiApi';
import { BANTTrafficLight } from '../components/BANTTrafficLight';

export const BANTAssessmentScreen = ({ route, navigation }) => {
  const { leadId, leadName } = route.params;

  const [scores, setScores] = useState({
    budget_score: 50,
    authority_score: 50,
    need_score: 50,
    timeline_score: 50,
  });

  const [loading, setLoading] = useState(false);

  const totalScore = Math.round(
    (scores.budget_score + scores.authority_score + scores.need_score + scores.timeline_score) / 4
  );

  const trafficLight =
    totalScore >= 75 ? 'green' : totalScore >= 50 ? 'yellow' : 'red';

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const result = await kiApi.createBANT(leadId, scores);

      Alert.alert(
        '✅ BANT Assessment Saved',
        `Score: ${result.total_score}/100 (${result.traffic_light.toUpperCase()})`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save BANT assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 DEAL-MEDIC</Text>
        <Text style={styles.subtitle}>BANT Assessment for {leadName}</Text>
      </View>

      <View style={styles.previewCard}>
        <BANTTrafficLight trafficLight={trafficLight} score={totalScore} size="large" />
      </View>

      <View style={styles.criteriaContainer}>
        {/* Budget */}
        <View style={styles.criterionCard}>
          <View style={styles.criterionHeader}>
            <Text style={styles.criterionLabel}>💰 Budget</Text>
            <Text style={styles.criterionScore}>{scores.budget_score}/100</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={scores.budget_score}
            onValueChange={(value) => setScores({ ...scores, budget_score: value })}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#D1D5DB"
          />
          <Text style={styles.hint}>
            {scores.budget_score < 50
              ? '🔴 Budget unclear or not available'
              : scores.budget_score < 75
              ? '🟡 Budget confirmed but needs approval'
              : '🟢 Budget confirmed and available'}
          </Text>
        </View>

        {/* Authority */}
        <View style={styles.criterionCard}>
          <View style={styles.criterionHeader}>
            <Text style={styles.criterionLabel}>👤 Authority</Text>
            <Text style={styles.criterionScore}>{scores.authority_score}/100</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={scores.authority_score}
            onValueChange={(value) => setScores({ ...scores, authority_score: value })}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#D1D5DB"
          />
          <Text style={styles.hint}>
            {scores.authority_score < 50
              ? '🔴 Not the decision maker'
              : scores.authority_score < 75
              ? '🟡 Decision maker but needs consensus'
              : '🟢 Full decision authority'}
          </Text>
        </View>

        {/* Need */}
        <View style={styles.criterionCard}>
          <View style={styles.criterionHeader}>
            <Text style={styles.criterionLabel}>⚡ Need</Text>
            <Text style={styles.criterionScore}>{scores.need_score}/100</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={scores.need_score}
            onValueChange={(value) => setScores({ ...scores, need_score: value })}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#D1D5DB"
          />
          <Text style={styles.hint}>
            {scores.need_score < 50
              ? '🔴 No clear pain point'
              : scores.need_score < 75
              ? '🟡 Problem exists but not urgent'
              : '🟢 Critical need with urgency'}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.criterionCard}>
          <View style={styles.criterionHeader}>
            <Text style={styles.criterionLabel}>⏰ Timeline</Text>
            <Text style={styles.criterionScore}>{scores.timeline_score}/100</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={scores.timeline_score}
            onValueChange={(value) => setScores({ ...scores, timeline_score: value })}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#D1D5DB"
          />
          <Text style={styles.hint}>
            {scores.timeline_score < 50
              ? '🔴 No timeline or "just looking"'
              : scores.timeline_score < 75
              ? '🟡 Vague timeline (this year)'
              : '🟢 Immediate timeline (this month)'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? '⏳ Saving...' : '✅ Save Assessment'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
  },
  criteriaContainer: {
    padding: 16,
  },
  criterionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  criterionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  criterionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  criterionScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 20,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 🎯 Beispiel-Flows

### Flow 1: Neuer Lead → Komplette Qualifizierung

```typescript
// screens/LeadDetailScreen.tsx

const qualifyLead = async (leadId: string) => {
  try {
    // Step 1: Update Lead Memory
    await kiApi.updateLeadMemory(leadId);

    // Step 2: NEURO-PROFILER (AI Analysis)
    const personality = await kiApi.analyzePersonality(leadId);
    console.log('Personality Type:', personality.primary_type);

    // Step 3: BANT Assessment (User Input via Screen)
    navigation.navigate('BANTAssessment', { leadId, leadName: lead.name });

    // Step 4: Get Intelligence Summary
    const intelligence = await kiApi.getLeadIntelligence(leadId);
    console.log('Intelligence Score:', intelligence.intelligence_score);

    // Step 5: Generate Personalized Script
    const { script } = await kiApi.generateScript(leadId, 'follow-up');
    console.log('Script:', script);
  } catch (error) {
    console.error('Qualification failed:', error);
  }
};
```

### Flow 2: Dashboard mit Next Best Actions

```typescript
// screens/RecommendationsScreen.tsx

const RecommendationsScreen = () => {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    const result = await kiApi.getFollowupRecommendations(10);
    setRecommendations(result.recommendations);
  };

  const handleAccept = async (rec) => {
    await kiApi.updateRecommendationStatus(rec.id, 'accepted');
    // Navigate to action (e.g., Message Screen)
    navigation.navigate('MessageCompose', { leadId: rec.lead_id });
  };

  const handleDismiss = async (rec) => {
    await kiApi.updateRecommendationStatus(rec.id, 'dismissed', 'Not relevant');
    loadRecommendations(); // Refresh
  };

  return (
    <ScrollView>
      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          onAccept={() => handleAccept(rec)}
          onDismiss={() => handleDismiss(rec)}
        />
      ))}
    </ScrollView>
  );
};
```

---

## 🚀 Deployment Checklist für Frontend

- [ ] Installiere API Client (`services/kiApi.ts`)
- [ ] Erstelle UI Components (BANTTrafficLight, PersonalityBadge, RecommendationCard)
- [ ] Erstelle Screens (BANT Assessment, Recommendations, Analytics)
- [ ] Integriere in Navigation
- [ ] Teste mit Backend
- [ ] Deploy to App Store / Play Store

---

**Version**: 1.0.0  
**Maintainer**: Sales Flow AI Team

