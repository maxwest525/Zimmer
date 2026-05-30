---
name: MASSA theming system
description: How light/dark theming works in artifacts/massa and the gotchas when touching colors/fonts.
---

# MASSA theming

MASSA has TWO parallel styling systems and the theme layer bridges both:
1. **Tailwind CSS-var components** — use semantic classes (`bg-background`, `text-foreground`,
   `bg-card`, `border-border`, `text-muted-foreground`). These react automatically to the `.dark`
   class on `<html>` via the HSL vars in `src/index.css` (both `:root` light and `.dark` blocks exist).
2. **Inline-style components** — historically hardcoded hex via a module-level `const c = {...}`.
   These do NOT react to theme. They now consume `useThemeColors()` from `src/contexts/ThemeContext`.

**Single source of truth:** `src/lib/theme.ts` exports `getThemeColors(isDark)` returning a `ThemeColors`
object (superset of every component's old `c` keys). `ThemeProvider` toggles the `.dark` class +
persists to localStorage key `massa-theme`; `index.html` has an inline anti-flash script reading the
same key (keep the two in sync). Toggle component: `src/components/ThemeToggle.tsx`.

**Gotchas:**
- `ThemeColors` needs `[key: string]: string` index signature — some components type a color prop as
  `Record<string,string>` (e.g. Overview's `StatusBadge`) and pass the whole `c` object in.
  **Why:** without it, `tsc` errors "ThemeColors not assignable to Record<string,string>".
- Do NOT bump the tiny font sizes (≤7px) inside Overview's `PreviewThumbnail` — they are intentional
  miniature mockup previews, not readable body text.
- Code blocks / terminal output keep dark hardcoded backgrounds in both themes on purpose (acceptable).
- Dual fonts: body/description → `c.fontSans` (Inter); headings, labels, code, terminal, metric/data
  values → `c.font` (JetBrains Mono). Brand green accent is `#34d399` (dark) / `#0a8f4e` (light).
