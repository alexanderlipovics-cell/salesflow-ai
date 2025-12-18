# 🎨 PROMPT FÜR CLAUDE: FRONTEND-KOMPONENTEN & UI

## 🎯 AUFGABE: Fehlende Frontend-Komponenten implementieren

### WAS DU BAUEN SOLLST:

#### 1. Mobile Dashboard (Swipe Actions & Offline Support)
**Datei**: `/src/screens/mobile/MobileDashboardScreen.tsx`

**Features**:
- Hot Leads Carousel mit horizontal Swipe
- Quick Action Bar (Bottom Navigation)
- Pull-to-Refresh Funktionalität
- Offline Support (PWA-ready)
- Push Notifications Integration
- Real-time Lead Updates
- Performance optimiert (React.memo, useMemo)

#### 2. Follow-Up Engine UI
**Datei**: `/src/components/followup/SmartFollowUpEngine.tsx`

**Features**:
- Sequenz Builder (Drag & Drop)
- Template Library
- Team Template Sharing
- A/B Testing für Follow-Ups
- Performance Analytics
- Calendar Integration
- Automated Scheduling

#### 3. Lead Hunter Dashboard
**Datei**: `/src/pages/LeadHunterDashboard.tsx`

**Features**:
- Real-time Lead Scoring Display
- Intent Detection Visualisierung
- Lead Pipeline Funnel
- Conversion Tracking
- Manual Override Controls
- Bulk Actions
- Export Funktionalität

#### 4. Team Duplikation Interface
**Datei**: `/src/components/team/BlueprintCloningInterface.tsx`

**Features**:
- Template Browser (Team Library)
- One-Click Duplication
- Process Blueprint Cloning
- Performance Metrics Sharing
- Role-based Access Control
- Version History
- Backup/Restore

#### 5. Enhanced AI Chat Interface
**Datei**: `/src/components/chat/EnhancedChiefChat.tsx`

**Features**:
- Context Awareness (Lead History, Previous Conversations)
- Multi-modal Input (Text, Voice, Image)
- Conversation Templates
- Quick Actions Integration
- Memory System (Conversation History)
- Error Recovery
- Typing Indicators

### DESIGN REQUIREMENTS:

#### Mobile-First Design:
- Responsive für alle Screen-Größen
- Touch-optimized Interactions
- Swipe Gestures
- Bottom Sheets für Actions
- Dark Mode Support

#### Performance:
- Lazy Loading für Components
- Virtual Scrolling für Listen
- Image Optimization
- Bundle Splitting
- Service Worker für Offline

#### UX Patterns:
- Skeleton Loading States
- Error Boundaries
- Toast Notifications
- Confirmation Dialogs
- Progressive Disclosure

### INTEGRATION POINTS:

#### APIs nutzen:
- `/api/leads/` - Lead Management
- `/api/followups/` - Follow-Up Engine
- `/api/chat/` - AI Chat
- `/api/team/` - Team Features
- `/api/notifications/` - Push Notifications

#### State Management:
- React Query für Server State
- Zustand für Client State
- Real-time Subscriptions (Supabase)

### ERFOLGSKRITERIEN:
- ✅ Mobile Dashboard funktioniert offline
- ✅ Follow-Up Engine ist voll funktional
- ✅ Lead Hunter zeigt Live-Daten
- ✅ Team Duplikation arbeitet
- ✅ AI Chat ist kontextbewusst
- ✅ Performance >90 Lighthouse Score
- ✅ Alle Components sind responsive

### ZEIT: 3-4 Tage konzentrierte Arbeit

---

**Starte mit Mobile Dashboard, dann Follow-Up Engine, dann Lead Hunter. Erstelle wiederverwendbare Components!**
