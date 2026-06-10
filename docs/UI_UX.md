# BrainBoost — UI/UX Design Document

**Version:** 1.0.0  
**Date:** June 2026

---

## 1. Design System

### Color Palette
Defined in `client/src/index.css` as HSL CSS variables. Both `:root` (light) and `.dark` classes are defined.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | Blue-purple | Blue-purple | CTAs, game icons, active states |
| `--accent` | Violet | Violet | Logic game icon, secondary emphasis |
| `--background` | White/light | Dark navy | Page background |
| `--card` | White | Dark gray | Card backgrounds |
| `--muted` | Light gray | Dark muted | Backgrounds, skeleton loaders |
| `--border` | Light border | Dark border | Card/input borders |
| `--chart-1` | Blue | Blue | Memory game |
| `--chart-2` | Green | Green | Logic game |
| `--chart-3` | Teal/emerald | Teal | Attention game, success states |
| `--chart-4` | Amber | Amber | Speed math, score badge |
| `--chart-5` | Red-orange | Red-orange | Danger, calculator icon |
| `--destructive` | Red | Red | Errors, wrong answers, danger |

### Typography
- **Base font:** System UI stack (via Tailwind CSS)
- **Monospace:** `font-mono` for Speed Math question display
- **Scale:** `text-sm` (12px), `text-base` (16px), `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-5xl`
- **Weights:** Regular (400), Semibold (600), Bold (700)

### Spacing
Tailwind spacing scale (4px base unit): `gap-2` (8px), `p-4` (16px), `p-6` (24px), `py-8` (32px).

### Border Radius
- Cards: `rounded-xl` (12px) or `rounded-2xl` (16px)
- Buttons: defaults from Shadcn Button (varies by variant)
- Badges/chips: `rounded-full`
- Progress bars: `rounded-full`

### Shadows
`premium-shadow` — custom class defined in `index.css`. Used on all Cards and game areas to give a slightly elevated premium feel.

---

## 2. Component Library

All UI components are from **Shadcn/ui** (copied into `client/src/components/ui/`). Key components:

| Component | Usage |
|-----------|-------|
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | All content panels |
| `Button` | Ghost, outline, default variants |
| `GradientButton` | Primary CTAs; extends Button with gradient class |
| `Badge` | Premium indicator on dashboard |
| `Progress` | Loading bars |
| `Input` | Speed Math answer input |
| `Toaster` + `Toast` | Success/error notifications |
| `Tooltip` | Wrapped around some icons |

### GradientButton
Custom wrapper in `client/src/components/ui/gradient-button.tsx`. Extends Shadcn Button with `btn-primary` CSS class (gradient background defined in `index.css`).

```tsx
<GradientButton onClick={handleStart}>Start Game</GradientButton>
```

---

## 3. Layout Architecture

### Landing Page
```
Nav (logo + Sign In + Get Started + ThemeToggle)
  └── Hero (animated floating orbs, headline, CTA buttons)
  └── Features (6 cards, 3-col grid on desktop)
  └── Stats (3 animated counters: users, improvement, games)
  └── Brain Visualization (centered graphic + feature list)
  └── Science (3-col: Neuroplasticity, Adaptive Training, Validated)
  └── Testimonials (3 cards: Sarah K., Marcus T., Priya R.)
  └── Pricing (3 plans: Free, Premium $9.99/mo, Annual $79.99/yr)
  └── CTA footer
```

### Dashboard (authenticated)
```
Sticky Nav (logo | Welcome text | Upgrade button | ThemeToggle | Logout)
  └── Page Header (title + Premium badge if isPremium)
  └── Stat Cards row (2-col mobile, 4-col desktop)
  └── Main 3-col grid (lg):
      └── Left 2 cols:
          └── "Today's Training" (2×2 game cards grid)
          └── "Recent Sessions" (list of last 8)
      └── Right 1 col (sidebar):
          └── "Your Progress" heading
          └── ProgressChart (weekly improvement bar chart)
          └── "Today's Plan" (4 items with progress bar)
          └── Upgrade CTA (if not premium)
```

### Active Game (modal-style)
When a game is active, the entire dashboard layout is replaced by:
```
min-h-screen bg-background p-4 md:p-8
  └── max-w-2xl mx-auto
      └── [Game Component]
```

---

## 4. Responsive Breakpoints (Tailwind)

| Breakpoint | Width | Layout Change |
|------------|-------|---------------|
| Default | 0px+ | 1 column, stacked |
| `sm:` | 640px+ | 2-col game grid |
| `md:` | 768px+ | 2-col subscribe layout, show nav text |
| `lg:` | 1024px+ | 3-col dashboard (2+1 sidebar) |
| `xl:` | 1280px+ | Max container `max-w-7xl` |

---

## 5. Animations & Transitions

### CSS Keyframes (defined in `index.css`)

| Name | Description | Used by |
|------|-------------|---------|
| `shimmer` | Skeleton loading shimmer | Stat card loading states |
| `float` | Gentle Y-axis oscillation | Hero orbs on landing page |
| `spin` | 360° rotation | Loading spinners |
| `pulse` | Scale pulse | Attention game objects |
| `fadeInUp` | Fade up from 20px | Scroll-reveal on landing sections |

### Transition Classes
- Card hover: `hover:scale-105 transition-transform` (game cards)
- Button hover: `hover:opacity-90 transition-all duration-300`
- Timer bar: `transition-all duration-1000` (smooth 1-second shrink per tick)
- Plan progress bar: `transition-all duration-500`
- Feedback flash: `transition-all duration-200` on game question area

### Scroll-Reveal (`IntersectionObserver`)
Landing page sections use an `IntersectionObserver` added in `useEffect` to apply `fadeInUp` animation when sections enter the viewport. Threshold: 0.1. Once observed, `animation-play-state: running` is applied.

### Animated Counters
Three social proof counters on the landing page animate from 0 to their final values using `requestAnimationFrame` when they enter the viewport. Duration: ~2 seconds with easing.

---

## 6. Theme System

Managed by `ThemeProvider` (`client/src/components/theme-provider.tsx`).

- **Storage key:** `brainboost-theme` in `localStorage`
- **Three modes:** `light`, `dark`, `system`
- **Toggle cycle:** light → dark → system → light (via ThemeToggle component)
- **Mechanism:** Adds/removes `light`/`dark` CSS class on `document.documentElement`
- **System mode:** Reads `window.matchMedia("(prefers-color-scheme: dark)")`
- **Default:** `light`

Dark mode is applied via Tailwind's `dark:` prefix variant (`darkMode: ["class"]` in tailwind config).

---

## 7. Game-Specific UX

### Memory Card Game
- **Grid layout:** 4 cols for ≤6 pairs, 4 cols for ≤8 pairs, 6 cols for >8 pairs
- **Preview phase:** All cards shown face-up with `pointer-events: none` during countdown
- **Card flip animation:** CSS `transition-all duration-300` color change (no 3D flip — 2D color swap for performance)
- **Match feedback:** Matched cards become `opacity-75` and stay face-up
- **Preview countdown:** Resets correctly on restart (uses `previewStartRef`)

### Logic Puzzle
- **Options:** Always exactly 3 choices (guaranteed by fallback option generation)
- **Feedback:** Green (correct) / Red (wrong) highlighting on selected + correct option revealed if wrong
- **Pattern hint:** Pattern name shown after each answer ("Arithmetic sequence", etc.)
- **Dark mode:** Light feedback colors have `dark:` variants for visibility

### Attention Game
- **Game area:** 384px height (`h-96`), relative positioned, `overflow-hidden`
- **Objects:** Absolutely positioned by `%` coordinates, `animate-pulse`
- **Target indicator:** Pinned to top-left corner of game area
- **Background adapts:** Target indicator uses `bg-white/90 dark:bg-black/80`

### Speed Math
- **Question display:** `font-mono text-5xl` for maximum readability
- **Timer bar:** Full-width bar above question; color changes: green → amber → red
- **Feedback overlay:** Question area background changes to green/red with transition
- **Progress dots:** Row of small circles below input; filled green/red as questions are answered
- **Answer input:** `type="number"`, auto-focused on each question, disabled during feedback

---

## 8. Gamification UX

### Stat Cards
Four dashboard stat cards reinforce training engagement:
- 🔥 **Day Streak** — orange fire icon, streak badge shows "N day streak"
- 🏆 **Total Score** — gold trophy, badge shows real weekly % change
- 🧠 **Current Level** — primary brain, "Adaptive" badge
- ⏱️ **Training Time** — teal clock, badge shows sessions played count

### Completion Feedback
- Green checkmark badge (absolute positioned) appears on game card when a game was completed today
- "Today's Plan" items strikethrough with green checkmark when completed
- Progress bar fills as games are completed (0–4 / 4)
- "🎉 Daily goal complete!" message when all 4 games done

### Level System
Level 1–5 derived from accuracy per session. Dashboard shows average level across all game types. Higher level → faster/harder adaptive settings next session.

### Score System
Scores accumulate in `user_progress.total_score`. Memory: base 1000 minus penalties. Logic: 100 per correct + time bonus. Attention: 10 × level per target click. Speed Math: 100 + time-proportional bonus per correct answer.
