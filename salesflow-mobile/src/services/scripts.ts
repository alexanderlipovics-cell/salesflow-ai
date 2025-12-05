import { getScripts } from './supabase';
import type { Script } from '../types';

export async function fetchScripts(company?: string, category?: string): Promise<Script[]> {
  try {
    const data = await getScripts(company, category);
    return data as Script[];
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return [];
  }
}

