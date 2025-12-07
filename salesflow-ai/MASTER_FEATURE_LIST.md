# SalesFlow AI - Master Feature List

## Quick Stats
- Total Pages: 68 (tsx/jsx unter `src/pages`)
- Routed Pages: 60+ (alle in `App.jsx` erfassten Routen)
- Hidden Pages: ~10 (nicht geroutet, siehe unten)
- Components: 200+ Dateien (breites Set, siehe Kategorien)
- Services: 40+ (unter `src/services`)
- Hooks: 60+ (unter `src/hooks`)

---

## 🟢 ACTIVE FEATURES (Routed & Working)

### Authentication & Onboarding
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Login | /login | ✅ | All |
| Signup | /signup | ✅ | All |
| Onboarding | /onboarding | ✅ | All |
| Choose Vertical | /choose-vertical | ✅ | All |

### Dashboard & Daily Flow
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Dashboard Router | /dashboard | ✅ | All |
| Dashboard Complete | /dashboard/complete | ✅ | All |
| Daily Command | /daily-command | ✅ | All |
| Next Best Actions | /next-best-actions | ✅ | All |

### AI & Chat
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| AI Copilot/Chat | /chat | ✅ | All |
| MagicSend Demo | /magic-send | ✅ | All |

### Lead Management
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Hunter Board | /hunter | ✅ | All |
| Lead Hunter UI | /lead-hunter | ✅ | All |
| Lead Discovery | /lead-discovery | ✅ | All |
| Import | /import | ✅ | All |
| Leads CRM | /crm/leads, /crm/leads/:leadId | ✅ | All |
| Contacts CRM | /crm/contacts, /crm/contacts/:id | ✅ | All |
| Pipeline CRM | /crm/pipeline | ✅ | All |

### Follow-up & Engagement
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Follow-ups | /follow-ups | ✅ | All |
| Delay Master | /delay-master | ✅ | All |
| Objections | /objections | ✅ | All |

### Sales Tools
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Cold Call Assistant | /cold-call | ✅ | All |
| Closing Coach | /closing-coach | ✅ | All |
| Roleplay Dojo | /roleplay-dojo | ✅ | All |
| Templates | /templates | ✅ | All |

### MLM / Network Marketing Specific
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Genealogy Tree | /genealogy | ✅ | MLM |
| Compensation Simulator | /compensation-simulator | ✅ | MLM |
| Network Graph | /network-graph | ✅ | MLM |
| Power Hour | /power-hour | ✅ | MLM |
| Churn Radar | /churn-radar | ✅ | MLM |
| Lead Hunter | /lead-hunter | ✅ | MLM |

### Analytics & Performance
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Analytics Dashboard | /analytics | ✅ | All |
| Performance Insights | /performance | ✅ | All |
| Gamification | /gamification | ✅ | All |
| Commissions | /commissions | ✅ | All |

### CRM & Settings
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Settings | /settings | ✅ | All |
| AI Settings | /settings/ai | ✅ | All |
| Knowledge Base | /settings/knowledge | ✅ | All |

### Automation
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Autopilot Cockpit | /autopilot | ✅ | All |

### Other
| Feature | Route | Status | Vertical |
|---------|-------|--------|----------|
| Pricing | /pricing | ✅ | All |
| Phoenix | /phoenix | ✅ | All |
| Coach / Squad Coach | /coach, /coach/squad | ✅ | All |
| Vertical Landing Pages | /networker, /immobilien, /coaching, /finanzvertrieb, /versicherung, /solar, /handelsvertreter, /aussendienst, /freelance | ✅ | By vertical LP |
| Marketing / Compact Landing | /full, / | ✅ | All |

---

## 🟠 HIDDEN FEATURES (Not Routed)
| Feature | File | Description | Recommendation |
|---------|------|-------------|----------------|
| AI Prompts | AIPromptsPage.tsx | Prompt mgmt | Add /ai-prompts |
| Billing Management | BillingManagement.tsx | Subscription mgmt UI | Add /billing |
| Network Marketing Dashboard | NetworkMarketingDashboard.tsx | MLM dashboard | Merge with /dashboard |
| Video Meetings | VideoMeetingsPage.tsx | Meetings UI | Add /meetings |
| Follow-up Analytics | FollowUpAnalyticsPage.tsx | FU stats | Add to /analytics |
| Squad Challenge Manager | SquadChallengeManager.tsx | Team challenges | Add /challenges |
| Squad Coach Priority | SquadCoachPriorityPage.tsx | Coach prioritization | Merge with coach |
| Squad Coach V2 | SquadCoachPageV2.tsx | Updated coach | Replace old |
| Squad Coach View | SquadCoachView.tsx | Coach view | Merge |
| Placeholders | PagePlaceholder.jsx, PlaceholderPages.jsx | Remove or hide |
| Legacy Duplicates | DashboardPage.jsx, LeadQualifierPage.jsx | Clean up |

---

## 📦 COMPONENTS (Top-Level Kategorien, Auszug)
- analytics, aura, aura-os-dashboard, auth, autonomous, autopilot, billing, brain, branding, chat, chat-import, chief-v3, chief-v31, claude-dashboard, coaching, common, compensation, daily-flow, dashboard, examples, fieldops, finance, followup/followups, forms, genealogy, geolocation, goal-wizard, goals, import, landing, layout, lead-generation, leadhunter, leads, live-assist, magic, objections, onboarding, outreach, phoenix, pricing, priority, pulse-tracker, retention, sales-brain, sales-intelligence, settings, sf, squad-coach, storybook, teach, templates, ui, voice, workflow, misc JS utilities.

---

## 🔌 SERVICES / APIs
- Services (Auszug): activityService, aiService, analyticsApi, analyticsService, apiConfig, authService, autopilotService, autoReminderService, chatImportService, chiefService, chiefV31Service, coachingApi, collectiveIntelligenceService, companyKnowledgeService, compensationApi, compensationService, dailyFlowService, financeService, followUpService, genealogyApi, goalEngineService, gtmCopyService, leadGenerationService, leadHunterService, leadScoringService, magicDeepLinkService, mentorLearning, mlmImportService, mlmScriptService, mockDMOService, nextBestActionsService, objectionBrainService, objectionTemplatesService, outreachService, personalityService, proposalReminderService, salesCompanyKnowledgeService, salesPersonaService, screenshotService, similarityService, successPatternsService, supabase (js/ts), teamTemplateService, voiceService, verticalAdapters (base/index/networkMarketing), verticalService.
- APIs (`src/api`): client.ts, crm.ts, dailyCommand.ts, index.ts, leads.ts, mock.ts.
- Hooks (`src/hooks`, Auszug): useAuth, useBilling, useAutopilot, useDashboardData, useAnalyticsDashboard, useFollowUp*, useObjection*, usePhoenix, useNextBestActions, useDailyFlow, useVertical, useAIChat, useClaudeApi, u.v.m.

---

## 🎯 VERTICAL PACKAGES (Empfehlung)
- Network Marketing / MLM: Core + Genealogy + Compensation + Lead Hunter + Autopilot + Power Hour + Churn Radar + Network Graph + Roleplay Dojo.
- Insurance / Finance: Core + Cold Call + Follow-ups + Performance + Autopilot; Genealogy/Compensation optional.
- Real Estate: Core + Field Ops/Route Planner (falls aktiviert), Lead Discovery, Phoenix, Templates.
- Coaching / Generic Sales: Core + AI Coach + Follow-ups + Objection Handling + Templates; optional Gamification/Analytics.

---

## 📊 FEATURE MATRIX BY PLAN (Beispiel, anpassbar)
| Feature | Free | Starter €29 | Pro €59 | Enterprise €119 |
|---------|------|-------------|---------|-----------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Leads (Kontingent) | 50 | 500 | Unl. | Unl. |
| AI Chat | 10/Tag | 100/Tag | Unl. | Unl. |
| Follow-ups | ✅ | ✅ | ✅ | ✅ |
| Genealogy | ❌ | ✅ | ✅ | ✅ |
| Compensation Sim | ❌ | ❌ | ✅ | ✅ |
| Autopilot | ❌ | ❌ | ✅ | ✅ |
| Team Features | ❌ | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |


