# PROMPT 5 – GEMINI 3 ULTRA
## Mobile-First Networker Dashboard & Daily Flow

---

## KONTEXT

SalesFlow AI fokussiert jetzt **100% auf Network Marketer im DACH-Raum**.

**Fakten:**
- Networker arbeiten zu 90% am Handy (WhatsApp, Instagram DM, Telegram)
- Die wichtigste Frage jeden Tag: **"Was muss ich HEUTE tun?"**
- Zeit ist Geld - jede Aktion muss in <3 Taps erreichbar sein
- Dark Mode ist Standard (Networker arbeiten abends)

**Was bereits existiert:**
- `ChatImportModal.tsx` - Chat Import UI
- `DailyFlowWidget.tsx` - Desktop Daily Flow
- `MagicOnboardingFlow.tsx` - Onboarding
- Backend APIs für Leads, Follow-ups, AI Chat

---

## DEINE AUFGABE

Baue das **perfekte Mobile Dashboard** für Networker als React/React Native Komponenten.

---

## DELIVERABLES

### 1. MOBILE DASHBOARD LAYOUT

```
┌─────────────────────────────────────────┐
│  🔥 DEIN TAG                    9:42 AM │
│  Freitag, 6. Dezember                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  HEUTE NOCH:                    │    │
│  │  🔔 3 Follow-ups fällig        │    │
│  │  👋 5 neue Kontakte machen     │    │
│  │  🔄 2 Reaktivierungen          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  QUICK ACTIONS:                         │
│  ┌───────┐ ┌───────┐ ┌───────┐         │
│  │📥     │ │✍️     │ │📞     │         │
│  │Import │ │AI Msg │ │Call   │         │
│  └───────┘ └───────┘ └───────┘         │
│                                         │
│  🎯 MONATSFORTSCHRITT                   │
│  ████████░░░░░░░░ 52% → Director        │
│                                         │
│  🔥 HOT LEADS (3)                       │
│  ┌─────────────────────────────────┐    │
│  │ Max M. • 🔥 Hot • 2h ago      →│    │
│  │ "Ja, klingt interessant!"       │    │
│  ├─────────────────────────────────┤    │
│  │ Lisa S. • ☀️ Warm • 1d ago    →│    │
│  │ Follow-up fällig                │    │
│  ├─────────────────────────────────┤    │
│  │ Tom W. • 👻 Ghost • 3d ago    →│    │
│  │ Phoenix Reaktivierung           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ═══════════════════════════════════    │
│  🏠      📇      💬      🎯      🤖    │
│  Home  Contacts  Chat   Goals   CHIEF   │
└─────────────────────────────────────────┘
```

### 2. KOMPONENTEN (TypeScript/React)

```typescript
// src/components/mobile/MobileDashboard.tsx
interface MobileDashboardProps {
  user: User;
  dailyStats: DailyStats;
  hotLeads: Lead[];
  goalProgress: GoalProgress;
  onQuickAction: (action: QuickAction) => void;
}

// src/components/mobile/DailyTasksCard.tsx
interface DailyTasksCardProps {
  tasks: DailyTask[];
  onTaskTap: (task: DailyTask) => void;
  onTaskComplete: (taskId: string) => void;
}

// src/components/mobile/HotLeadsCarousel.tsx
interface HotLeadsCarouselProps {
  leads: Lead[];
  onLeadTap: (lead: Lead) => void;
  onSwipeAction: (lead: Lead, action: 'message' | 'call' | 'snooze') => void;
}

// src/components/mobile/QuickActionBar.tsx
interface QuickActionBarProps {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
}

// src/components/mobile/GoalProgressRing.tsx
interface GoalProgressRingProps {
  progress: number; // 0-100
  targetRank: string;
  daysRemaining: number;
}

// src/components/mobile/BottomNav.tsx
type NavItem = 'home' | 'contacts' | 'chat' | 'goals' | 'chief';
interface BottomNavProps {
  active: NavItem;
  onNavigate: (item: NavItem) => void;
  unreadCounts?: Partial<Record<NavItem, number>>;
}
```

### 3. SWIPE GESTURES FÜR LEADS

```typescript
// Lead Card Swipe Actions
interface SwipeAction {
  direction: 'left' | 'right';
  action: 'message' | 'call' | 'snooze' | 'complete';
  color: string;
  icon: string;
}

// Konfiguration:
const SWIPE_ACTIONS: SwipeAction[] = [
  { direction: 'right', action: 'message', color: '#22c55e', icon: '💬' },
  { direction: 'left', action: 'snooze', color: '#f59e0b', icon: '⏰' },
];
```

### 4. PULL-TO-REFRESH

```typescript
// Pull-to-Refresh mit Haptic Feedback
interface RefreshableProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  children: React.ReactNode;
}
```

### 5. OFFLINE SUPPORT (PWA)

```typescript
// Service Worker für Offline-Fähigkeit
// - Leads cachen
// - Pending Actions Queue
// - Sync wenn online

interface PendingAction {
  id: string;
  type: 'complete_task' | 'send_message' | 'create_lead';
  payload: any;
  createdAt: Date;
  retryCount: number;
}
```

---

## API ENDPOINTS (Falls nötig)

```typescript
// GET /api/mobile/dashboard
// Optimierter Endpoint für Mobile Dashboard
interface DashboardResponse {
  daily_stats: DailyStats;
  hot_leads: Lead[]; // Max 10
  pending_tasks: DailyTask[]; // Max 20
  goal_progress: GoalProgress;
  notifications: Notification[];
}

// POST /api/mobile/quick-action
interface QuickActionRequest {
  action: 'import' | 'new_lead' | 'ai_message' | 'batch_followup';
  params?: Record<string, any>;
}
```

---

## DESIGN REQUIREMENTS

### Farben (Dark Mode)
```css
--bg-primary: #0f172a;      /* slate-900 */
--bg-secondary: #1e293b;    /* slate-800 */
--bg-card: rgba(255,255,255,0.05);
--text-primary: #ffffff;
--text-secondary: #94a3b8;   /* gray-400 */
--accent-purple: #8b5cf6;
--accent-green: #22c55e;
--accent-red: #ef4444;
--accent-orange: #f59e0b;
```

### Touch Targets
- Minimum 44x44px für alle tappbaren Elemente
- Thumb-Zone optimiert (wichtige Actions unten)

### Animationen
- Framer Motion für Übergänge
- Haptic Feedback bei Aktionen
- Skeleton Loading States

### Accessibility
- VoiceOver Support
- Reduced Motion Option
- High Contrast Support

---

## OUTPUT FORMAT

Liefere:
1. **Vollständige React-Komponenten** (TypeScript)
2. **Tailwind CSS Styles** (Mobile-optimiert)
3. **Framer Motion Animationen**
4. **TypeScript Interfaces**
5. **README mit Setup-Anleitung**

---

## BEISPIEL-IMPLEMENTIERUNG

```tsx
// Beispiel: HotLeadCard.tsx
import { motion, PanInfo } from 'framer-motion';

interface HotLeadCardProps {
  lead: Lead;
  onMessage: () => void;
  onSnooze: () => void;
}

export const HotLeadCard: React.FC<HotLeadCardProps> = ({
  lead,
  onMessage,
  onSnooze,
}) => {
  const handleDragEnd = (e: any, info: PanInfo) => {
    if (info.offset.x > 100) onMessage();
    if (info.offset.x < -100) onSnooze();
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="bg-white/5 rounded-xl p-4 cursor-grab active:cursor-grabbing"
    >
      {/* Content */}
    </motion.div>
  );
};
```

---

## WICHTIG

- **Mobile First**: Desktop ist sekundär
- **Performance**: <100ms für alle Interaktionen
- **Offline**: Muss ohne Internet funktionieren
- **Networker-UX**: Jede Sekunde zählt!

