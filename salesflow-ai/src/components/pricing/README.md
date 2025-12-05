# FELLO Pricing Section

## Übersicht

Die `FelloPricingSection` Komponente ist eine vollständige Pricing-Sektion für FELLO mit 4 Pricing-Tiers, einem Monatlich/Jährlich-Toggle und einer Founding Member Box.

## Features

- ✅ **4 Pricing Cards**: FREE, STARTER, GROWTH, SCALE
- ✅ **Monatlich/Jährlich Toggle**: Mit "2 Monate gratis" Badge
- ✅ **Founding Member Box**: Mit Counter und Progress Bar
- ✅ **Hover-Effekte**: Animierte Cards mit Glow-Effekt
- ✅ **GROWTH Highlighting**: Spezielle Hervorhebung für den Popular Plan
- ✅ **Responsive Design**: Funktioniert auf Mobile und Desktop

## Verwendung

```tsx
import { FelloPricingSection } from '../components/pricing';

function MyScreen() {
  const handlePlanSelect = (planId: string, isYearly: boolean) => {
    console.log(`Plan selected: ${planId}, Yearly: ${isYearly}`);
    // Navigiere zu Checkout oder aktualisiere State
  };

  const handleFoundingMember = () => {
    console.log('Founding Member selected');
    // Navigiere zu Founding Member Checkout
  };

  return (
    <FelloPricingSection
      onPlanSelect={handlePlanSelect}
      onFoundingMemberSelect={handleFoundingMember}
    />
  );
}
```

## Pricing Plans

1. **FREE** - €0
   - 20 Kontakte
   - 5 MENTOR Calls
   - 5 Compliance Checks
   - 1x CSV Import
   - Basic Alerts

2. **STARTER** - €29/mo
   - 500 Kontakte
   - 50 MENTOR Calls
   - 50 Compliance Checks
   - Unlimited CSV Import
   - Alle Alerts
   - Basic Templates

3. **GROWTH** - €59/mo ⭐ POPULAR
   - 3.000 Kontakte
   - 200 MENTOR Calls
   - Unlimited Compliance
   - 100 Ghostbuster/mo
   - 500 Auto-Messages/mo
   - Neuro-Profiler

4. **SCALE** - €119/mo
   - 10.000 Kontakte
   - 500 MENTOR Calls
   - 300 Ghostbuster/mo
   - 2.000 Auto-Messages/mo
   - CFO Dashboard
   - 3 Team Members
   - Priority Support

## Founding Member

- **€499 einmalig**
- Growth-Plan für immer
- Nur 100 Plätze verfügbar (Counter zeigt verfügbare Plätze)

## Styling

Die Komponente nutzt das AURA Design System:
- `AURA_COLORS` für Farben
- `AURA_SHADOWS` für Schatten
- `AURA_SPACING` für Abstände
- `AURA_RADIUS` für Border-Radius

## Anpassungen

Die Pricing-Daten können in der Komponente angepasst werden:
- `PRICING_PLANS`: Array mit allen Pricing-Plänen
- `FOUNDING_MEMBER`: Founding Member Daten

