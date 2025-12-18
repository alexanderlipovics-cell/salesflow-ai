# 📊 Analytics Dashboard - Setup Guide

## ✅ COMPLETED IMPLEMENTATION

All files have been created and are ready to use!

### Files Created:

**Frontend (React/TypeScript):**
```
src/
├── types/
│   └── analytics-dashboard.ts ✅
├── hooks/
│   └── useAnalyticsDashboard.ts ✅
├── components/analytics/
│   ├── TemplateWinnersChart.tsx ✅
│   ├── SegmentPerformanceChart.tsx ✅
│   ├── BestSendTimeChart.tsx ✅
│   ├── TopNetworkersTable.tsx ✅
│   └── KPICard.tsx ✅
└── pages/
    └── AnalyticsDashboard.tsx ✅
```

**Backend (Python/FastAPI):**
```
backend/app/api/
└── analytics_dashboard.py ✅ (Aggregated endpoint)
```

---

## 🚀 INSTALLATION STEPS

### Step 1: Install Dependencies

```bash
# Frontend - Install Recharts for charts
cd salesflow-ai
npm install recharts

# Or with yarn
yarn add recharts
```

### Step 2: Register Backend Endpoint

Add to `backend/app/main.py`:

```python
# Import the analytics dashboard router
from app.api import analytics_dashboard

# Include the router
app.include_router(analytics_dashboard.router)
```

### Step 3: Add Route to Frontend

Add to your router configuration (e.g., `App.jsx` or router file):

```jsx
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';

// Add route
<Route path="/analytics-dashboard" element={<AnalyticsDashboard />} />
```

### Step 4: Add Navigation Link

Add to your sidebar/navigation:

```jsx
<Link to="/analytics-dashboard">
  📊 Analytics Dashboard
</Link>
```

---

## 🧪 TESTING

### 1. Test Backend Endpoint

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test endpoint
curl http://localhost:8000/api/analytics/dashboard

# Or visit Swagger docs
# http://localhost:8000/docs
```

### 2. Test Frontend

```bash
# Start frontend
cd salesflow-ai
npm run dev

# Visit dashboard
# http://localhost:5173/analytics-dashboard
```

---

## 📋 FEATURES

### Dashboard Includes:

1. **🏆 Template Winners** - Top 5 performing templates
2. **🎯 Segment Performance** - Leads & conversions by segment
3. **⏰ Best Send Times** - Optimal hours for messaging
4. **👻 Ghosted Stages** - Leads needing attention
5. **📱 Channel Reply Rates** - Performance by channel
6. **⚡ Company Funnel Speed** - Average days to convert
7. **🔥 Top Networkers** - Team leaderboard
8. **🏢 Company Conversions** - Conversion rates by company
9. **📞 KPIs** - Key metrics at a glance
10. **📊 Export** - CSV export functionality

### Interactive Features:

- ✅ Auto-refresh (5 min intervals)
- ✅ Manual refresh button
- ✅ CSV export
- ✅ Dark mode support
- ✅ Responsive design (mobile-friendly)
- ✅ Loading states
- ✅ Error handling

---

## 🎨 CUSTOMIZATION

### Change Colors

Edit color constants in chart components:

```tsx
// TemplateWinnersChart.tsx
const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];
```

### Adjust Refresh Interval

Edit in `useAnalyticsDashboard.ts`:

```tsx
// Change 5 minutes to desired interval
const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
```

### Add Company Filter

Already supported! Pass company ID:

```tsx
const [selectedCompany, setSelectedCompany] = useState<string>();
const { data } = useAnalyticsDashboard(selectedCompany);
```

---

## 🐛 TROUBLESHOOTING

### Issue: Charts not displaying

**Solution:** Install recharts
```bash
npm install recharts
```

### Issue: Backend endpoint not found

**Solution:** Register router in `main.py`:
```python
from app.api import analytics_dashboard
app.include_router(analytics_dashboard.router)
```

### Issue: No data showing

**Solution:** Ensure all 10 SQL functions exist in Supabase:
- `get_top_templates_by_conversions`
- `get_segment_conversion_rates`
- `get_avg_days_to_partner`
- `get_channel_reply_rates`
- `get_best_send_times`
- `get_avg_touches_until_partner`
- `get_ghosted_leads_by_stage`
- `get_top_networkers`
- `get_company_conversion_rates`
- `get_template_performance_by_segment`

### Issue: CORS errors

**Solution:** Add frontend URL to CORS in `backend/app/main.py`:
```python
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    # Your production URL
]
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Environment Variables

```bash
# Frontend (.env)
VITE_API_BASE_URL=https://your-backend.com

# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Build Commands

```bash
# Frontend
cd salesflow-ai
npm run build
# Outputs to: dist/

# Backend
cd backend
# Deploy with: gunicorn, uvicorn, or Docker
```

---

## 📊 DATA REQUIREMENTS

### Minimum Data for Dashboard:

- ✅ At least 1 message template
- ✅ At least 1 lead with status history
- ✅ At least 1 message sent
- ✅ Lead segments defined
- ✅ User activity tracked

### Recommended for Full Experience:

- ✅ 30+ days of data
- ✅ 100+ leads
- ✅ 500+ messages
- ✅ 5+ team members
- ✅ Multiple segments

---

## 🎯 NEXT STEPS

1. **Install Dependencies** ✅
   ```bash
   npm install recharts
   ```

2. **Register Backend Router** ✅
   - Add to `backend/app/main.py`

3. **Add Frontend Route** ✅
   - Add to router configuration

4. **Test Locally** ✅
   - Start backend & frontend
   - Visit dashboard

5. **Deploy to Production** 🚀
   - Build & deploy both services

---

## 💡 TIPS

- **Performance:** Dashboard loads all queries in parallel (~1-2s)
- **Caching:** Consider adding Redis for 5min cache
- **Real-time:** Enable auto-refresh for live updates
- **Mobile:** Dashboard is fully responsive
- **Export:** Use CSV export for reports

---

## ✅ CHECKLIST

- [ ] Recharts installed
- [ ] Backend router registered
- [ ] Frontend route added
- [ ] Navigation link added
- [ ] Backend running
- [ ] Frontend running
- [ ] Dashboard accessible
- [ ] All charts rendering
- [ ] Export works
- [ ] Dark mode works
- [ ] Mobile responsive

---

**🎉 Your Analytics Dashboard is Ready!**

Access it at: `http://localhost:5173/analytics-dashboard`

