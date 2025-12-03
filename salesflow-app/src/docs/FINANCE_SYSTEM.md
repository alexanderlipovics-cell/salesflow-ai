# 💰 Sales Flow AI - Finance System

> **Technische Dokumentation** | Version 1.0  
> Finanz-Tracking für MLM-Vertriebsmitarbeiter

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#-überblick)
2. [Features](#-features)
3. [Architektur](#-architektur)
4. [Datenbank](#-datenbank)
5. [Frontend](#-frontend)
6. [API Reference](#-api-reference)
7. [Extending](#-extending)

---

## 🎯 Überblick

Das **Finance System** ermöglicht Vertriebsmitarbeitern:

- ✅ **Einnahmen tracken**: Provisionen, Team-Boni, Rang-Boni
- ✅ **Ausgaben erfassen**: Marketing, Tools, Reisen
- ✅ **Ziele setzen**: Monatliche Umsatzziele mit Fortschrittsanzeige
- ✅ **Analytics**: Charts für 6-Monats-Trend und Kategorien-Aufschlüsselung
- ✅ **Transaktionsliste**: Alle Buchungen mit Filter

---

## ✨ Features

### KPI Dashboard

```
┌──────────────┐ ┌──────────────┐
│ 📈 Einnahmen │ │ 📉 Ausgaben  │
│   €3.240     │ │   €680       │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ 💰 Gewinn    │ │ 📊 Marge     │
│   €2.560     │ │   79.0%      │
└──────────────┘ └──────────────┘
```

### Monatsziel mit Fortschritt

```
🎯 Monatsziel                    €5.000
████████████░░░░░░░░  €3.240 (64.8%)
```

### 6-Monats-Trend

```
📈 Umsatz (6 Monate)
│                              ╭───
│                         ╭───╯
│                    ╭───╯
│               ╭───╯
│          ╭───╯
│     ╭───╯
└─────────────────────────────────
  Jul  Aug  Sep  Oct  Nov  Dec
```

### Kategorien-Aufschlüsselung

| Kategorie | Betrag | Anteil |
|-----------|--------|--------|
| 💰 Provisionen | €1.840 | 56.8% |
| 👥 Team-Bonus | €680 | 21.0% |
| 🏆 Rang-Bonus | €520 | 16.0% |
| 📥 Sonstiges | €200 | 6.2% |

---

## 🏗 Architektur

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
├─────────────────────────────────────────────────────┤
│  FinanceOverviewScreen.js                           │
│    ├── KpiSection (4 KPI Cards)                     │
│    ├── GoalProgressCard                             │
│    ├── RevenueSection (Bar Chart)                   │
│    ├── CategoryBreakdownSection                     │
│    ├── TransactionsList                             │
│    ├── AddTransactionModal                          │
│    └── GoalModal                                    │
├─────────────────────────────────────────────────────┤
│  hooks/useFinance.js                                │
│    ├── summary, monthlyData, breakdowns             │
│    ├── transactions, isLoading, error               │
│    └── addTransaction, updateGoal                   │
├─────────────────────────────────────────────────────┤
│  services/financeService.js                         │
│    ├── getFinanceSummary()                          │
│    ├── getMonthlyRevenueData()                      │
│    ├── getCategoryBreakdown()                       │
│    ├── getRecentTransactions()                      │
│    ├── createTransaction()                          │
│    └── setMonthlyGoal()                             │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    DATABASE                          │
├─────────────────────────────────────────────────────┤
│  finance_transactions                                │
│    ├── id, user_id, amount                          │
│    ├── transaction_type (income/expense)            │
│    ├── category, title, description                 │
│    └── transaction_date, status                     │
├─────────────────────────────────────────────────────┤
│  finance_goals                                       │
│    ├── id, user_id, goal_type                       │
│    ├── target_amount, period_month/year             │
│    └── is_active, achieved_at                       │
├─────────────────────────────────────────────────────┤
│  RPC Functions                                       │
│    ├── get_finance_summary()                        │
│    ├── get_monthly_revenue_data()                   │
│    ├── get_category_breakdown()                     │
│    ├── get_recent_transactions()                    │
│    ├── create_finance_transaction()                 │
│    └── set_monthly_goal()                           │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Datenbank

### Tabellen

#### `finance_transactions`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | Besitzer |
| `amount` | NUMERIC(12,2) | Betrag |
| `transaction_type` | TEXT | `income` oder `expense` |
| `category` | ENUM | Kategorie |
| `title` | TEXT | Titel |
| `transaction_date` | DATE | Buchungsdatum |
| `status` | TEXT | `pending`, `confirmed`, `cancelled` |

#### `finance_goals`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | Besitzer |
| `goal_type` | TEXT | z.B. `monthly_revenue` |
| `target_amount` | NUMERIC(12,2) | Zielbetrag |
| `period_month` | INTEGER | Monat (1-12) |
| `period_year` | INTEGER | Jahr |
| `is_active` | BOOLEAN | Aktiv? |

### Kategorien

**Einnahmen:**
- `commission` - Provisionen
- `team_bonus` - Team-Bonus
- `rank_bonus` - Rang-Bonus
- `fast_start` - Fast-Start-Bonus
- `leadership` - Leadership-Bonus
- `other_income` - Sonstiges

**Ausgaben:**
- `product_purchase` - Produktkäufe
- `marketing` - Marketing/Ads
- `tools` - Tools & Software
- `travel` - Reisen & Events
- `other_expense` - Sonstiges

---

## 📱 Frontend

### Screen: `FinanceOverviewScreen.js`

```javascript
import { useFinance } from '../../hooks/useFinance';

export default function FinanceOverviewScreen() {
  const { user } = useAuth();
  const {
    summary,
    monthlyData,
    incomeBreakdown,
    transactions,
    addTransaction,
    updateGoal,
  } = useFinance(user?.id);
  
  // ...
}
```

### Hook: `useFinance`

```javascript
const {
  // Data
  summary,           // { summary: { income_total, expense_total, profit, ... }}
  monthlyData,       // [{ month, income, expenses, profit }]
  incomeBreakdown,   // [{ category, total, percentage, color }]
  expenseBreakdown,
  transactions,      // [{ id, title, amount, category, ... }]
  
  // State
  isLoading,
  error,
  
  // Actions
  refetch,
  addTransaction,
  updateGoal,
  loadMoreTransactions,
  
  // Filter
  transactionFilter,
  setTransactionFilter,
} = useFinance(userId);
```

---

## 🌐 API Reference

### `get_finance_summary`

Berechnet Einnahmen, Ausgaben, Gewinn für einen Zeitraum.

```javascript
const { data } = await supabase.rpc('get_finance_summary', {
  p_user_id: userId,
  p_from_date: '2024-12-01',
  p_to_date: '2024-12-31'
});

// Response:
{
  period: { from: '2024-12-01', to: '2024-12-31' },
  summary: {
    income_total: 3240.00,
    expense_total: 680.00,
    profit: 2560.00,
    profit_margin: 0.79,
    goal_amount: 5000,
    goal_progress: 0.648
  }
}
```

### `get_monthly_revenue_data`

Monatliche Umsätze für Charts.

```javascript
const { data } = await supabase.rpc('get_monthly_revenue_data', {
  p_user_id: userId,
  p_months: 6
});

// Response:
[
  { month: '2024-07', month_label: 'Jul', income: 2100, expenses: 450, profit: 1650 },
  { month: '2024-08', month_label: 'Aug', income: 2400, expenses: 520, profit: 1880 },
  // ...
]
```

### `create_finance_transaction`

Neue Buchung erstellen.

```javascript
const id = await supabase.rpc('create_finance_transaction', {
  p_user_id: userId,
  p_amount: 150,
  p_transaction_type: 'income',
  p_category: 'commission',
  p_title: 'Provision Max Mustermann'
});
```

---

## 🔧 Extending this Module

### Neue Kategorie hinzufügen

1. **Enum erweitern** (SQL):

```sql
ALTER TYPE transaction_category ADD VALUE 'new_category';
```

2. **CATEGORY_META aktualisieren** (JavaScript):

```javascript
// types/finance.js
export const CATEGORY_META = {
  // ...
  new_category: { 
    label: 'Neue Kategorie', 
    emoji: '🆕', 
    color: '#3B82F6', 
    type: 'income' 
  },
};
```

3. **RPC-Funktionen aktualisieren** (Label + Farbe in get_category_breakdown)

### Währungen hinzufügen

```javascript
// Unterstützte Währungen erweitern
export const CURRENCIES = ['EUR', 'USD', 'CHF', 'GBP'];

// formatMoney anpassen
export function formatMoney(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}
```

### Export-Funktionen

```javascript
// CSV Export
export async function exportTransactionsCSV(userId, fromDate, toDate) {
  const transactions = await getRecentTransactions(userId, { limit: 1000 });
  
  const csv = transactions.map(t => 
    `${t.transaction_date},${t.category},${t.title},${t.amount}`
  ).join('\n');
  
  return 'Datum,Kategorie,Titel,Betrag\n' + csv;
}
```

### Recurring Transactions

```sql
-- Tabelle für wiederkehrende Buchungen
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  template_data JSONB NOT NULL,
  frequency TEXT CHECK (frequency IN ('monthly', 'weekly', 'yearly')),
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Cron Job zum Erstellen
SELECT cron.schedule('process-recurring', '0 6 * * *', 
  'SELECT process_recurring_transactions()');
```

---

## 📅 Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2024-12 | Initial Release: KPIs, Goals, Charts, Transactions |

---

## 🔗 Verwandte Dokumentation

- [LEADS.md](./LEADS.md) - Lead-Management
- [DAILY_FLOW_SYSTEM.md](./DAILY_FLOW_SYSTEM.md) - Daily Goals
- [SUPABASE_SERVICE.md](./SUPABASE_SERVICE.md) - Datenbank

---

> **Sales Flow AI** | Finance System | Einnahmen & Ausgaben Tracking

