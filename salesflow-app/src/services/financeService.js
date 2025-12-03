/**
 * Sales Flow AI - Finance Service
 * API Layer für das Finance Overview System
 */

import { supabase } from './supabase';
import { API_CONFIG } from './apiConfig';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// ============ ERROR HANDLING ============

export class FinanceError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'FinanceError';
    this.code = code;
    this.details = details;
  }
}

// ============ GET FINANCE SUMMARY ============

/**
 * Holt die Finanz-Zusammenfassung für einen Zeitraum
 * @param {string} userId - User ID
 * @param {string} [fromDate] - Start-Datum (YYYY-MM-DD)
 * @param {string} [toDate] - End-Datum (YYYY-MM-DD)
 * @returns {Promise<Object>} Finance Summary
 */
export async function getFinanceSummary(userId, fromDate, toDate) {
  try {
    const { data, error } = await supabase.rpc('get_finance_summary', {
      p_user_id: userId,
      p_workspace_id: null,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) throw new FinanceError('Zusammenfassung konnte nicht geladen werden', 'RPC_ERROR', error);
    
    return data;
  } catch (err) {
    console.error('getFinanceSummary error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ GET MONTHLY REVENUE DATA ============

/**
 * Holt monatliche Umsatzdaten für Charts
 * @param {string} userId - User ID
 * @param {number} [months=6] - Anzahl Monate
 * @returns {Promise<Array>} Monthly Data Points
 */
export async function getMonthlyRevenueData(userId, months = 6) {
  try {
    const { data, error } = await supabase.rpc('get_monthly_revenue_data', {
      p_user_id: userId,
      p_workspace_id: null,
      p_months: months,
    });

    if (error) throw new FinanceError('Monatsdaten konnten nicht geladen werden', 'RPC_ERROR', error);
    
    return data || [];
  } catch (err) {
    console.error('getMonthlyRevenueData error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ GET CATEGORY BREAKDOWN ============

/**
 * Holt Kategorien-Aufschlüsselung
 * @param {string} userId - User ID
 * @param {string} [transactionType='income'] - 'income' oder 'expense'
 * @param {string} [fromDate] - Start-Datum
 * @param {string} [toDate] - End-Datum
 * @returns {Promise<Array>} Category Breakdown
 */
export async function getCategoryBreakdown(userId, transactionType = 'income', fromDate, toDate) {
  try {
    const { data, error } = await supabase.rpc('get_category_breakdown', {
      p_user_id: userId,
      p_workspace_id: null,
      p_transaction_type: transactionType,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) throw new FinanceError('Kategorien konnten nicht geladen werden', 'RPC_ERROR', error);
    
    return data || [];
  } catch (err) {
    console.error('getCategoryBreakdown error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ GET RECENT TRANSACTIONS ============

/**
 * Holt letzte Transaktionen
 * @param {string} userId - User ID
 * @param {Object} [options] - Optionen
 * @param {number} [options.limit=20] - Limit
 * @param {number} [options.offset=0] - Offset
 * @param {string} [options.type] - Transaktionstyp Filter
 * @returns {Promise<Array>} Transactions
 */
export async function getRecentTransactions(userId, options = {}) {
  const { limit = 20, offset = 0, type = null } = options;
  
  try {
    const { data, error } = await supabase.rpc('get_recent_transactions', {
      p_user_id: userId,
      p_workspace_id: null,
      p_limit: limit,
      p_offset: offset,
      p_transaction_type: type,
    });

    if (error) throw new FinanceError('Transaktionen konnten nicht geladen werden', 'RPC_ERROR', error);
    
    return data || [];
  } catch (err) {
    console.error('getRecentTransactions error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ CREATE TRANSACTION ============

/**
 * Erstellt eine neue Transaktion
 * @param {string} userId - User ID
 * @param {Object} input - Transaktions-Daten
 * @param {number} input.amount - Betrag
 * @param {string} input.transaction_type - 'income' oder 'expense'
 * @param {string} input.category - Kategorie
 * @param {string} input.title - Titel
 * @param {string} [input.transaction_date] - Datum
 * @param {string} [input.description] - Beschreibung
 * @param {string} [input.counterparty_name] - Gegenpartei
 * @returns {Promise<string>} Transaction ID
 */
export async function createTransaction(userId, input) {
  try {
    const { data, error } = await supabase.rpc('create_finance_transaction', {
      p_user_id: userId,
      p_workspace_id: null,
      p_amount: input.amount,
      p_transaction_type: input.transaction_type,
      p_category: input.category,
      p_title: input.title,
      p_transaction_date: input.transaction_date || new Date().toISOString().split('T')[0],
      p_description: input.description || null,
      p_counterparty_name: input.counterparty_name || null,
      p_vat_amount: input.vat_amount || 0,
      p_document_url: input.document_url || null,
      p_source: 'manual',
    });

    if (error) throw new FinanceError('Transaktion konnte nicht erstellt werden', 'RPC_ERROR', error);
    
    return data;
  } catch (err) {
    console.error('createTransaction error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ DELETE TRANSACTION ============

/**
 * Löscht eine Transaktion (soft delete via status)
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteTransaction(transactionId) {
  try {
    const { error } = await supabase
      .from('finance_transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId);

    if (error) throw new FinanceError('Transaktion konnte nicht gelöscht werden', 'DELETE_ERROR', error);
    
    return true;
  } catch (err) {
    console.error('deleteTransaction error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ SET MONTHLY GOAL ============

/**
 * Setzt das Monatsumsatzziel
 * @param {string} userId - User ID
 * @param {number} targetAmount - Zielbetrag
 * @param {number} [month] - Monat (1-12)
 * @param {number} [year] - Jahr
 * @returns {Promise<string>} Goal ID
 */
export async function setMonthlyGoal(userId, targetAmount, month, year) {
  try {
    const now = new Date();
    const { data, error } = await supabase.rpc('set_monthly_goal', {
      p_user_id: userId,
      p_workspace_id: null,
      p_target_amount: targetAmount,
      p_month: month || now.getMonth() + 1,
      p_year: year || now.getFullYear(),
    });

    if (error) throw new FinanceError('Ziel konnte nicht gesetzt werden', 'RPC_ERROR', error);
    
    return data;
  } catch (err) {
    console.error('setMonthlyGoal error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ GET CURRENT GOAL ============

/**
 * Holt das aktuelle Monatsziel
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Goal oder null
 */
export async function getCurrentGoal(userId) {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('finance_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_type', 'monthly_revenue')
      .eq('period_year', now.getFullYear())
      .eq('period_month', now.getMonth() + 1)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new FinanceError('Ziel konnte nicht geladen werden', 'QUERY_ERROR', error);
    }
    
    return data;
  } catch (err) {
    console.error('getCurrentGoal error:', err);
    return null;
  }
}

// ============ TAX PREP FUNCTIONS ============

/**
 * Holt Tax Prep Export für ein Jahr
 * @param {string} userId - User ID
 * @param {number} year - Jahr
 * @returns {Promise<Object>} Tax Prep Summary
 */
export async function getTaxPrepExport(userId, year) {
  try {
    const { data, error } = await supabase.rpc('generate_tax_prep_summary', {
      p_user_id: userId,
      p_year: year,
    });

    if (error) throw new FinanceError('Tax Prep Export konnte nicht geladen werden', 'RPC_ERROR', error);
    
    return data;
  } catch (err) {
    console.error('getTaxPrepExport error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

/**
 * Berechnet Steuer-Reserve (KEINE Steuerberatung!)
 * @param {string} userId - User ID
 * @param {number} year - Jahr
 * @returns {Promise<Object>} Tax Reserve Schätzung
 */
export async function calculateTaxReserve(userId, year) {
  try {
    const { data, error } = await supabase.rpc('calculate_tax_reserve', {
      p_user_id: userId,
      p_year: year,
    });

    if (error) throw new FinanceError('Steuer-Reserve konnte nicht berechnet werden', 'RPC_ERROR', error);
    
    return data?.[0] || null;
  } catch (err) {
    console.error('calculateTaxReserve error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ MILEAGE FUNCTIONS ============

/**
 * Fügt einen Fahrtenbuch-Eintrag hinzu
 * @param {string} userId - User ID
 * @param {Object} entry - Fahrt-Daten
 * @returns {Promise<Object>} Erstellter Eintrag
 */
export async function addMileageEntry(userId, entry) {
  try {
    const { data, error } = await supabase
      .from('finance_mileage_log')
      .insert({
        user_id: userId,
        date: entry.date,
        start_location: entry.start_location,
        end_location: entry.end_location,
        distance_km: entry.distance_km,
        purpose: entry.purpose,
        purpose_category: entry.purpose_category,
        rate_per_km: entry.rate_per_km || 0.42,
        vehicle_type: entry.vehicle_type || 'car',
        is_round_trip: entry.is_round_trip || false,
      })
      .select()
      .single();

    if (error) throw new FinanceError('Fahrt konnte nicht eingetragen werden', 'INSERT_ERROR', error);
    
    return data;
  } catch (err) {
    console.error('addMileageEntry error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

/**
 * Holt Fahrtenbuch-Einträge
 * @param {string} userId - User ID
 * @param {Object} [options] - Optionen
 * @returns {Promise<Array>} Einträge
 */
export async function getMileageEntries(userId, options = {}) {
  const { fromDate, toDate, limit = 100, offset = 0 } = options;
  
  try {
    let query = supabase
      .from('finance_mileage_log')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (fromDate) query = query.gte('date', fromDate);
    if (toDate) query = query.lte('date', toDate);

    const { data, error } = await query;

    if (error) throw new FinanceError('Fahrten konnten nicht geladen werden', 'QUERY_ERROR', error);
    
    return data || [];
  } catch (err) {
    console.error('getMileageEntries error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

/**
 * Holt Fahrtenbuch-Zusammenfassung
 * @param {string} userId - User ID
 * @param {number} year - Jahr
 * @returns {Promise<Object>} Zusammenfassung
 */
export async function getMileageSummary(userId, year) {
  try {
    const { data, error } = await supabase
      .from('finance_mileage_log')
      .select('distance_km, total_amount, purpose_category')
      .eq('user_id', userId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    if (error) throw new FinanceError('Fahrtenbuch-Zusammenfassung konnte nicht geladen werden', 'QUERY_ERROR', error);
    
    const totalKm = (data || []).reduce((sum, e) => sum + (e.distance_km || 0), 0);
    const totalAmount = (data || []).reduce((sum, e) => sum + (e.total_amount || 0), 0);
    
    return {
      year,
      total_km: totalKm,
      total_amount: totalAmount,
      trips_count: (data || []).length,
    };
  } catch (err) {
    console.error('getMileageSummary error:', err);
    throw err instanceof FinanceError ? err : new FinanceError(err.message, 'UNKNOWN', err);
  }
}

// ============ EXPORT ============

export default {
  getFinanceSummary,
  getMonthlyRevenueData,
  getCategoryBreakdown,
  getRecentTransactions,
  createTransaction,
  deleteTransaction,
  setMonthlyGoal,
  getCurrentGoal,
  // Tax Prep
  getTaxPrepExport,
  calculateTaxReserve,
  // Mileage
  addMileageEntry,
  getMileageEntries,
  getMileageSummary,
  FinanceError,
};

