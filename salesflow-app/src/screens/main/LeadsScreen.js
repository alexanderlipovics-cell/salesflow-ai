/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - LEADS SCREEN                                                    ║
 * ║  Lead-Verwaltung mit BANT-Scoring & Score-Visualisierung                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  RefreshControl, 
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { createAutoReminder, hasAutoReminder } from '../../services/autoReminderService';
import { useLeadScoring, useBANTForm, useSingleLeadScore } from '../../hooks/useLeadScoring';
import { SCORE_CATEGORIES, BANT_QUESTIONS, getScoreCategory } from '../../services/leadScoringService';
import { DISG_CONFIG } from '../../types/leadScoring.types';
import NextStepWidget from '../../components/NextStepWidget';
import { DECISION_STATE_CONFIG } from '../../types/personality';
import { API_CONFIG } from '../../services/apiConfig';
import { ChatImportModal } from '../../components/chat-import';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');
const getContactsApiUrl = () => `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/contacts`;

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  new: { label: 'Neu', color: '#3b82f6', bgColor: '#dbeafe' },
  contacted: { label: 'Kontaktiert', color: '#f59e0b', bgColor: '#fef3c7' },
  qualified: { label: 'Qualifiziert', color: '#10b981', bgColor: '#dcfce7' },
  proposal_sent: { label: 'Angebot gesendet', color: '#8b5cf6', bgColor: '#ede9fe' },
  won: { label: 'Gewonnen', color: '#22c55e', bgColor: '#dcfce7' },
  lost: { label: 'Verloren', color: '#ef4444', bgColor: '#fee2e2' },
};

const PRIORITY_CONFIG = {
  high: { label: '🔥 Hoch', color: '#ef4444' },
  medium: { label: '⚡ Mittel', color: '#f59e0b' },
  low: { label: '📌 Niedrig', color: '#64748b' },
};

// Demo-Daten falls API nicht verfügbar
const SAMPLE_LEADS = [
  {
    id: '1',
    name: 'Max Mustermann',
    company: 'Tech GmbH',
    status: 'new',
    priority: 'high',
    email: 'max@tech-gmbh.de',
    phone: '+49 171 1234567',
    last_contact: null,
    notes: 'Interessiert an Enterprise-Lösung',
    lead_score: 72,
    score_category: 'warm',
    bant_budget: 20,
    bant_authority: 15,
    bant_need: 22,
    bant_timeline: 15,
    disg_type: 'd'
  },
  {
    id: '2',
    name: 'Anna Schmidt',
    company: 'Digital Solutions AG',
    status: 'contacted',
    priority: 'medium',
    email: 'anna.schmidt@digital-solutions.de',
    phone: '+49 172 9876543',
    last_contact: '2024-01-15',
    notes: 'Follow-up nach Demo geplant',
    lead_score: 85,
    score_category: 'hot',
    bant_budget: 25,
    bant_authority: 20,
    bant_need: 20,
    bant_timeline: 20,
    disg_type: 'i'
  },
  {
    id: '3',
    name: 'Thomas Weber',
    company: 'Innovation Labs',
    status: 'qualified',
    priority: 'high',
    email: 't.weber@innovation-labs.de',
    phone: '+49 173 5555555',
    last_contact: '2024-01-18',
    notes: 'Bereit für Angebot',
    lead_score: 45,
    score_category: 'cool',
    bant_budget: 10,
    bant_authority: 15,
    bant_need: 10,
    bant_timeline: 10,
    disg_type: 's'
  },
  {
    id: '4',
    name: 'Lisa Müller',
    company: 'Startup XYZ',
    status: 'new',
    priority: 'low',
    email: 'lisa@startup-xyz.de',
    phone: '+49 174 7777777',
    last_contact: '2024-01-10',
    notes: 'Budget nicht vorhanden',
    lead_score: 18,
    score_category: 'cold',
    bant_budget: 0,
    bant_authority: 5,
    bant_need: 8,
    bant_timeline: 5,
    disg_type: 'g'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// SCORE BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ScoreBadge({ score, size = 'medium' }) {
  const category = getScoreCategory(score || 0);
  const sizes = {
    small: { width: 32, height: 32, fontSize: 10 },
    medium: { width: 44, height: 44, fontSize: 14 },
    large: { width: 56, height: 56, fontSize: 18 }
  };
  const s = sizes[size];
  
  return (
    <View style={[
      styles.scoreBadge,
      { 
        width: s.width, 
        height: s.height, 
        backgroundColor: category.bgColor,
        borderColor: category.color
      }
    ]}>
      <Text style={[styles.scoreBadgeText, { fontSize: s.fontSize, color: category.color }]}>
        {score || 0}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BANT SLIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function BANTSlider({ type, value, onChange, config }) {
  const steps = [0, 5, 10, 15, 20, 25];
  
  return (
    <View style={styles.bantSlider}>
      <View style={styles.bantSliderHeader}>
        <Text style={styles.bantSliderEmoji}>{config.emoji}</Text>
        <Text style={styles.bantSliderLabel}>{config.label}</Text>
        <Text style={[styles.bantSliderValue, { color: config.color }]}>{value}/25</Text>
      </View>
      
      <View style={styles.bantSliderTrack}>
        {steps.map((step, i) => {
          const isActive = value >= step;
          const isSelected = value === step;
          const stepLabel = config.scoring[i]?.label || '';
          
          return (
            <Pressable 
              key={step}
              style={[
                styles.bantSliderStep,
                isActive && { backgroundColor: config.color + '30' },
                isSelected && { backgroundColor: config.color, transform: [{ scale: 1.1 }] }
              ]}
              onPress={() => onChange(step)}
            >
              <Text style={[
                styles.bantSliderStepText,
                isSelected && { color: 'white', fontWeight: 'bold' }
              ]}>
                {step}
              </Text>
            </Pressable>
          );
        })}
      </View>
      
      <Text style={styles.bantSliderDescription}>
        {config.scoring.find(s => s.value === value)?.label || 'Unbekannt'}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DISG TYPE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

function DISGSelector({ value, onChange }) {
  return (
    <View style={styles.disgSelector}>
      <Text style={styles.disgTitle}>🧠 DISG-Typ (Persönlichkeit)</Text>
      <View style={styles.disgGrid}>
        {Object.entries(DISG_CONFIG).map(([key, config]) => (
          <Pressable
            key={key}
            style={[
              styles.disgOption,
              { borderColor: config.color },
              value === key && { backgroundColor: config.bgColor }
            ]}
            onPress={() => onChange(key)}
          >
            <Text style={styles.disgEmoji}>{config.emoji}</Text>
            <Text style={[styles.disgName, { color: config.color }]}>{config.name}</Text>
            <Text style={styles.disgKey}>{key.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BANT QUALIFY MODAL
// ═══════════════════════════════════════════════════════════════════════════

function BANTQualifyModal({ visible, lead, onClose, onSave }) {
  const { 
    values, 
    setValue, 
    totalScore, 
    category, 
    recommendation,
    reset 
  } = useBANTForm({
    budget: lead?.bant_budget || 0,
    authority: lead?.bant_authority || 0,
    need: lead?.bant_need || 0,
    timeline: lead?.bant_timeline || 0,
    disgType: lead?.disg_type || null
  });

  const [isSaving, setIsSaving] = useState(false);

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      setValue('budget', lead.bant_budget || 0);
      setValue('authority', lead.bant_authority || 0);
      setValue('need', lead.bant_need || 0);
      setValue('timeline', lead.bant_timeline || 0);
      setValue('disgType', lead.disg_type || null);
    }
  }, [lead, setValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(lead.id, values);
      onClose();
    } catch (error) {
      Alert.alert('Fehler', 'Score konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.bantModalContent}>
          {/* Header */}
          <View style={styles.bantModalHeader}>
            <View>
              <Text style={styles.bantModalTitle}>🎯 Lead qualifizieren</Text>
              <Text style={styles.bantModalSubtitle}>{lead.name}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Score Preview */}
          <View style={[styles.scorePreview, { backgroundColor: category.bgColor }]}>
            <View style={styles.scorePreviewLeft}>
              <Text style={[styles.scorePreviewLabel, { color: category.color }]}>
                {category.label}
              </Text>
              <Text style={styles.scorePreviewAction}>{category.action}</Text>
            </View>
            <View style={[styles.scorePreviewCircle, { borderColor: category.color }]}>
              <Text style={[styles.scorePreviewNumber, { color: category.color }]}>
                {totalScore}
              </Text>
              <Text style={styles.scorePreviewMax}>/100</Text>
            </View>
          </View>

          {/* Empfehlung */}
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>💡 Nächster Schritt</Text>
            <Text style={styles.recommendationAction}>{recommendation.action}</Text>
            <Text style={styles.recommendationQuestion}>"{recommendation.question}"</Text>
          </View>

          {/* BANT Sliders */}
          <View style={styles.bantSection}>
            <Text style={styles.bantSectionTitle}>📊 BANT-Score anpassen</Text>
            
            <BANTSlider
              type="budget"
              value={values.budget}
              onChange={(v) => setValue('budget', v)}
              config={BANT_QUESTIONS.budget}
            />
            
            <BANTSlider
              type="authority"
              value={values.authority}
              onChange={(v) => setValue('authority', v)}
              config={BANT_QUESTIONS.authority}
            />
            
            <BANTSlider
              type="need"
              value={values.need}
              onChange={(v) => setValue('need', v)}
              config={BANT_QUESTIONS.need}
            />
            
            <BANTSlider
              type="timeline"
              value={values.timeline}
              onChange={(v) => setValue('timeline', v)}
              config={BANT_QUESTIONS.timeline}
            />
          </View>

          {/* DISG Selector */}
          <DISGSelector
            value={values.disgType}
            onChange={(v) => setValue('disgType', v)}
          />

          {/* Save Button */}
          <Pressable 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>💾 Score speichern</Text>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LEADS SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function LeadsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Translated configs
  const STATUS_CONFIG_T = {
    new: { label: t('leads.status.new'), color: '#3b82f6', bgColor: '#dbeafe' },
    contacted: { label: t('leads.status.contacted'), color: '#f59e0b', bgColor: '#fef3c7' },
    qualified: { label: t('leads.status.qualified'), color: '#10b981', bgColor: '#dcfce7' },
    proposal_sent: { label: t('leads.status.proposal_sent'), color: '#8b5cf6', bgColor: '#ede9fe' },
    won: { label: t('leads.status.won'), color: '#22c55e', bgColor: '#dcfce7' },
    lost: { label: t('leads.status.lost'), color: '#ef4444', bgColor: '#fee2e2' },
  };
  
  const PRIORITY_CONFIG_T = {
    high: { label: t('leads.priority.high'), color: '#ef4444' },
    medium: { label: t('leads.priority.medium'), color: '#f59e0b' },
    low: { label: t('leads.priority.low'), color: '#64748b' },
  };
  const [selectedLead, setSelectedLead] = useState(null);
  const [bantModalVisible, setBantModalVisible] = useState(false);
  const [bantLead, setBantLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterScore, setFilterScore] = useState(null); // 'hot', 'warm', etc.
  const [sortBy, setSortBy] = useState('score'); // 'score', 'name', 'date'
  
  // NextStep Widget State
  const [nextStepModalVisible, setNextStepModalVisible] = useState(false);
  const [nextStepLead, setNextStepLead] = useState(null);
  
  // Chat Import Modal State
  const [chatImportModalVisible, setChatImportModalVisible] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  
  // Formular-State für neuen Lead
  const [newLead, setNewLead] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'new',
    priority: 'medium',
    notes: ''
  });

  // Lead Scoring Hook
  const { updateScore, getScoreCategory: getCat } = useLeadScoring(user?.id);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchLeads = useCallback(async () => {
    try {
      // Schneller Timeout für Demo-Modus
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${getContactsApiUrl()}?user_id=${user?.id || ''}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Neue API gibt {contacts: [...], total: ...} zurück
        setLeads(data.contacts || data.leads || data || []);
      } else {
        setLeads(SAMPLE_LEADS);
      }
    } catch (error) {
      console.log('API nicht erreichbar, nutze Demo-Daten');
      setLeads(SAMPLE_LEADS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const createLead = async () => {
    if (!newLead.name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein');
      return;
    }

    try {
      const response = await fetch(`${getContactsApiUrl()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLead,
          user_id: user?.id,
          lead_score: 0,
          score_category: 'cold'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(prev => [data, ...prev]);
      } else {
        const localLead = {
          id: Date.now().toString(),
          ...newLead,
          last_contact: null,
          lead_score: 0,
          score_category: 'cold'
        };
        setLeads(prev => [localLead, ...prev]);
      }
      
      setModalVisible(false);
      setNewLead({
        name: '',
        company: '',
        email: '',
        phone: '',
        status: 'new',
        priority: 'medium',
        notes: ''
      });
    } catch (error) {
      const localLead = {
        id: Date.now().toString(),
        ...newLead,
        last_contact: null,
        lead_score: 0,
        score_category: 'cold'
      };
      setLeads(prev => [localLead, ...prev]);
      setModalVisible(false);
      setNewLead({
        name: '',
        company: '',
        email: '',
        phone: '',
        status: 'new',
        priority: 'medium',
        notes: ''
      });
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    const lead = leads.find(l => l.id === leadId);
    
    try {
      await fetch(`${getContactsApiUrl()}/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) {
      console.log('Status-Update fehlgeschlagen');
    }
    
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status: newStatus } : l
    ));

    if (hasAutoReminder(newStatus) && lead) {
      const result = await createAutoReminder({
        leadId: lead.id,
        leadName: lead.name,
        userId: user?.id,
        newStatus
      });

      if (result?.success) {
        Alert.alert(
          '✅ Auto-Reminder erstellt',
          `Follow-up für "${lead.name}" in 3 Tagen geplant.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSaveBANTScore = async (leadId, bantValues) => {
    try {
      // Lokales Update
      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          const totalScore = bantValues.budget + bantValues.authority + bantValues.need + bantValues.timeline;
          const category = totalScore >= 75 ? 'hot' : totalScore >= 50 ? 'warm' : totalScore >= 25 ? 'cool' : 'cold';
          return {
            ...l,
            bant_budget: bantValues.budget,
            bant_authority: bantValues.authority,
            bant_need: bantValues.need,
            bant_timeline: bantValues.timeline,
            disg_type: bantValues.disgType,
            lead_score: totalScore,
            score_category: category
          };
        }
        return l;
      }));

      // API Update (falls verfügbar)
      try {
        await updateScore(leadId, bantValues);
      } catch (e) {
        console.log('API Update fehlgeschlagen, lokaler State wurde aktualisiert');
      }
    } catch (error) {
      console.error('BANT Save Error:', error);
      throw error;
    }
  };

  const openBANTModal = (lead) => {
    setBantLead(lead);
    setBantModalVisible(true);
  };

  // NextStep Widget öffnen
  const openNextStepModal = (lead) => {
    setNextStepLead(lead);
    setNextStepModalVisible(true);
  };

  const closeNextStepModal = () => {
    setNextStepModalVisible(false);
    setNextStepLead(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const formatDate = (dateString) => {
    if (!dateString) return 'Noch kein Kontakt';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Filter & Sort
  const filteredLeads = leads
    .filter(lead => {
      if (filterStatus && lead.status !== filterStatus) return false;
      if (filterScore && lead.score_category !== filterScore) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.lead_score || 0) - (a.lead_score || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });

  // Stats
  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.score_category === 'hot').length,
    warm: leads.filter(l => l.score_category === 'warm').length,
    cool: leads.filter(l => l.score_category === 'cool').length,
    cold: leads.filter(l => l.score_category === 'cold' || !l.score_category).length,
    avgScore: leads.length > 0 
      ? Math.round(leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leads.length)
      : 0
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD CARD COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════

  const LeadCard = ({ lead }) => {
    const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
    const priority = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.medium;
    const scoreCategory = getScoreCategory(lead.lead_score || 0);
    const disgConfig = lead.disg_type ? DISG_CONFIG[lead.disg_type] : null;

    return (
      <Pressable 
        style={styles.leadCard}
        onPress={() => setSelectedLead(lead)}
      >
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <View style={styles.leadNameRow}>
              <Text style={styles.leadName}>{lead.name}</Text>
              {disgConfig && (
                <View style={[styles.disgBadge, { backgroundColor: disgConfig.bgColor }]}>
                  <Text style={styles.disgBadgeText}>{disgConfig.emoji}</Text>
                </View>
              )}
            </View>
            <Text style={styles.leadCompany}>{lead.company || 'Keine Firma'}</Text>
          </View>
          
          {/* Score Badge */}
          <Pressable onPress={() => openBANTModal(lead)}>
            <ScoreBadge score={lead.lead_score} size="medium" />
          </Pressable>
        </View>

        {/* BANT Mini-Bars */}
        <View style={styles.bantMiniContainer}>
          <View style={styles.bantMiniBar}>
            <Text style={styles.bantMiniLabel}>💰</Text>
            <View style={styles.bantMiniTrack}>
              <View style={[styles.bantMiniFill, { width: `${(lead.bant_budget || 0) / 25 * 100}%`, backgroundColor: BANT_QUESTIONS.budget.color }]} />
            </View>
          </View>
          <View style={styles.bantMiniBar}>
            <Text style={styles.bantMiniLabel}>👔</Text>
            <View style={styles.bantMiniTrack}>
              <View style={[styles.bantMiniFill, { width: `${(lead.bant_authority || 0) / 25 * 100}%`, backgroundColor: BANT_QUESTIONS.authority.color }]} />
            </View>
          </View>
          <View style={styles.bantMiniBar}>
            <Text style={styles.bantMiniLabel}>🎯</Text>
            <View style={styles.bantMiniTrack}>
              <View style={[styles.bantMiniFill, { width: `${(lead.bant_need || 0) / 25 * 100}%`, backgroundColor: BANT_QUESTIONS.need.color }]} />
            </View>
          </View>
          <View style={styles.bantMiniBar}>
            <Text style={styles.bantMiniLabel}>⏰</Text>
            <View style={styles.bantMiniTrack}>
              <View style={[styles.bantMiniFill, { width: `${(lead.bant_timeline || 0) / 25 * 100}%`, backgroundColor: BANT_QUESTIONS.timeline.color }]} />
            </View>
          </View>
        </View>
        
        <View style={styles.leadDetails}>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          
          {/* USP: Neuro-Profiler DISG Badge */}
          {lead.disg_type && DISG_CONFIG[lead.disg_type.toLowerCase()] && (
            <View style={[
              styles.disgBadgeMini,
              { backgroundColor: DISG_CONFIG[lead.disg_type.toLowerCase()].bgColor || '#1e293b' }
            ]}>
              <Text style={styles.disgBadgeMiniEmoji}>
                {DISG_CONFIG[lead.disg_type.toLowerCase()].emoji || '🧠'}
              </Text>
              <Text style={[
                styles.disgBadgeMiniText,
                { color: DISG_CONFIG[lead.disg_type.toLowerCase()].color || '#8b5cf6' }
              ]}>
                {lead.disg_type.toUpperCase()}
              </Text>
            </View>
          )}
          
          {/* USP: Compliance Badge */}
          {lead.compliance_checked && (
            <View style={styles.complianceBadgeMini}>
              <Text style={styles.complianceBadgeMiniText}>🛡️</Text>
            </View>
          )}
          
          <Text style={styles.lastContact}>📅 {formatDate(lead.last_contact)}</Text>
        </View>
        
        {lead.notes && (
          <Text style={styles.notes} numberOfLines={1}>💭 {lead.notes}</Text>
        )}
      </Pressable>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Leads werden geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header mit Score Stats */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>👥 Leads</Text>
          <View style={styles.headerScore}>
            <Text style={styles.headerScoreLabel}>Ø Score</Text>
            <Text style={styles.headerScoreValue}>{stats.avgScore}</Text>
          </View>
        </View>
        
        {/* Score Stats */}
        <View style={styles.scoreStats}>
          <Pressable 
            style={[styles.scoreStat, filterScore === 'hot' && styles.scoreStatActive]}
            onPress={() => setFilterScore(filterScore === 'hot' ? null : 'hot')}
          >
            <Text style={styles.scoreStatIcon}>🔥</Text>
            <Text style={styles.scoreStatCount}>{stats.hot}</Text>
          </Pressable>
          <Pressable 
            style={[styles.scoreStat, filterScore === 'warm' && styles.scoreStatActive]}
            onPress={() => setFilterScore(filterScore === 'warm' ? null : 'warm')}
          >
            <Text style={styles.scoreStatIcon}>🌡️</Text>
            <Text style={styles.scoreStatCount}>{stats.warm}</Text>
          </Pressable>
          <Pressable 
            style={[styles.scoreStat, filterScore === 'cool' && styles.scoreStatActive]}
            onPress={() => setFilterScore(filterScore === 'cool' ? null : 'cool')}
          >
            <Text style={styles.scoreStatIcon}>❄️</Text>
            <Text style={styles.scoreStatCount}>{stats.cool}</Text>
          </Pressable>
          <Pressable 
            style={[styles.scoreStat, filterScore === 'cold' && styles.scoreStatActive]}
            onPress={() => setFilterScore(filterScore === 'cold' ? null : 'cold')}
          >
            <Text style={styles.scoreStatIcon}>🧊</Text>
            <Text style={styles.scoreStatCount}>{stats.cold}</Text>
          </Pressable>
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
      >
        <Pressable 
          style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
          onPress={() => setFilterStatus(null)}
        >
          <Text style={[styles.filterText, !filterStatus && styles.filterTextActive]}>
            Alle ({leads.length})
          </Text>
        </Pressable>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = leads.filter(l => l.status === key).length;
          return (
            <Pressable 
              key={key}
              style={[
                styles.filterChip, 
                filterStatus === key && { backgroundColor: config.color }
              ]}
              onPress={() => setFilterStatus(filterStatus === key ? null : key)}
            >
              <Text style={[
                styles.filterText, 
                filterStatus === key && styles.filterTextActive
              ]}>
                {config.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Leads Liste */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Keine Leads gefunden</Text>
            <Text style={styles.emptyText}>
              {filterScore || filterStatus 
                ? 'Versuche einen anderen Filter'
                : 'Füge deinen ersten Lead hinzu'}
            </Text>
          </View>
        ) : (
          filteredLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB Menu */}
      {fabMenuOpen && (
        <Pressable 
          style={styles.fabOverlay}
          onPress={() => setFabMenuOpen(false)}
        >
          {/* Chat Import Option */}
          <Pressable 
            style={[styles.fabOption, styles.fabOptionChat]}
            onPress={() => {
              setFabMenuOpen(false);
              setChatImportModalVisible(true);
            }}
          >
            <Text style={styles.fabOptionIcon}>📥</Text>
            <Text style={styles.fabOptionLabel}>Chat importieren</Text>
          </Pressable>
          
          {/* New Lead Option */}
          <Pressable 
            style={[styles.fabOption, styles.fabOptionLead]}
            onPress={() => {
              setFabMenuOpen(false);
              setModalVisible(true);
            }}
          >
            <Text style={styles.fabOptionIcon}>👤</Text>
            <Text style={styles.fabOptionLabel}>Neuer Lead</Text>
          </Pressable>
        </Pressable>
      )}
      
      {/* FAB Button */}
      <Pressable 
        style={[styles.fab, fabMenuOpen && styles.fabActive]}
        onPress={() => setFabMenuOpen(!fabMenuOpen)}
      >
        <Text style={[styles.fabIcon, fabMenuOpen && styles.fabIconActive]}>
          {fabMenuOpen ? '✕' : '+'}
        </Text>
      </Pressable>

      {/* Lead Detail Modal */}
      <Modal
        visible={selectedLead !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLead(null)}
      >
        {selectedLead && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedLead.name}</Text>
                  <Text style={styles.modalCompany}>{selectedLead.company || 'Keine Firma'}</Text>
                </View>
                <ScoreBadge score={selectedLead.lead_score} size="large" />
                <Pressable onPress={() => setSelectedLead(null)}>
                  <Text style={styles.closeButton}>✕</Text>
                </Pressable>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📧 E-Mail</Text>
                <Text style={styles.detailValue}>{selectedLead.email || '-'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📞 Telefon</Text>
                <Text style={styles.detailValue}>{selectedLead.phone || '-'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📅 Letzter Kontakt</Text>
                <Text style={styles.detailValue}>{formatDate(selectedLead.last_contact)}</Text>
              </View>
              
              {selectedLead.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.detailLabel}>📝 Notizen</Text>
                  <Text style={styles.notesText}>{selectedLead.notes}</Text>
                </View>
              )}
              
              <Text style={styles.statusSectionTitle}>Status ändern</Text>
              <View style={styles.statusButtons}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Pressable 
                    key={key}
                    style={[
                      styles.statusButton, 
                      { borderColor: config.color },
                      selectedLead.status === key && { backgroundColor: config.bgColor }
                    ]}
                    onPress={() => {
                      updateLeadStatus(selectedLead.id, key);
                      setSelectedLead({ ...selectedLead, status: key });
                    }}
                  >
                    <Text style={[styles.statusButtonText, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              
              <View style={styles.actionRow}>
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => {
                    setSelectedLead(null);
                    openBANTModal(selectedLead);
                  }}
                >
                  <Text style={styles.actionButtonText}>🎯 Qualifizieren</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                  onPress={() => {
                    const lead = selectedLead;
                    setSelectedLead(null);
                    openNextStepModal(lead);
                  }}
                >
                  <Text style={styles.actionButtonText}>💬 Nächster Schritt</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Neuer Lead Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Neuer Lead</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={newLead.name}
              onChangeText={(text) => setNewLead(prev => ({ ...prev, name: text }))}
              placeholder="Vor- und Nachname"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Firma</Text>
            <TextInput
              style={styles.input}
              value={newLead.company}
              onChangeText={(text) => setNewLead(prev => ({ ...prev, company: text }))}
              placeholder="Firmenname"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>E-Mail</Text>
            <TextInput
              style={styles.input}
              value={newLead.email}
              onChangeText={(text) => setNewLead(prev => ({ ...prev, email: text }))}
              placeholder="email@beispiel.de"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={newLead.phone}
              onChangeText={(text) => setNewLead(prev => ({ ...prev, phone: text }))}
              placeholder="+49 171 1234567"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Priorität</Text>
            <View style={styles.priorityRow}>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <Pressable 
                  key={key}
                  style={[
                    styles.priorityChip,
                    newLead.priority === key && { backgroundColor: config.color }
                  ]}
                  onPress={() => setNewLead(prev => ({ ...prev, priority: key }))}
                >
                  <Text style={[
                    styles.priorityChipText,
                    newLead.priority === key && { color: 'white' }
                  ]}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notizen</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newLead.notes}
              onChangeText={(text) => setNewLead(prev => ({ ...prev, notes: text }))}
              placeholder="Zusätzliche Informationen..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />

            <Pressable style={styles.submitButton} onPress={createLead}>
              <Text style={styles.submitButtonText}>✨ Lead erstellen</Text>
            </Pressable>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* BANT Qualify Modal */}
      <BANTQualifyModal
        visible={bantModalVisible}
        lead={bantLead}
        onClose={() => {
          setBantModalVisible(false);
          // Nach BANT direkt NextStep öffnen
          if (bantLead) {
            setTimeout(() => openNextStepModal(bantLead), 300);
          }
          setBantLead(null);
        }}
        onSave={handleSaveBANTScore}
      />

      {/* NextStep Widget Modal */}
      <Modal
        visible={nextStepModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeNextStepModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nextStepModalContent}>
            {nextStepLead && (
              <NextStepWidget
                leadId={nextStepLead.id}
                leadName={nextStepLead.name}
                workspaceId={user?.workspace_id || user?.user_metadata?.workspace_id || null}
                userId={user?.id || null}
                discStyle={nextStepLead.disg_type?.toUpperCase()}
                decisionState={nextStepLead.decision_state || 'no_decision'}
                lastContactAt={nextStepLead.last_contact}
                preferredChannel="whatsapp"
                companyContext={{
                  company_name: 'AURA',
                  product_name: 'Produkt',
                  product_short_benefit: 'Mehr Abschlüsse mit KI-Unterstützung',
                }}
                lastConversationSummary={nextStepLead.notes || 'Keine Notizen vorhanden'}
                onPlanCreated={() => {
                  Alert.alert(
                    '✅ Nächster Schritt geplant',
                    `Follow-up für "${nextStepLead.name}" wurde eingeplant.`,
                    [{ text: 'OK', onPress: closeNextStepModal }]
                  );
                }}
                onSkip={() => {
                  closeNextStepModal();
                }}
                onClose={closeNextStepModal}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Chat Import Modal */}
      <ChatImportModal
        visible={chatImportModalVisible}
        onClose={() => setChatImportModalVisible(false)}
        onSuccess={(result) => {
          // Refresh leads nach erfolgreichem Import
          fetchLeads();
          Alert.alert(
            '✅ Lead importiert',
            result.message || 'Chat wurde erfolgreich analysiert und Lead angelegt.',
            [{ text: 'OK' }]
          );
        }}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  
  // Header
  header: { backgroundColor: '#10b981', padding: 20, paddingTop: 60 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerScore: { alignItems: 'center' },
  headerScoreLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerScoreValue: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  
  // Score Stats
  scoreStats: { flexDirection: 'row', marginTop: 16, gap: 8 },
  scoreStat: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 12, 
    padding: 12, 
    alignItems: 'center' 
  },
  scoreStatActive: { backgroundColor: 'white' },
  scoreStatIcon: { fontSize: 20 },
  scoreStatCount: { fontSize: 18, fontWeight: 'bold', color: 'white', marginTop: 4 },
  
  // Filter
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: '#3b82f6' },
  filterText: { fontSize: 14, color: '#64748b' },
  filterTextActive: { color: 'white', fontWeight: '600' },
  
  // List
  listContainer: { flex: 1, padding: 16, minHeight: 300 },
  bottomSpacer: { height: 100 },
  
  // Lead Card
  leadCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leadInfo: { flex: 1 },
  leadNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  leadCompany: { fontSize: 14, color: '#64748b', marginTop: 2 },
  
  // DISG Badge (Neuro-Profiler USP)
  disgBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  disgBadgeText: { fontSize: 12 },
  disgBadgeMini: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  disgBadgeMiniEmoji: { fontSize: 12 },
  disgBadgeMiniText: { fontSize: 11, fontWeight: '700' },
  
  // Compliance Badge (Locked Block™ USP)
  complianceBadgeMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  complianceBadgeMiniText: { fontSize: 12 },
  
  // Score Badge
  scoreBadge: { 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2
  },
  scoreBadgeText: { fontWeight: 'bold' },
  
  // BANT Mini Bars
  bantMiniContainer: { flexDirection: 'row', marginTop: 12, gap: 8 },
  bantMiniBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  bantMiniLabel: { fontSize: 10 },
  bantMiniTrack: { flex: 1, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  bantMiniFill: { height: '100%', borderRadius: 2 },
  
  // Lead Details
  leadDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  lastContact: { fontSize: 12, color: '#64748b' },
  notes: { fontSize: 14, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  
  // FAB
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 90,
    width: 56, 
    height: 56, 
    backgroundColor: '#10b981', 
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  fabIcon: { fontSize: 32, color: 'white', marginTop: -2 },
  fabActive: { backgroundColor: '#ef4444', transform: [{ rotate: '45deg' }] },
  fabIconActive: { transform: [{ rotate: '-45deg' }] },
  fabOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 160
  },
  fabOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  fabOptionChat: { backgroundColor: '#3b82f6' },
  fabOptionLead: { backgroundColor: '#10b981' },
  fabOptionIcon: { fontSize: 20, marginRight: 10 },
  fabOptionLabel: { fontSize: 16, fontWeight: '600', color: 'white' },
  
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    maxHeight: '85%'
  },
  formModalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    maxHeight: '90%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  closeButton: { fontSize: 24, color: '#94a3b8', padding: 8 },
  modalCompany: { fontSize: 16, color: '#64748b', marginBottom: 16 },
  
  // Detail Rows
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { fontSize: 14, color: '#64748b' },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  notesSection: { marginTop: 16 },
  notesText: { fontSize: 14, color: '#1e293b', marginTop: 8, lineHeight: 22 },
  
  // Status
  statusSectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginTop: 24, marginBottom: 12 },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 2 },
  statusButtonText: { fontSize: 14, fontWeight: '600' },
  
  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionButton: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  
  // Input
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  priorityChipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  submitButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  
  // BANT Modal
  bantModalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    maxHeight: '95%'
  },
  bantModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  bantModalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  bantModalSubtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 24, color: '#94a3b8' },
  
  // Score Preview
  scorePreview: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 16 
  },
  scorePreviewLeft: { flex: 1 },
  scorePreviewLabel: { fontSize: 20, fontWeight: 'bold' },
  scorePreviewAction: { fontSize: 14, color: '#64748b', marginTop: 4 },
  scorePreviewCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    borderWidth: 3, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'white'
  },
  scorePreviewNumber: { fontSize: 24, fontWeight: 'bold' },
  scorePreviewMax: { fontSize: 10, color: '#94a3b8' },
  
  // Recommendation
  recommendationBox: { 
    backgroundColor: '#FEF3C7', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B'
  },
  recommendationTitle: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  recommendationAction: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },
  recommendationQuestion: { fontSize: 14, color: '#64748b', marginTop: 8, fontStyle: 'italic' },
  
  // BANT Section
  bantSection: { marginBottom: 20 },
  bantSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  
  // BANT Slider
  bantSlider: { marginBottom: 20 },
  bantSliderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bantSliderEmoji: { fontSize: 20, marginRight: 8 },
  bantSliderLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1e293b' },
  bantSliderValue: { fontSize: 16, fontWeight: 'bold' },
  bantSliderTrack: { flexDirection: 'row', gap: 6 },
  bantSliderStep: { 
    flex: 1, 
    paddingVertical: 12, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  bantSliderStepText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  bantSliderDescription: { fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center' },
  
  // DISG Selector
  disgSelector: { marginBottom: 20 },
  disgTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  disgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  disgOption: { 
    width: '48%', 
    padding: 12, 
    borderRadius: 12, 
    borderWidth: 2, 
    alignItems: 'center' 
  },
  disgEmoji: { fontSize: 24 },
  disgName: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  disgKey: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  // Save Button
  saveButton: { 
    backgroundColor: '#8B5CF6', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center' 
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  
  // NextStep Modal
  nextStepModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 0,
    maxHeight: '90%',
  },
});
