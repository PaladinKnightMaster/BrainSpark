# BrainBoost — UI/UX Design Document

**Version:** 1.0.0  
**Date:** March 2026

---

## 1. Design Philosophy

BrainBoost's visual identity is built on three pillars:

| Pillar | Implementation |
|--------|---------------|
| **Scientific credibility** | Clean, structured layout; data-driven stats; no gimmicks |
| **Motivational engagement** | Streak gamification, progress charts, achievement feedback |
| **Cognitive ease** | High contrast, consistent patterns, minimal decision fatigue |

---

## 2. Design System

### 2.1 Color Palette

#### Light Mode
| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--background` | `210, 40%, 98%` | Page background (near white) |
| `--foreground` | `222, 84%, 5%` | Primary text |
| `--card` | `0, 0%, 100%` | Card surfaces |
| `--primary` | `246, 76%, 62%` | Brand purple — CTAs, active states |
| `--accent` | `217, 91%, 60%` | Complementary blue |
| `--chart-1` | `246, 76%, 62%` | Memory game color |
| `--chart-2` | `217, 91%, 60%` | Logic game color |
| `--chart-3` | `142, 76%, 36%` | Attention/success green |
| `--chart-4` | `47, 96%, 53%` | Speed math / warning amber |
| `--chart-5` | `0, 84%, 60%` | Error / danger red |
| `--muted-foreground` | `215, 16%, 47%` | Secondary text |

#### Dark Mode
All colors shift to high-contrast dark equivalents via `.dark` CSS class. Primary and accent hues remain the same; background shifts to `222, 84%, 5%` and cards to the same dark value.

#### Gradient System
```css
/* Hero gradient */
background: linear-gradient(135deg, hsl(246,76%,62%, 0.1) 0%, hsl(217,91%,60%, 0.1) 100%)

/* CTA gradient (GradientButton) */
background: linear-gradient(135deg, hsl(246,76%,62%) 0%, hsl(217,91%,60%) 100%)

/* Premium card accent */
background: linear-gradient(to br, primary/5, accent/5)
```

### 2.2 Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Hero H1 | `text-4xl` / `text-6xl` | 700 | Inter |
| Section H2 | `text-3xl` / `text-4xl` | 700 | Inter |
| Card titles | `text-xl` / `text-2xl` | 600 | Inter |
| Body | `text-base` | 400 | Inter |
| Labels / captions | `text-sm` / `text-xs` | 400–500 | Inter |
| Stat numbers | `text-2xl` / `text-4xl` | 700 | Inter |
| Mono (game math) | `font-mono` / `text-5xl` | 700 | System mono |

Gradient text for hero heading:
```css
background: linear-gradient(to right, var(--primary), var(--accent))
-webkit-background-clip: text
color: transparent
```

### 2.3 Spacing & Layout

- **Grid system**: 12-column CSS Grid via Tailwind's `grid-cols-*`
- **Content max width**: `max-w-7xl` (1280px) with `mx-auto`
- **Section padding**: `py-24` (96px top/bottom)
- **Card gutter**: `gap-6` (24px)
- **Border radius**: `--radius: 12px` (cards), `rounded-xl` for interactive elements, `rounded-full` for pills

### 2.4 Elevation / Shadow System

```css
/* Standard card */
.premium-shadow {
  box-shadow:
    0 20px 40px rgba(99, 102, 241, 0.12),
    0 8px 16px rgba(99, 102, 241, 0.08),
    0 4px 6px rgba(0, 0, 0, 0.05);
}

/* Hover (feature cards) */
.feature-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow:
    0 40px 80px rgba(99, 102, 241, 0.18),
    0 16px 32px rgba(99, 102, 241, 0.12);
}
```

Dark mode intensifies the purple shadow tint for better visibility against dark backgrounds.

---

## 3. Animation System

### 3.1 Entrance Animations

| Class | Trigger | Timing |
|-------|---------|--------|
| `.animate-fade-in` | Component mount | `0.6s ease-out` |
| `.animate-fade-in-delay-1/2/3` | Staggered entrance | `+0.15s` per step |
| `.animate-scale-in` | Modals/dialogs | `0.3s ease-out` |
| `.animate-slide-up` | Cards | `0.5s cubic-bezier` |
| `.scroll-reveal` | Scroll into view | `0.6s ease-out` (IntersectionObserver) |

### 3.2 Scroll Reveal

`IntersectionObserver` watches all `.scroll-reveal` elements:
- **Threshold**: 10% visible
- **Root margin**: -40px bottom (triggers slightly before element enters viewport)
- **Transition**: `opacity 0s→1` + `transform translateY(24px)→0`
- **Stagger**: Applied via inline `transitionDelay` on repeated elements

### 3.3 Floating Background Elements

Hero section decorative orbs use:
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}
/* 6s duration, staggered via nth-child delays */
```

### 3.4 Animated Counters (Social Proof)

Numbers count up from 0 to target when scrolled into view:
- Duration: 1500ms
- Steps: 50 (30ms intervals)
- Trigger: `IntersectionObserver` at 50% threshold, fires once

### 3.5 Game Feedback Animations

| Event | Animation |
|-------|-----------|
| Correct answer | Background flashes `bg-chart-3/20` (green) |
| Wrong answer | Background flashes `bg-destructive/20` (red) |
| Card flip (Memory) | CSS `transform: rotateY(180deg)` with 3D perspective |
| Timer bar | `width` transition with `duration-1000` |
| Progress dots | Fill from left as questions complete |

---

## 4. Component Library

### 4.1 GradientButton
Custom button with gradient background, shimmer hover effect, and lift animation:
```
Normal:  purple→blue gradient background
Hover:   translateY(-3px) scale(1.05), intensified shadow, shimmer sweep
Active:  scale(0.98)
```

### 4.2 GameCard
Game selection card with:
- Icon, title, description, duration badge, difficulty badge
- Play button (full width, gradient)
- `checkmark overlay` when today's game is complete
- Hover: premium-shadow intensification

### 4.3 ProgressChart
Performance trend chart showing per-game improvement bars:
- Color-coded bars (chart-3 for positive, destructive for negative)
- Percentage labels in pill badges
- Skeleton loading state

### 4.4 FeatureCard
Landing page feature highlight with:
- Icon slot, title, description
- Premium variant: gradient border (`bg-gradient-to-br from-primary/5 to-accent/5`)
- Hover: `translateY(-12px) scale(1.02)`

### 4.5 ThemeToggle
Icon button toggling between `Sun` (light) and `Moon` (dark) icons:
- Persists to `localStorage`
- Applies `.dark` class to `document.documentElement`

---

## 5. Page Layouts

### 5.1 Landing Page Structure

```
┌─────────────────────────────────────┐
│  Nav (sticky, glassmorphism blur)   │
├─────────────────────────────────────┤
│  Hero (split: text left, image right│
│  Floating orbs, gradient background │
├─────────────────────────────────────┤
│  Features (2×3 grid + premium card) │
├─────────────────────────────────────┤
│  Social Proof (3-col stats counter) │
│  Brain visualization full-width     │
├─────────────────────────────────────┤
│  Science (3-col cards)              │
├─────────────────────────────────────┤
│  Testimonials (3-col quote cards)   │
├─────────────────────────────────────┤
│  Pricing (3-col: Free/Premium/Annual│
├─────────────────────────────────────┤
│  CTA banner (gradient background)   │
└─────────────────────────────────────┘
```

### 5.2 Dashboard Layout

```
┌─────────────────────────────────────┐
│  Nav (sticky, backdrop blur)        │
│  Logo | Welcome | Upgrade | Logout  │
├─────────────────────────────────────┤
│  Header (title + premium badge)     │
├─────────────────────────────────────┤
│  Stats Row (4 cards: 2-col mobile)  │
│  [Streak] [Score] [Level] [Time]    │
├─────────────────────────────────────┤
│  Main (lg:col-span-2) │ Sidebar     │
│                       │             │
│  Today's Training     │ Perf. Chart │
│  2×2 game cards       │             │
│  with ✓ badges        │ Today's Plan│
│                       │ (4 items,   │
│  Recent Sessions      │ strikethrough│
│  (last 8 list)        │ when done)  │
│                       │             │
│                       │ Upgrade CTA │
└─────────────────────────────────────┘
```

---

## 6. Responsive Design

| Breakpoint | Grid Changes |
|-----------|-------------|
| Mobile (< 640px) | Stats: 2-col; Games: 1-col; Sidebar: stacked below |
| Tablet (640–1024px) | Stats: 2-col; Games: 2-col; Sidebar: below |
| Desktop (1024px+) | Stats: 4-col; Games: 2-col in 2/3 col; Sidebar: 1/3 col |

All layouts use `grid` with `sm:grid-cols-*` and `lg:grid-cols-*` breakpoints.  
Navigation collapses feature links on mobile (hidden `md:flex`).

---

## 7. Accessibility

| Concern | Implementation |
|---------|---------------|
| Keyboard navigation | All interactive elements are focusable; `Tab` order logical |
| Screen readers | Semantic HTML (`nav`, `section`, `h1-h3`); `aria-label` on icon buttons |
| Color contrast | WCAG AA compliance (4.5:1 ratio for normal text) |
| Loading states | `aria-label="Loading"` on spinners |
| Motion | `@media (prefers-reduced-motion)` can be added to disable floating/slide animations |
| Form labels | All inputs have associated `<Label>` components |
| Dialogs | Radix UI `Dialog` handles focus trapping and ARIA roles |

---

## 8. Gamification UX

### 8.1 Motivation Mechanics

| Feature | UX Implementation |
|---------|------------------|
| Day streak | Prominent fire icon + "X day streak" in stat card and badge |
| Daily plan | Checklist with strikethrough, progress bar, and celebration message when complete |
| Score accumulation | Cumulative total displayed prominently; visible increase after each game |
| Completion badges | Green ✓ overlay on game cards for today-completed games |
| Level system | "Level N" displayed with "Adaptive" badge |
| Progress trend | Positive % in green pills; negative in red — visual motivation to improve |

### 8.2 Game UX Patterns

| Pattern | Used In |
|---------|---------|
| Pre-game settings preview | All 4 games — sets expectations, reduces frustration |
| Real-time timer bar | Speed Math — creates urgency without anxiety |
| Instant feedback | Speed Math, Logic — color flash on correct/wrong |
| Progress dots | Speed Math — shows how far through the game |
| Preview phase | Memory — shows all cards briefly before starting |
| Score breakdown | All end screens — score + accuracy + comparison |
| "Play Again" option | All games — low-friction retry |

### 8.3 Onboarding UX

- No lengthy tutorial — difficulty auto-starts at beginner level
- First game session works immediately after login
- Default training plan created automatically on first login
- Empty states show encouraging messages ("Play a game to see your progress!")

---

## 9. Dark/Light Mode Implementation

```typescript
// ThemeProvider: reads localStorage, applies class
const [theme, setTheme] = useState(
  localStorage.getItem('theme') || 'light'
)
useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('theme', theme)
}, [theme])
```

CSS variables are defined in `:root` (light) and `.dark` (dark), so all Tailwind color utilities automatically switch.

The glassmorphism nav effect adjusts:
- Light: `rgba(255,255,255, 0.9)` + white border
- Dark: `rgba(15,23,42, 0.9)` + white/10 border
