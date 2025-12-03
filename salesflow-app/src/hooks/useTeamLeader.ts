/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useTeamLeader Hook                                                        ║
 * ║  React Hook für Team Leader Dashboard                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  teamLeaderApi, 
  TeamMember, 
  TeamDashboard,
  TeamAlert,
  MeetingAgenda,
  NudgeResult,
} from '../api/chiefV3';

export interface UseTeamLeaderReturn {
  // State
  members: TeamMember[];
  dashboard: TeamDashboard | null;
  alerts: TeamAlert[];
  agenda: MeetingAgenda | null;
  selectedMember: any | null;
  loading: boolean;
  error: string | null;
  
  // Computed
  activeMembers: TeamMember[];
  needsAttention: TeamMember[];
  criticalAlerts: TeamAlert[];
  teamSize: number;
  
  // Actions
  loadDashboard: () => Promise<void>;
  loadMembers: () => Promise<void>;
  loadAlerts: (priority?: 'critical' | 'high' | 'medium' | 'low') => Promise<void>;
  loadMemberDetail: (memberId: string) => Promise<void>;
  nudgeMember: (memberId: string, type: 'gentle' | 'direct' | 'motivational', message?: string) => Promise<NudgeResult>;
  generateAgenda: (meetingDate?: string) => Promise<void>;
  shareTemplate: (templateId: string, message?: string) => Promise<void>;
  clearSelection: () => void;
}

export function useTeamLeader(): UseTeamLeaderReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [alerts, setAlerts] = useState<TeamAlert[]>([]);
  const [agenda, setAgenda] = useState<MeetingAgenda | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Dashboard
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamLeaderApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teamLeaderApi.listMembers();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Alerts
  const loadAlerts = useCallback(async (priority?: 'critical' | 'high' | 'medium' | 'low') => {
    setLoading(true);
    try {
      const data = await teamLeaderApi.getAlerts(priority);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Member Detail
  const loadMemberDetail = useCallback(async (memberId: string) => {
    setLoading(true);
    try {
      const data = await teamLeaderApi.getMemberDetail(memberId);
      setSelectedMember(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Nudge Member
  const nudgeMember = useCallback(async (
    memberId: string, 
    type: 'gentle' | 'direct' | 'motivational',
    message?: string
  ) => {
    try {
      return await teamLeaderApi.nudgeMember(memberId, type, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      throw err;
    }
  }, []);

  // Generate Agenda
  const generateAgenda = useCallback(async (meetingDate?: string) => {
    setLoading(true);
    try {
      const data = await teamLeaderApi.getMeetingAgenda(meetingDate);
      setAgenda(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  // Share Template
  const shareTemplate = useCallback(async (templateId: string, message?: string) => {
    try {
      await teamLeaderApi.shareTemplate(templateId, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Clear Selection
  const clearSelection = useCallback(() => {
    setSelectedMember(null);
  }, []);

  // Initial Load
  useEffect(() => {
    loadDashboard();
    loadAlerts();
  }, [loadDashboard, loadAlerts]);

  // Computed
  const activeMembers = members.filter(m => m.is_active);
  const needsAttention = members.filter(m => m.needs_attention);
  const criticalAlerts = alerts.filter(a => a.priority === 'critical' || a.priority === 'high');
  const teamSize = members.length;

  return {
    members,
    dashboard,
    alerts,
    agenda,
    selectedMember,
    loading,
    error,
    activeMembers,
    needsAttention,
    criticalAlerts,
    teamSize,
    loadDashboard,
    loadMembers,
    loadAlerts,
    loadMemberDetail,
    nudgeMember,
    generateAgenda,
    shareTemplate,
    clearSelection,
  };
}

