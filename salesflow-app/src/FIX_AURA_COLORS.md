# 🔧 FIX: AURA_COLORS Fehler behoben

## Problem
```
TypeError: Cannot read property 'primary' of undefined
```

## Ursache
Die Komponenten `VerticalSelector.tsx` und `ModuleSelector.tsx` verwenden Properties, die in `AURA_COLORS` nicht existierten:
- `AURA_COLORS.surface.primary`
- `AURA_COLORS.surface.secondary`
- `AURA_COLORS.surface.tertiary`
- `AURA_COLORS.accent.primary`
- `AURA_COLORS.border.subtle`
- `AURA_SHADOWS.sm`

## Lösung
Fehlende Properties in `components/aura/theme.ts` hinzugefügt:

### 1. Surface Colors
```typescript
surface: {
  primary: '#1e293b',      // Slate 800
  secondary: '#334155',    // Slate 700
  tertiary: '#475569',     // Slate 600
  elevated: '#64748b',     // Slate 500
},
```

### 2. Accent Colors
```typescript
accent: {
  primary: '#3b82f6',      // Blue 500
  secondary: '#8b5cf6',    // Purple 500
  success: '#10b981',      // Green 500
  warning: '#f59e0b',      // Amber 500
  error: '#ef4444',        // Red 500
},
```

### 3. Border Colors
```typescript
border: {
  primary: 'rgba(255, 255, 255, 0.1)',
  secondary: 'rgba(255, 255, 255, 0.08)',
  subtle: 'rgba(255, 255, 255, 0.05)',
  accent: 'rgba(59, 130, 246, 0.3)',
},
```

### 4. Shadow Sizes
```typescript
AURA_SHADOWS: {
  sm: { ... },
  md: { ... },
  lg: { ... },
  xl: { ... },
  // ... existing shadows
}
```

## Geänderte Dateien
- ✅ `components/aura/theme.ts` - Fehlende Properties hinzugefügt

## Status
✅ **BEHOBEN** - App sollte jetzt ohne Runtime-Fehler starten!

