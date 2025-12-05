// ═══════════════════════════════════════════════════════════════════════════
// FILTER ENGINE - Apply Filters to Leads with AND/OR Logic
// ═══════════════════════════════════════════════════════════════════════════

import { DueLead, FilterCriteria, FilterOperator } from '../types/leads';

export function applyFilters(
  leads: DueLead[],
  criteria: FilterCriteria,
  operator: FilterOperator = 'AND'
): DueLead[] {
  if (Object.keys(criteria).length === 0) {
    return leads;
  }
  
  return leads.filter(lead => {
    const checks: boolean[] = [];
    
    // Segment filter
    if (criteria.segments && criteria.segments.length > 0) {
      checks.push(criteria.segments.includes(lead.segment));
    }
    
    // Source filter
    if (criteria.sources && criteria.sources.length > 0) {
      checks.push(criteria.sources.includes(lead.source));
    }
    
    // Stage filter
    if (criteria.stages && criteria.stages.length > 0) {
      checks.push(criteria.stages.includes(lead.stage));
    }
    
    // Channel filter
    if (criteria.channels && criteria.channels.length > 0) {
      checks.push(criteria.channels.includes(lead.channel));
    }
    
    // Company filter
    if (criteria.companies && criteria.companies.length > 0) {
      checks.push(criteria.companies.includes(lead.company_name));
    }
    
    // Days inactive filter
    if (criteria.daysInactive) {
      const { min, max } = criteria.daysInactive;
      const days = lead.last_activity_days;
      
      if (min !== undefined && max !== undefined) {
        checks.push(days >= min && days <= max);
      } else if (min !== undefined) {
        checks.push(days >= min);
      } else if (max !== undefined) {
        checks.push(days <= max);
      }
    }
    
    // Priority score filter
    if (criteria.priorityScore) {
      const { min, max } = criteria.priorityScore;
      const score = lead.priority_score;
      
      if (min !== undefined && max !== undefined) {
        checks.push(score >= min && score <= max);
      } else if (min !== undefined) {
        checks.push(score >= min);
      } else if (max !== undefined) {
        checks.push(score <= max);
      }
    }
    
    // New today filter
    if (criteria.isNewToday !== undefined) {
      checks.push(lead.is_new_today === criteria.isNewToday);
    }
    
    // Tags filter (if lead has tags)
    if (criteria.tags && criteria.tags.length > 0 && lead.tags) {
      checks.push(criteria.tags.some(tag => lead.tags!.includes(tag)));
    }
    
    // Apply operator
    if (operator === 'AND') {
      return checks.every(check => check);
    } else {
      return checks.some(check => check);
    }
  });
}

export function getFilterSummary(criteria: FilterCriteria, operator: FilterOperator): string {
  const parts: string[] = [];
  
  if (criteria.segments && criteria.segments.length > 0) {
    parts.push(`Segment: ${criteria.segments.map(s => s.replace(/_/g, ' ')).join(', ')}`);
  }
  
  if (criteria.sources && criteria.sources.length > 0) {
    parts.push(`Quelle: ${criteria.sources.map(s => s.replace(/_/g, ' ')).join(', ')}`);
  }
  
  if (criteria.stages && criteria.stages.length > 0) {
    parts.push(`Status: ${criteria.stages.map(s => s.replace(/_/g, ' ')).join(', ')}`);
  }
  
  if (criteria.daysInactive) {
    const { min, max } = criteria.daysInactive;
    if (min !== undefined && max !== undefined) {
      parts.push(`Inaktiv: ${min}-${max} Tage`);
    } else if (min !== undefined) {
      parts.push(`Inaktiv: >${min} Tage`);
    } else if (max !== undefined) {
      parts.push(`Inaktiv: <${max} Tage`);
    }
  }
  
  if (criteria.isNewToday) {
    parts.push('Nur neue Kontakte');
  }
  
  if (parts.length === 0) {
    return 'Alle Leads';
  }
  
  const joinWord = operator === 'AND' ? ' UND ' : ' ODER ';
  return parts.join(joinWord);
}

