// ═══════════════════════════════════════════════════════════════════════════
// FILTER BAR - Multi-Select Filter UI Component
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  TextInput,
  Switch
} from 'react-native';
import { FilterCriteria, FilterOperator, LeadSegment, LeadSource, Stage, Channel } from '../types/leads';
import { filterManager } from '../utils/filterManager';
import { getFilterSummary } from '../utils/filterEngine';
import { formatSegment, formatSource, formatStage } from '../types/leads';

interface FilterBarProps {
  onFilterChange: (criteria: FilterCriteria, operator: FilterOperator) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange }) => {
  const [filterState, setFilterState] = useState(filterManager.getFilterState());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const activeCount = filterManager.getActiveFilterCount();
  
  useEffect(() => {
    filterManager.initialize();
    setFilterState(filterManager.getFilterState());
  }, []);
  
  useEffect(() => {
    onFilterChange(filterState.active, filterState.operator);
  }, [filterState]);
  
  const handleSegmentToggle = (segment: LeadSegment) => {
    const current = filterState.active.segments || [];
    const updated = current.includes(segment)
      ? current.filter(s => s !== segment)
      : [...current, segment];
    
    const newCriteria = {
      ...filterState.active,
      segments: updated.length > 0 ? updated : undefined
    };
    
    filterManager.setFilterCriteria(newCriteria);
    setFilterState(filterManager.getFilterState());
  };
  
  const handleSourceToggle = (source: LeadSource) => {
    const current = filterState.active.sources || [];
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    
    const newCriteria = {
      ...filterState.active,
      sources: updated.length > 0 ? updated : undefined
    };
    
    filterManager.setFilterCriteria(newCriteria);
    setFilterState(filterManager.getFilterState());
  };
  
  const handleStageToggle = (stage: Stage) => {
    const current = filterState.active.stages || [];
    const updated = current.includes(stage)
      ? current.filter(s => s !== stage)
      : [...current, stage];
    
    const newCriteria = {
      ...filterState.active,
      stages: updated.length > 0 ? updated : undefined
    };
    
    filterManager.setFilterCriteria(newCriteria);
    setFilterState(filterManager.getFilterState());
  };
  
  const handleReset = async () => {
    await filterManager.resetFilters();
    setFilterState(filterManager.getFilterState());
  };
  
  const toggleOperator = async () => {
    const newOp = filterState.operator === 'AND' ? 'OR' : 'AND';
    await filterManager.setOperator(newOp);
    setFilterState(filterManager.getFilterState());
  };
  
  const handleNewTodayToggle = (value: boolean) => {
    const newCriteria = {
      ...filterState.active,
      isNewToday: value || undefined
    };
    
    filterManager.setFilterCriteria(newCriteria);
    setFilterState(filterManager.getFilterState());
  };
  
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterButton, activeCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.filterButtonText, activeCount > 0 && styles.filterButtonTextActive]}>
            🔍 Filter {activeCount > 0 && `(${activeCount})`}
          </Text>
        </TouchableOpacity>
        
        {/* Quick Segment Filters */}
        {(['VIP', 'Warm_Prospect', 'Cold_Contact'] as LeadSegment[]).map(segment => {
          const isActive = filterState.active.segments?.includes(segment);
          return (
            <TouchableOpacity
              key={segment}
              style={[styles.chipButton, isActive && styles.chipButtonActive]}
              onPress={() => handleSegmentToggle(segment)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {formatSegment(segment)}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Reset Button */}
        {activeCount > 0 && (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>✕ Reset</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Filter Summary */}
      {activeCount > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText} numberOfLines={1}>
            {getFilterSummary(filterState.active, filterState.operator)}
          </Text>
          <TouchableOpacity onPress={toggleOperator} style={styles.operatorButton}>
            <Text style={styles.operatorText}>{filterState.operator}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Filter Modal - Full Filter UI */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Segments */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Segments</Text>
              <View style={styles.chipContainer}>
                {(['VIP', 'Warm_Prospect', 'Cold_Contact', 'Fast_Track', 'Reactivation', 'New_Contact'] as LeadSegment[]).map(segment => {
                  const isActive = filterState.active.segments?.includes(segment);
                  return (
                    <TouchableOpacity
                      key={segment}
                      style={[styles.modalChip, isActive && styles.modalChipActive]}
                      onPress={() => handleSegmentToggle(segment)}
                    >
                      <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                        {formatSegment(segment)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Sources */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Sources</Text>
              <View style={styles.chipContainer}>
                {(['Facebook', 'LinkedIn', 'Instagram', 'Referral', 'Webinar', 'Cold_Outreach', 'Event', 'Website'] as LeadSource[]).map(source => {
                  const isActive = filterState.active.sources?.includes(source);
                  return (
                    <TouchableOpacity
                      key={source}
                      style={[styles.modalChip, isActive && styles.modalChipActive]}
                      onPress={() => handleSourceToggle(source)}
                    >
                      <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                        {formatSource(source)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Stages */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Stages</Text>
              <View style={styles.chipContainer}>
                {(['new', 'contacted', 'early_follow_up', 'interested', 'qualified', 'candidate', 'customer', 'partner', 'reactivation'] as Stage[]).map(stage => {
                  const isActive = filterState.active.stages?.includes(stage);
                  return (
                    <TouchableOpacity
                      key={stage}
                      style={[styles.modalChip, isActive && styles.modalChipActive]}
                      onPress={() => handleStageToggle(stage)}
                    >
                      <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                        {formatStage(stage)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* New Today Toggle */}
            <View style={styles.filterSection}>
              <View style={styles.switchRow}>
                <Text style={styles.sectionTitle}>Nur neue Kontakte heute</Text>
                <Switch
                  value={filterState.active.isNewToday || false}
                  onValueChange={handleNewTodayToggle}
                />
              </View>
            </View>
            
            {/* Operator Toggle */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Filter Logic</Text>
              <View style={styles.operatorContainer}>
                <TouchableOpacity
                  style={[styles.operatorOption, filterState.operator === 'AND' && styles.operatorOptionActive]}
                  onPress={() => toggleOperator()}
                >
                  <Text style={[styles.operatorOptionText, filterState.operator === 'AND' && styles.operatorOptionTextActive]}>
                    AND (Alle Bedingungen)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.operatorOption, filterState.operator === 'OR' && styles.operatorOptionActive]}
                  onPress={() => toggleOperator()}
                >
                  <Text style={[styles.operatorOptionText, filterState.operator === 'OR' && styles.operatorOptionTextActive]}>
                    OR (Eine Bedingung)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  chipButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  chipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resetText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  operatorButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  operatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1976D2',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  modalChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  modalChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  operatorContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  operatorOption: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  operatorOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  operatorOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  operatorOptionTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

