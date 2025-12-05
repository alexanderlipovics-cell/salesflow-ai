import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../constants/api';

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT SETUP
// ═══════════════════════════════════════════════════════════════════════════

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  API_CONFIG.SUPABASE_URL,
  API_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION TEST
// ═══════════════════════════════════════════════════════════════════════════

export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('Connection test - scripts table error:', error.message);
      // Try mlm_scripts as fallback
      const { error: error2 } = await supabase
        .from('mlm_scripts')
        .select('id')
        .limit(1);
      
      if (error2) {
        console.log('Connection test - mlm_scripts table error:', error2.message);
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error('Connection test failed:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

export interface Script {
  id: string;
  title?: string;
  name?: string;
  script_name?: string;
  content?: string;
  text?: string;
  script_text?: string;
  category: string;
  company?: string;
  vertical?: string;
  tags?: string[];
  tone?: string;
  copied_count?: number;
  usage_count?: number;
  is_active?: boolean;
  created_at?: string;
}

/**
 * Lädt Scripts aus Supabase
 * Versucht erst 'scripts', dann 'mlm_scripts' als Fallback
 */
export async function getScripts(
  company?: string, 
  category?: string
): Promise<Script[]> {
  try {
    // Versuche zuerst die 'scripts' Tabelle
    let query = supabase
      .from('scripts')
      .select('*');
    
    if (company && company !== 'all') {
      query = query.or(`vertical.ilike.%${company}%,name.ilike.%${company}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    
    if (!error && data && data.length > 0) {
      // Normalisiere Daten
      return data.map(normalizeScript);
    }
    
    // Fallback: mlm_scripts Tabelle
    let query2 = supabase
      .from('mlm_scripts')
      .select('*');
    
    if (company && company !== 'all') {
      query2 = query2.ilike('company', `%${company}%`);
    }
    if (category) {
      query2 = query2.eq('category', category);
    }
    
    const { data: data2, error: error2 } = await query2.limit(50);
    
    if (error2) {
      console.error('Supabase mlm_scripts error:', error2);
      return getMockScripts(company, category);
    }
    
    if (data2 && data2.length > 0) {
      return data2.map(normalizeScript);
    }
    
    // Fallback zu Mock-Daten
    return getMockScripts(company, category);
    
  } catch (e) {
    console.error('getScripts error:', e);
    return getMockScripts(company, category);
  }
}

/**
 * Normalisiert Script-Daten aus verschiedenen Tabellenstrukturen
 */
function normalizeScript(script: any): Script {
  return {
    id: script.id,
    title: script.title || script.name || script.script_name || 'Unbenannt',
    name: script.name || script.title,
    content: script.content || script.text || script.script_text || '',
    text: script.text || script.content,
    category: script.category || 'general',
    company: script.company || script.vertical || 'GENERAL',
    tags: script.tags || [],
    tone: script.tone,
    copied_count: script.copied_count || script.usage_count || 0,
    usage_count: script.usage_count || script.copied_count || 0,
    is_active: script.is_active !== false,
    created_at: script.created_at,
  };
}

/**
 * Mock-Scripts als Fallback wenn DB leer ist
 */
function getMockScripts(company?: string, category?: string): Script[] {
  const mockScripts: Script[] = [
    {
      id: 'mock-1',
      title: 'Warm Market Opener',
      content: 'Hey [Name]! 👋 Ich hab da was entdeckt, das perfekt zu dir passen könnte. Hast du 5 Minuten?',
      category: 'opener',
      company: 'GENERAL',
      tags: ['warm', 'opener', 'freundlich'],
      tone: 'casual',
    },
    {
      id: 'mock-2',
      title: 'Follow-Up nach Präsentation',
      content: 'Hey [Name], ich wollte kurz nachfragen, wie dir unser Gespräch letztens gefallen hat. Gibt es Fragen, die ich dir beantworten kann?',
      category: 'followup',
      company: 'GENERAL',
      tags: ['followup', 'soft'],
      tone: 'professional',
    },
    {
      id: 'mock-3',
      title: 'Einwand: Keine Zeit',
      content: 'Das verstehe ich total! Gerade deshalb könnte das hier interessant für dich sein - es geht um Zeitfreiheit. Wann hättest du 10 Minuten?',
      category: 'objection',
      company: 'GENERAL',
      tags: ['einwand', 'zeit'],
      tone: 'empathisch',
    },
    {
      id: 'mock-4',
      title: 'Zinzino Balance Test Pitch',
      content: 'Wusstest du, dass 97% der Menschen ein Omega-Ungleichgewicht haben? Mit dem Zinzino BalanceTest kannst du das in 15 Sekunden überprüfen. Interesse?',
      category: 'opener',
      company: 'Zinzino',
      tags: ['zinzino', 'test', 'gesundheit'],
      tone: 'informativ',
    },
    {
      id: 'mock-5',
      title: 'LR Aloe Vera Einstieg',
      content: 'Hey! Ich trinke seit 3 Monaten das Aloe Vera Gel und meine Verdauung hat sich mega verbessert. Kennst du das Produkt?',
      category: 'opener',
      company: 'LR',
      tags: ['lr', 'aloe', 'produkt'],
      tone: 'persönlich',
    },
    {
      id: 'mock-6',
      title: 'Soft Close',
      content: 'Basierend auf allem, was du mir erzählt hast, glaube ich wirklich, dass das zu dir passt. Was hält dich noch davon ab, heute zu starten?',
      category: 'closing',
      company: 'GENERAL',
      tags: ['closing', 'soft'],
      tone: 'confident',
    },
  ];
  
  let filtered = mockScripts;
  
  if (company && company !== 'all') {
    filtered = filtered.filter(s => 
      s.company?.toLowerCase().includes(company.toLowerCase()) ||
      company.toLowerCase() === 'general'
    );
  }
  
  if (category) {
    filtered = filtered.filter(s => s.category === category);
  }
  
  return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════
// OBJECTIONS (Einwände)
// Echtes Schema: objection_responses hat objection_id (FK), technique, 
// response_script, success_rate, tone, when_to_use, company_id, vertical
// ═══════════════════════════════════════════════════════════════════════════

export interface ObjectionResponse {
  id: string;
  objection_id?: string;
  technique: string;
  response_script: string;
  success_rate?: string;
  tone?: string;
  when_to_use?: string;
  company_id?: string;
  vertical?: string;
  // Joined from objections table
  objection_text?: string;
  objection_category?: string;
}

// Normalized interface for UI
export interface Objection {
  id: string;
  objection: string;
  response: string;
  technique?: string;
  when_to_use?: string;
  tone?: string;
  success_rate?: string;
  vertical?: string;
  // Legacy support
  step_1_buffer?: string;
  step_2_isolate?: string;
  step_3_reframe?: string;
  step_4_close?: string;
}

/**
 * Lädt Einwand-Antworten aus Supabase
 * Unterstützt mehrere Tabellenstrukturen
 */
export async function getObjections(searchTerm?: string): Promise<Objection[]> {
  try {
    // Strategie 1: Versuche objection_responses mit JOIN zu objections
    const { data: joinedData, error: joinError } = await supabase
      .from('objection_responses')
      .select(`
        id,
        objection_id,
        technique,
        response_script,
        success_rate,
        tone,
        when_to_use,
        vertical,
        objections (
          id,
          objection_text,
          category
        )
      `)
      .limit(30);

    if (!joinError && joinedData && joinedData.length > 0) {
      // Filter nach Suchbegriff wenn vorhanden
      let filtered = joinedData;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = joinedData.filter((item: any) => {
          const objText = item.objections?.objection_text?.toLowerCase() || '';
          const technique = item.technique?.toLowerCase() || '';
          const response = item.response_script?.toLowerCase() || '';
          return objText.includes(term) || technique.includes(term) || response.includes(term);
        });
      }

      return filtered.map((item: any) => normalizeObjectionResponse(item));
    }

    // Strategie 2: objection_responses ohne JOIN
    let query = supabase
      .from('objection_responses')
      .select('id, objection_id, technique, response_script, success_rate, tone, when_to_use, vertical');
    
    const { data: responsesData, error: responsesError } = await query.limit(30);
    
    if (!responsesError && responsesData && responsesData.length > 0) {
      let filtered = responsesData;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = responsesData.filter((item: any) => {
          const technique = item.technique?.toLowerCase() || '';
          const response = item.response_script?.toLowerCase() || '';
          return technique.includes(term) || response.includes(term);
        });
      }
      return filtered.map((item: any) => normalizeObjectionResponse(item));
    }

    // Strategie 3: objection_handling_advanced (Legacy)
    let advQuery = supabase
      .from('objection_handling_advanced')
      .select('*');
    
    if (searchTerm) {
      advQuery = advQuery.ilike('objection', `%${searchTerm}%`);
    }
    
    const { data: advData, error: advError } = await advQuery.limit(20);
    
    if (!advError && advData && advData.length > 0) {
      return advData.map((o: any) => ({
        id: o.id,
        objection: o.objection || 'Einwand',
        response: o.step_3_reframe || o.step_1_buffer || '',
        technique: 'LIRA',
        step_1_buffer: o.step_1_buffer,
        step_2_isolate: o.step_2_isolate,
        step_3_reframe: o.step_3_reframe,
        step_4_close: o.step_4_close,
      }));
    }
    
    // Fallback zu Mock-Daten
    return getMockObjections(searchTerm);
    
  } catch (e) {
    console.error('getObjections error:', e);
    return getMockObjections(searchTerm);
  }
}

/**
 * Normalisiert objection_responses Daten für die UI
 */
function normalizeObjectionResponse(item: any): Objection {
  // Extrahiere objection text aus JOIN oder verwende technique als Fallback
  const objectionText = item.objections?.objection_text 
    || item.technique 
    || 'Einwand';
  
  return {
    id: item.id,
    objection: objectionText,
    response: item.response_script || '',
    technique: item.technique,
    when_to_use: item.when_to_use,
    tone: item.tone,
    success_rate: item.success_rate,
    vertical: item.vertical,
  };
}

/**
 * Mock-Daten als Fallback
 */
function getMockObjections(searchTerm?: string): Objection[] {
  const mocks: Objection[] = [
    {
      id: 'obj-1',
      objection: 'Ich habe keine Zeit',
      response: 'Das verstehe ich total! Gerade deshalb könnte das hier interessant für dich sein – es geht um Zeitfreiheit. Wann hättest du 10 Minuten für einen kurzen Call?',
      technique: 'Reframe',
      when_to_use: 'Wenn der Prospect "keine Zeit" als Grund nennt',
      tone: 'EMPATHETIC',
    },
    {
      id: 'obj-2',
      objection: 'Das ist mir zu teuer',
      response: 'Ich verstehe, dass du auf dein Budget achtest. Lass mich fragen: Was wäre es dir wert, wenn du [konkreter Nutzen] erreichen könntest? Manchmal ist die Frage nicht "Kann ich mir das leisten?" sondern "Kann ich es mir leisten, es NICHT zu tun?"',
      technique: 'Wert-Frage',
      when_to_use: 'Bei Preiseinwänden',
      tone: 'PROFESSIONAL',
    },
    {
      id: 'obj-3',
      objection: 'Ich muss drüber nachdenken',
      response: 'Absolut, das ist eine wichtige Entscheidung. Mal angenommen, du hättest morgen früh nochmal drüber geschlafen – was müsste passiert sein, damit du Ja sagst?',
      technique: 'Isolieren',
      when_to_use: 'Wenn der Prospect Zeit zum Nachdenken braucht',
      tone: 'PROFESSIONAL',
    },
    {
      id: 'obj-4',
      objection: 'Mein Partner muss das entscheiden',
      response: 'Super, dass du deinen Partner einbeziehst! Das zeigt Respekt. Wann könnt ihr beide gemeinsam mit mir sprechen? So kann ich alle Fragen direkt beantworten.',
      technique: 'Termin setzen',
      when_to_use: 'Bei Partner-Einwänden',
      tone: 'CASUAL',
    },
    {
      id: 'obj-5',
      objection: 'Ist das MLM / Pyramide?',
      response: 'Gute Frage! Pyramidensysteme sind illegal – da gibt es kein echtes Produkt. Bei uns verdienst du durch Produktverkauf UND Teamaufbau. Jeder kann mehr verdienen als sein Sponsor. Der Unterschied zu einem normalen Job? Du bestimmst dein Einkommen selbst.',
      technique: 'Aufklärung',
      when_to_use: 'Bei MLM-Skepsis',
      tone: 'PROFESSIONAL',
    },
    {
      id: 'obj-6',
      objection: 'Ich kenne niemanden',
      response: 'Das dachte ich am Anfang auch! Aber wir zeigen dir genau, wie du online neue Kontakte aufbaust. Social Media macht es möglich. Dein Bekanntenkreis ist nur der Anfang, nicht das Limit.',
      technique: 'Perspektivwechsel',
      when_to_use: 'Bei Kontakt-Einwänden',
      tone: 'CASUAL',
    },
  ];
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    return mocks.filter(m => 
      m.objection.toLowerCase().includes(term) ||
      m.response.toLowerCase().includes(term) ||
      m.technique?.toLowerCase().includes(term)
    );
  }
  
  return mocks;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  notes?: string;
  source?: string;
  created_at: string;
  updated_at?: string;
}

export async function getLeads(userId?: string): Promise<Lead[]> {
  try {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Supabase leads error:', error);
      return [];
    }
    
    return data || [];
    
  } catch (e) {
    console.error('getLeads error:', e);
    return [];
  }
}

export async function createLead(lead: Partial<Lead>): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();
    
    if (error) {
      console.error('Create lead error:', error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('createLead error:', e);
    return null;
  }
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Update lead error:', error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('updateLead error:', e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PSYCHOLOGY MODULES
// ═══════════════════════════════════════════════════════════════════════════

export async function getSalesPsychology() {
  try {
    const { data, error } = await supabase
      .from('sales_psychology_principles')
      .select('*');
    
    if (error) {
      console.error('Psychology error:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('getSalesPsychology error:', e);
    return [];
  }
}

export async function getSpinQuestions() {
  try {
    const { data, error } = await supabase
      .from('spin_questions')
      .select('*');
    
    if (error) {
      console.error('SPIN error:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('getSpinQuestions error:', e);
    return [];
  }
}

export async function getDISGTypes() {
  try {
    const { data, error } = await supabase
      .from('customer_types_disg')
      .select('*');
    
    if (error) {
      console.error('DISG error:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('getDISGTypes error:', e);
    return [];
  }
}
