// ═══════════════════════════════════════════════════════════════════════════
// FILTER MANAGER - Persistent Filter State Management
// ═══════════════════════════════════════════════════════════════════════════
// Handles filter state persistence using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterState, FilterCriteria, FilterOperator, FilterPreset } from '../types/leads';
import { logger } from './logger';

const FILTER_STATE_KEY = 'lead_filters_state';
const FILTER_PRESETS_KEY = 'lead_filter_presets';

const DEFAULT_FILTER_STATE: FilterState = {
  active: {},
  operator: 'AND',
  presets: []
};

class FilterManager {
  private filterState: FilterState = DEFAULT_FILTER_STATE;
  
  async initialize(): Promise<void> {
    try {
      const [stateStr, presetsStr] = await Promise.all([
        AsyncStorage.getItem(FILTER_STATE_KEY),
        AsyncStorage.getItem(FILTER_PRESETS_KEY)
      ]);
      
      if (stateStr) {
        const state = JSON.parse(stateStr);
        this.filterState = { ...DEFAULT_FILTER_STATE, ...state };
      }
      
      if (presetsStr) {
        const presets = JSON.parse(presetsStr);
        this.filterState.presets = presets;
      }
    } catch (error) {
      logger.error('Failed to load filter state', error);
    }
  }
  
  getFilterState(): FilterState {
    return { ...this.filterState };
  }
  
  async setFilterCriteria(criteria: FilterCriteria): Promise<void> {
    this.filterState.active = criteria;
    await this.save();
  }
  
  async setOperator(operator: FilterOperator): Promise<void> {
    this.filterState.operator = operator;
    await this.save();
  }
  
  async resetFilters(): Promise<void> {
    this.filterState.active = {};
    await this.save();
  }
  
  async savePreset(name: string, userId: string): Promise<FilterPreset> {
    const preset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name,
      criteria: { ...this.filterState.active },
      operator: this.filterState.operator,
      created_at: new Date().toISOString(),
      user_id: userId
    };
    
    this.filterState.presets.push(preset);
    await this.savePresets();
    
    return preset;
  }
  
  async loadPreset(presetId: string): Promise<void> {
    const preset = this.filterState.presets.find(p => p.id === presetId);
    if (preset) {
      this.filterState.active = { ...preset.criteria };
      this.filterState.operator = preset.operator;
      await this.save();
    }
  }
  
  async deletePreset(presetId: string): Promise<void> {
    this.filterState.presets = this.filterState.presets.filter(p => p.id !== presetId);
    await this.savePresets();
  }
  
  getActiveFilterCount(): number {
    const criteria = this.filterState.active;
    let count = 0;
    
    if (criteria.segments && criteria.segments.length > 0) count++;
    if (criteria.sources && criteria.sources.length > 0) count++;
    if (criteria.stages && criteria.stages.length > 0) count++;
    if (criteria.channels && criteria.channels.length > 0) count++;
    if (criteria.companies && criteria.companies.length > 0) count++;
    if (criteria.daysInactive) count++;
    if (criteria.priorityScore) count++;
    if (criteria.isNewToday !== undefined) count++;
    if (criteria.tags && criteria.tags.length > 0) count++;
    
    return count;
  }
  
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        FILTER_STATE_KEY,
        JSON.stringify({
          active: this.filterState.active,
          operator: this.filterState.operator
        })
      );
    } catch (error) {
      logger.error('Failed to save filter state', error);
    }
  }
  
  private async savePresets(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        FILTER_PRESETS_KEY,
        JSON.stringify(this.filterState.presets)
      );
    } catch (error) {
      logger.error('Failed to save filter presets', error);
    }
  }
}

export const filterManager = new FilterManager();

