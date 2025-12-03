# Sales Flow AI – Design System v1.0

## 🎨 Brand Identity

### Vision
Dark, kinetic, performance-focused CRM für Network Marketing. Clean, spacious und energizing.

### Core Values
- **Flow** – Seamless UX ohne Friktion
- **Performance** – Data-driven Insights in Echtzeit
- **Energy** – Aktivierend, motivierend, ergebnisorientiert

---

## 🎨 Design Tokens

### Colors
```ts
colors: {
  sf: {
    bg: '#020617',
    surface: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    primary: {
      DEFAULT: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
      glow: 'rgba(6, 182, 212, 0.2)',
    },
    accent: {
      DEFAULT: '#a3e635',
      light: '#bef264',
      dark: '#84cc16',
      glow: 'rgba(163, 230, 53, 0.2)',
    },
    text: {
      DEFAULT: '#f1f5f9',
      muted: '#94a3b8',
      subtle: '#64748b',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}
```

### Typography
```ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
};
```

### Spacing
```ts
spacing: {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
}
```

### Border Radius
```ts
borderRadius: {
  DEFAULT: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
}
```

### Shadows
```ts
boxShadow: {
  'sf-sm': '0 1px 2px rgba(6, 182, 212, 0.05)',
  sf: '0 4px 6px rgba(6, 182, 212, 0.1)',
  'sf-md': '0 10px 15px rgba(6, 182, 212, 0.15)',
  'sf-lg': '0 20px 25px rgba(6, 182, 212, 0.2)',
}
```

---

## 📦 Components

### SFKpiCard
- Gradient Overlay (cyan → lime)
- Uppercase Label, Icon Badge, Value 3xl, optional Trend
- States: Default, Hover, Focus, Loading

### SFTable
- Sortable Columns, Keyboard Navigation, Empty States, Loading Skeletons
- Roles: `table`, `row`, `cell` für Screenreader

### Cards
- **Primary**: KPI, Gradient, Shadow, Hover Scale
- **Secondary**: Content, dezentes Shadowing, ohne Gradient

---

## 🎬 Animations
- Page load: `initial={{ opacity: 0, y: 20 }}`
- Staggered Children Container + `slideUp` Variants
- Hover Scale `whileHover={{ scale: 1.02 }}`

---

## ♿ Accessibility
- Alle interaktiven Elemente mit `tabIndex={0}`
- Enter / Space Trigger für Buttons
- ARIA Labels für KPIs, Tabellen, Icons
- Focus Rings: `focus-visible:ring-2 focus-visible:ring-sf-primary`

---

## 📱 Responsive
- Breakpoints: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536
- Grid Patterns: `md:grid-cols-2`, `lg:grid-cols-3`
- Layout Wrapper: `px-4 py-4 md:px-8 md:py-6 space-y-6`

---

## 📝 Microcopy
- Ton: direkt, freundschaftlich, motivierend
- Immer CTA in Empty States
```tsx
<div className="py-12 text-center">
  <CheckCircle2 className="mx-auto h-12 w-12 text-sf-success" />
  <p className="mt-4 text-sm text-sf-text-muted">
    Keine offenen Aufgaben – gönn dir.
  </p>
</div>
```

---

## 🧪 Testing
- Visual Regression: Storybook + Chromatic
- Accessibility: axe-core, Screenreader Tests
- Performance: Lighthouse > 90, Bundle < 200kb

---

## 📚 Resources
- Figma, Storybook, Component Library (Links intern)

**Version**: 1.0  
**Last Updated**: 2024-11-30  
**Maintainer**: Alex / Dev Team
# Sales Flow AI – Design System v1.0

## Vision & Prinzipien
- **Flow**: Friktionsfreie Journeys, schnelle Orientierung.
- **Performance**: Datenorientiert, KPI-first.
- **Energy**: Aktivierende Farbwelt (Cyan + Lime), klare Microcopy.

## Design Tokens
```ts
colors.sf = {
  bg: #020617,
  surface: #0f172a,
  card: #1e293b,
  primary: #06b6d4,
  accent: #a3e635,
  border: #334155,
  text: #f1f5f9,
  'text-muted': #94a3b8,
  success: #10b981,
  warning: #f59e0b,
  error: #ef4444,
};
```

- **Typography**: `Inter`, 0.16em Letterspacing für Labels.
- **Spacing**: 4px Grid (`space-y-6`, `gap-4`).
- **Border Radius**: `rounded-2xl` für Cards, `rounded-full` für Buttons.
- **Shadows**: `shadow-sf-md` (Cyan Glow), `shadow-sf-lg` für Hero-Karten.

## Komponenten

### SFKpiCard
- Props: `label`, `value`, `icon`, `trend`, `isLoading`, `onClick`.
- Layout: Gradient Overlay, Icon-Chip, Value (3xl), Subline, Trend-Badge.
- States: Hover (scale), Focus-Ring, Loading (`Skeleton`), ARIA Labels.

### SFTable
- Props: `data`, `columns`, `isLoading`, `emptyMessage`, `onRowClick`.
- Features: Sortierung, Animierte Rows (`framer-motion`), Keyboard-Zugriff, Empty State Text.
- Verwendung: Follow-ups, Squad Coach Leaderboards, Logs.

### Dashboard Cards
- `TodayTasksCard`: nutzt `SFTable`, zeigt KPIs & CTA-Texts.
- `TemplatePerformanceCard`: Recharts-BarChart, Tooltip mit Details.
- `FunnelStatsCard`: kompakte KPI-Blöcke für Ø/Median.
- `SquadCoachCard`: Top Networker + Need Help Reps (2-Spalten Grid).

### ErrorBoundary
- Vollflächiger Fallback mit CTA „Seite neu laden“.
- Logging via `console.error`, Hook für Sentry vorbereitet.

## Accessibility
- Alle interaktiven Container: `role`, `tabIndex`, `aria-label`.
- Buttons reagieren auf Enter/Space (`onKeyDown`).
- Icon-only Elemente nutzen `aria-hidden="true"`.
- Kontrast: Hintergrund vs. Text > 4.5:1 (Cyan/Slate).

## Animationen
- `framer-motion` Slide/Fade (`duration 0.35s`).
- Hover: `whileHover={{ scale: 1.02 }}`.
- Tabellen-Rows: Sequenzielles Delay `index * 0.02`.

## Responsive Patterns
- Layout: `grid gap-4 md:grid-cols-2 lg:grid-cols-4`.
- Sections: `space-y-6`, `px-4 md:px-8`.
- Mobile: Stacks (1spaltig), Buttons vollbreit.

## Microcopy & Empty States
- Ton: Du-Form, motivierend.
- Beispiele:
  - „Keine offenen Aufgaben heute – gönn dir das Coaching-Deck.“
  - „Noch keine Template-Daten – starte zuerst Kampagnen.“

## Testing & Tooling
- Hooks: `@testing-library/react` (z. B. `useTodayOverview`).
- Charts/Tables: Storybook (folgt).
- Accessibility: axe/lighthouse (>90) empfohlen.

## Deployment Checklist
- [ ] `tailwind.config.js` mit `sf`-Tokens.
- [ ] `SFKpiCard`, `SFTable`, Dashboard Cards importiert.
- [ ] `ErrorBoundary` wrappt Dashboard.
- [ ] Loading + Empty States sichtbar.
- [ ] ARIA/Keyboard getestet.
- [ ] Design-Doku (dieses File) aktualisiert.

