/**
 * Sales Flow AI - useFinance Hook
 * State Management für das Finance Overview System
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getFinanceSummary,
  getMonthlyRevenueData,
  getCategoryBreakdown,
  getRecentTransactions,
  createTransaction,
  setMonthlyGoal,
  FinanceError,
} from '../services/financeService';

/**
 * React Hook für Finance-Daten
 * @param {string|null} userId - User ID
 * @param {Object} [options] - Optionen
 * @param {boolean} [options.autoRefresh=false] - Automatisch aktualisieren
 * @param {number} [options.refreshInterval=60000] - Refresh-Intervall in ms
 * @returns {Object} Finance State & Actions
 */
export function useFinance(userId, options = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  // State
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState(null);
  const [transactionOffset, setTransactionOffset] = useState(0);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.all([
        getFinanceSummary(userId).catch(e => {
          console.warn('Summary error:', e);
          return null;
        }),
        getMonthlyRevenueData(userId, 6).catch(e => {
          console.warn('Monthly data error:', e);
          return [];
        }),
        getCategoryBreakdown(userId, 'income').catch(e => {
          console.warn('Income breakdown error:', e);
          return [];
        }),
        getCategoryBreakdown(userId, 'expense').catch(e => {
          console.warn('Expense breakdown error:', e);
          return [];
        }),
        getRecentTransactions(userId, { 
          limit: 20, 
          type: transactionFilter 
        }).catch(e => {
          console.warn('Transactions error:', e);
          return [];
        }),
      ]);

      const [summaryData, monthly, incomeData, expenseData, txns] = results;

      setSummary(summaryData);
      setMonthlyData(monthly);
      setIncomeBreakdown(incomeData);
      setExpenseBreakdown(expenseData);
      setTransactions(txns);
      setTransactionOffset(20);
    } catch (err) {
      console.error('useFinance fetchData error:', err);
      setError(
        err instanceof FinanceError
          ? err
          : new FinanceError('Daten konnten nicht geladen werden', 'FETCH_ERROR', err)
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, transactionFilter]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !userId) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData, userId]);

  // Refetch when filter changes
  useEffect(() => {
    if (userId) {
      getRecentTransactions(userId, { 
        limit: 20, 
        type: transactionFilter 
      })
        .then(txns => {
          setTransactions(txns);
          setTransactionOffset(20);
        })
        .catch(console.error);
    }
  }, [userId, transactionFilter]);

  // Load more transactions
  const loadMoreTransactions = useCallback(async () => {
    if (!userId) return;

    try {
      const moreTxns = await getRecentTransactions(userId, {
        limit: 20,
        offset: transactionOffset,
        type: transactionFilter,
      });
      
      if (moreTxns.length > 0) {
        setTransactions(prev => [...prev, ...moreTxns]);
        setTransactionOffset(prev => prev + 20);
      }
      
      return moreTxns.length > 0;
    } catch (err) {
      console.error('Failed to load more transactions', err);
      return false;
    }
  }, [userId, transactionOffset, transactionFilter]);

  // Add transaction
  const addTransaction = useCallback(async (input) => {
    if (!userId) throw new Error('No user ID');

    const id = await createTransaction(userId, input);
    await fetchData();
    return id;
  }, [userId, fetchData]);

  // Update goal
  const updateGoal = useCallback(async (amount) => {
    if (!userId) throw new Error('No user ID');

    const id = await setMonthlyGoal(userId, amount);
    await fetchData();
    return id;
  }, [userId, fetchData]);

  return {
    // Data
    summary,
    monthlyData,
    incomeBreakdown,
    expenseBreakdown,
    transactions,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch: fetchData,
    addTransaction,
    updateGoal,
    loadMoreTransactions,
    
    // Filters
    transactionFilter,
    setTransactionFilter,
  };
}

/**
 * Hook für einzelne Transaktion
 * @param {string} transactionId - Transaction ID
 * @returns {Object} Transaction & Loading State
 */
export function useTransaction(transactionId) {
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transactionId) {
      setIsLoading(false);
      return;
    }

    // TODO: Implement getTransactionById
    setIsLoading(false);
  }, [transactionId]);

  return { transaction, isLoading, error };
}

/**
 * Hook für Finance KPIs (kompakt)
 * @param {string} userId - User ID
 * @returns {Object} KPIs
 */
export function useFinanceKPIs(userId) {
  const [kpis, setKpis] = useState({
    income: 0,
    expenses: 0,
    profit: 0,
    profitMargin: 0,
    goalProgress: 0,
    goalAmount: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    getFinanceSummary(userId)
      .then(data => {
        if (data?.summary) {
          setKpis({
            income: data.summary.income_total || 0,
            expenses: data.summary.expense_total || 0,
            profit: data.summary.profit || 0,
            profitMargin: data.summary.profit_margin || 0,
            goalProgress: data.summary.goal_progress || 0,
            goalAmount: data.summary.goal_amount,
          });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  return { kpis, isLoading };
}

export default useFinance;

