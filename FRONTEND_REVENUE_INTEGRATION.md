# 💰 Frontend Integration Guide - Revenue Intelligence

**Status:** Ready for Implementation ✅

---

## 📋 Overview

Dieser Guide zeigt, wie du die Revenue Intelligence Endpoints im Sales Flow AI Frontend integrierst.

---

## 🎯 Use Cases & Pages

### 1. **Revenue Dashboard Page** 📊
**Route:** `/revenue/dashboard`

**Zeigt:**
- Total Pipeline Value
- Weighted Forecast (90 Tage)
- Pipeline by Stage (Chart)
- Monthly Forecast (Chart)
- At-Risk Deals Count

**API Call:**
```typescript
// src/services/revenueService.ts
export async function getRevenueDashboard() {
  const response = await fetch('http://localhost:8000/api/revenue/dashboard');
  return response.json();
}
```

**Response:**
```json
{
  "kpis": {
    "total_pipeline": 450000.00,
    "deal_count": 30,
    "avg_deal_size": 15000.00,
    "weighted_forecast_90d": 135000.00,
    "at_risk_deals": 5
  },
  "pipeline_by_stage": [...],
  "monthly_forecast": [...]
}
```

**React Component:**
```tsx
// src/pages/RevenueDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { getRevenueDashboard } from '@/services/revenueService';

export function RevenueDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-dashboard'],
    queryFn: getRevenueDashboard
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          title="Pipeline Value" 
          value={`€${data.kpis.total_pipeline.toLocaleString()}`}
          icon={<TrendingUp />}
        />
        <KPICard 
          title="90d Forecast" 
          value={`€${data.kpis.weighted_forecast_90d.toLocaleString()}`}
          icon={<Target />}
        />
        <KPICard 
          title="Deals" 
          value={data.kpis.deal_count}
          icon={<Briefcase />}
        />
        <KPICard 
          title="At Risk" 
          value={data.kpis.at_risk_deals}
          icon={<AlertTriangle />}
          variant="warning"
        />
      </div>

      {/* Pipeline Chart */}
      <PipelineChart data={data.pipeline_by_stage} />

      {/* Forecast Chart */}
      <ForecastChart data={data.monthly_forecast} />
    </div>
  );
}
```

---

### 2. **At-Risk Deals Alert Widget** ⚠️
**Placement:** Dashboard Sidebar oder Top Bar

**API Call:**
```typescript
export async function getAtRiskDeals(minDealValue = 5000) {
  const response = await fetch(
    `http://localhost:8000/api/revenue/alerts/at-risk?min_deal_value=${minDealValue}`
  );
  return response.json();
}
```

**Component:**
```tsx
// src/components/revenue/AtRiskDealsWidget.tsx
export function AtRiskDealsWidget() {
  const { data } = useQuery({
    queryKey: ['at-risk-deals'],
    queryFn: () => getAtRiskDeals(5000),
    refetchInterval: 60000 // Refresh every minute
  });

  if (!data?.deals.length) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <AlertTriangle className="text-red-500" />
        <h3 className="text-lg font-semibold">
          {data.count} Deals Need Attention
        </h3>
      </CardHeader>
      <CardContent>
        {data.deals.slice(0, 3).map(deal => (
          <AtRiskDealCard 
            key={deal.id}
            deal={deal}
          />
        ))}
        <Link to="/revenue/at-risk">View All →</Link>
      </CardContent>
    </Card>
  );
}

function AtRiskDealCard({ deal }) {
  const healthColor = deal.health_analysis.health_score < 40 
    ? 'text-red-500' 
    : 'text-yellow-500';

  return (
    <div className="p-3 border-b last:border-0">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{deal.company}</h4>
          <p className="text-sm text-gray-500">{deal.name}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">€{deal.deal_value.toLocaleString()}</p>
          <p className={`text-sm ${healthColor}`}>
            Health: {deal.health_analysis.health_score}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {deal.health_analysis.risk_factors.map(factor => (
          <Badge key={factor} variant="destructive" size="sm">
            {factor}
          </Badge>
        ))}
      </div>
    </div>
  );
}
```

---

### 3. **Deal Details Page - Financial Section** 💵
**Route:** `/leads/:id`

**Add Section:**
```tsx
// src/components/leads/DealFinancials.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function DealFinancials({ leadId, initialData }) {
  const queryClient = useQueryClient();
  
  const updateDeal = useMutation({
    mutationFn: async (updates) => {
      const response = await fetch(
        `http://localhost:8000/api/revenue/deals/${leadId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lead', leadId]);
      queryClient.invalidateQueries(['revenue-dashboard']);
    }
  });

  const handleSave = (values) => {
    updateDeal.mutate({
      deal_value: parseFloat(values.dealValue),
      expected_close_date: values.closeDate,
      win_probability: parseInt(values.winProb),
      deal_stage: values.stage
    });
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Deal Financials</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSave)}>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Deal Value"
              type="number"
              name="dealValue"
              prefix="€"
              defaultValue={initialData.deal_value}
            />
            <FormField
              label="Expected Close Date"
              type="date"
              name="closeDate"
              defaultValue={initialData.expected_close_date}
            />
            <FormField
              label="Win Probability"
              type="number"
              name="winProb"
              suffix="%"
              min="0"
              max="100"
              defaultValue={initialData.win_probability}
            />
            <FormField
              label="Stage"
              type="select"
              name="stage"
              options={[
                { value: 'discovery', label: 'Discovery' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'proposal', label: 'Proposal' },
                { value: 'negotiation', label: 'Negotiation' }
              ]}
              defaultValue={initialData.deal_stage}
            />
          </div>
          <Button type="submit" disabled={updateDeal.isLoading}>
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

### 4. **Scenario Calculator Tool** 🔮
**Route:** `/revenue/scenarios`

**API Call:**
```typescript
export async function calculateScenario(inputs) {
  const response = await fetch(
    'http://localhost:8000/api/revenue/scenario-calculator',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    }
  );
  return response.json();
}
```

**Component:**
```tsx
// src/pages/ScenarioCalculator.tsx
export function ScenarioCalculator() {
  const [scenario, setScenario] = useState({
    win_rate_increase: 0,
    deal_size_increase: 0,
    pipeline_growth: 0
  });

  const { data, refetch } = useQuery({
    queryKey: ['scenario', scenario],
    queryFn: () => calculateScenario(scenario),
    enabled: false // Manual trigger
  });

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">What-If Scenario Calculator</h2>
          <p className="text-gray-500">
            Simulate revenue impact of changes in win rate, deal size, and pipeline
          </p>
        </CardHeader>
        <CardContent>
          {/* Sliders */}
          <div className="space-y-6">
            <SliderField
              label="Win Rate Change"
              value={scenario.win_rate_increase * 100}
              onChange={(val) => setScenario(s => ({
                ...s, 
                win_rate_increase: val / 100
              }))}
              min={-50}
              max={50}
              step={5}
              suffix="%"
            />
            <SliderField
              label="Deal Size Change"
              value={scenario.deal_size_increase * 100}
              onChange={(val) => setScenario(s => ({
                ...s, 
                deal_size_increase: val / 100
              }))}
              min={-50}
              max={50}
              step={5}
              suffix="%"
            />
            <SliderField
              label="Pipeline Growth"
              value={scenario.pipeline_growth * 100}
              onChange={(val) => setScenario(s => ({
                ...s, 
                pipeline_growth: val / 100
              }))}
              min={-50}
              max={50}
              step={5}
              suffix="%"
            />
          </div>

          <Button onClick={() => refetch()} className="mt-6">
            Calculate Impact
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Projected Impact</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <MetricCard
                label="Current Forecast"
                value={`€${data.baseline.forecast.toLocaleString()}`}
              />
              <MetricCard
                label="Projected Forecast"
                value={`€${data.projected.forecast.toLocaleString()}`}
              />
              <MetricCard
                label="Delta"
                value={`€${data.delta.value.toLocaleString()}`}
                change={`${data.delta.percent > 0 ? '+' : ''}${data.delta.percent}%`}
                positive={data.delta.value > 0}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### 5. **Deal Value Predictor Modal** 🤖
**Usage:** In "Create Deal" Flow

**API Call:**
```typescript
export async function predictDealValue(inputs) {
  const response = await fetch(
    'http://localhost:8000/api/revenue/predict/deal-value',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    }
  );
  return response.json();
}
```

**Component:**
```tsx
// src/components/revenue/DealValuePredictor.tsx
export function DealValuePredictor({ onValueSet }) {
  const [inputs, setInputs] = useState({
    product_plan: 'Professional',
    num_users_planned: 10,
    base_list_price_per_user: 29,
    discount_pct: 0,
    billing_cycle: 'annual',
    contract_term_months: 12,
    industry: 'tech',
    deal_stage: 'discovery',
    similar_closed_deals_avg_acv: 0,
    expansion_potential_factor: 1.0
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['predict-deal-value', inputs],
    queryFn: () => predictDealValue(inputs),
    enabled: false
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2" /> AI Predict Value
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Deal Value Prediction</DialogTitle>
          <DialogDescription>
            Let AI estimate the deal value based on product, users, and context
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Form */}
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Product Plan"
              value={inputs.product_plan}
              onChange={(val) => setInputs(s => ({ ...s, product_plan: val }))}
              options={['Starter', 'Professional', 'Enterprise']}
            />
            <NumberField
              label="Number of Users"
              value={inputs.num_users_planned}
              onChange={(val) => setInputs(s => ({ ...s, num_users_planned: val }))}
              min={1}
            />
            <NumberField
              label="Price per User (€)"
              value={inputs.base_list_price_per_user}
              onChange={(val) => setInputs(s => ({ ...s, base_list_price_per_user: val }))}
            />
            <NumberField
              label="Discount (%)"
              value={inputs.discount_pct * 100}
              onChange={(val) => setInputs(s => ({ ...s, discount_pct: val / 100 }))}
              max={100}
            />
          </div>

          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Calculating...' : 'Predict Value'}
          </Button>

          {/* Result */}
          {data && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Predicted Deal Value</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    €{data.predicted_deal_value.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Confidence: {data.confidence_score}%
                  </p>
                </div>
                <Button 
                  onClick={() => onValueSet(data.predicted_deal_value)}
                  variant="primary"
                >
                  Use This Value
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 6. **Close Probability Badge** 🎯
**Usage:** Anywhere a deal is displayed

**API Call:**
```typescript
export async function calculateCloseProbability(inputs) {
  const response = await fetch(
    'http://localhost:8000/api/revenue/predict/close-probability',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    }
  );
  return response.json();
}
```

**Component:**
```tsx
// src/components/revenue/CloseProbabilityBadge.tsx
export function CloseProbabilityBadge({ deal }) {
  const { data } = useQuery({
    queryKey: ['close-probability', deal.id],
    queryFn: () => calculateCloseProbability({
      deal_stage: deal.deal_stage,
      days_in_stage: deal.days_in_stage,
      lead_score: deal.score,
      num_interactions: deal.interaction_count || 0,
      num_objections_handled: deal.objections_handled || 0,
      champion_identified: deal.champion_identified || false,
      budget_confirmed: deal.budget_confirmed || false,
      decision_maker_engaged: deal.decision_maker_engaged || false,
      competitors_mentioned: deal.competitors_mentioned || 0
    })
  });

  if (!data) return <Skeleton className="h-6 w-16" />;

  const color = data.close_probability >= 70 
    ? 'bg-green-100 text-green-800'
    : data.close_probability >= 40
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800';

  return (
    <Tooltip content={`Key factors: ${data.key_factors.join(', ')}`}>
      <Badge className={color}>
        {data.close_probability}% Win
      </Badge>
    </Tooltip>
  );
}
```

---

## 🔧 Service Layer Setup

**Erstelle:** `src/services/revenueService.ts`

```typescript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const revenueService = {
  // Dashboard
  async getDashboard() {
    const res = await fetch(`${BASE_URL}/api/revenue/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
  },

  // At-Risk Deals
  async getAtRiskDeals(minDealValue = 1000) {
    const res = await fetch(
      `${BASE_URL}/api/revenue/alerts/at-risk?min_deal_value=${minDealValue}`
    );
    if (!res.ok) throw new Error('Failed to fetch at-risk deals');
    return res.json();
  },

  // Update Deal
  async updateDeal(leadId: string, updates: Partial<DealUpdate>) {
    const res = await fetch(`${BASE_URL}/api/revenue/deals/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update deal');
    return res.json();
  },

  // Scenario Calculator
  async calculateScenario(inputs: ScenarioInput) {
    const res = await fetch(`${BASE_URL}/api/revenue/scenario-calculator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) throw new Error('Failed to calculate scenario');
    return res.json();
  },

  // Predictions
  async predictDealValue(inputs: DealValuePredictionInput) {
    const res = await fetch(`${BASE_URL}/api/revenue/predict/deal-value`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) throw new Error('Failed to predict deal value');
    return res.json();
  },

  async calculateCloseProbability(inputs: CloseProbabilityInput) {
    const res = await fetch(`${BASE_URL}/api/revenue/predict/close-probability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) throw new Error('Failed to calculate probability');
    return res.json();
  },

  // Analytics
  async getMonthlyForecast(months = 6) {
    const res = await fetch(`${BASE_URL}/api/revenue/forecast/monthly?months=${months}`);
    if (!res.ok) throw new Error('Failed to fetch forecast');
    return res.json();
  },

  async getWonDealsSummary(months = 6) {
    const res = await fetch(`${BASE_URL}/api/revenue/won-deals/summary?months=${months}`);
    if (!res.ok) throw new Error('Failed to fetch won deals');
    return res.json();
  }
};

// TypeScript Types
export interface DealUpdate {
  deal_value?: number;
  expected_close_date?: string;
  win_probability?: number;
  deal_stage?: string;
  currency?: string;
}

export interface ScenarioInput {
  win_rate_increase: number;
  deal_size_increase: number;
  pipeline_growth: number;
}

// ... more types
```

---

## 🎨 UI Components Needed

### KPI Card
```tsx
// src/components/revenue/KPICard.tsx
export function KPICard({ title, value, icon, variant = 'default' }) {
  const variants = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200'
  };

  return (
    <Card className={variants[variant]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📱 Routing Setup

```tsx
// src/App.tsx (oder routes config)
const routes = [
  // ... existing routes

  // Revenue Intelligence Routes
  {
    path: '/revenue',
    element: <RevenueLayout />,
    children: [
      { path: 'dashboard', element: <RevenueDashboard /> },
      { path: 'at-risk', element: <AtRiskDealsPage /> },
      { path: 'scenarios', element: <ScenarioCalculator /> },
      { path: 'forecast', element: <ForecastPage /> }
    ]
  }
];
```

---

## 🔐 Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Quick Start Checklist

- [ ] Create `revenueService.ts` with all API calls
- [ ] Add Revenue Dashboard page
- [ ] Add At-Risk Deals widget to main dashboard
- [ ] Extend Lead Detail page with Financial section
- [ ] Create Scenario Calculator page
- [ ] Add Close Probability badges to deal cards
- [ ] Create Deal Value Predictor modal
- [ ] Add routes to App
- [ ] Test all endpoints
- [ ] Add error handling & loading states

---

## 💡 Tips

1. **Use React Query** for caching and auto-refresh
2. **Add Optimistic Updates** for deal updates
3. **Show Loading Skeletons** for better UX
4. **Error Boundaries** for robustness
5. **Responsive Design** for mobile
6. **Dark Mode Support** if your app has it

---

**Questions?** Check `/docs` or test endpoints in Swagger UI!

**Built with:** React, TypeScript, TanStack Query
**Backend:** FastAPI, Supabase
**Date:** November 2025

