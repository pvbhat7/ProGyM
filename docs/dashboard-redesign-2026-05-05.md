# Dashboard Redesign — 2026-05-05

## Overview

Full visual redesign of `webapp/src/pages/DashboardPage.tsx`. All business logic, state management, API calls, and modal functionality are unchanged. Only the UI/JSX layer was redesigned.

---

## Before

### Layout
- Plain `bg-gray-50` full-page background with no visual hierarchy
- Greeting text (`Good morning! 👋`) rendered as simple bold text directly on the gray background
- Today's date was not shown anywhere on the page

### Header
- White sticky header with logo, mobile number (plain text with small orange avatar), and a rectangular logout button with a red border
- Auto-logout timer shown as a small `rounded-lg` pill

### Stat Cards
- Small white cards (`bg-white`) with a tiny colored gradient icon square (`w-10 h-10`) in the top-left
- Number displayed in `text-2xl font-bold text-gray-800` (dark text on white)
- Cards blended into the same gray background — low visual impact
- No directional arrow indicator on clickable cards

### Quick Access Grid
- 2-column (mobile) / 3-column (desktop) grid
- Each card: white background, plain emoji icon (no background container), title, description
- Hover: orange border + slight shadow only
- Disabled cards: `opacity-60 cursor-not-allowed`
- All 16 links used the same visual style regardless of category
- "More features coming soon" orange-to-red gradient banner at the bottom

### Modals
- Each modal had its own duplicated backdrop + sheet wrapper JSX
- Numbered avatars were flat solid-color circles (`bg-blue-100`, `bg-green-100`)
- Plain dark backdrop (`bg-black/40`) with no blur
- Collection modal footer: plain white with small gray label + bold total

---

## After

### Layout
- `bg-slate-50` base with a **full-width dark gradient hero section** (`from-slate-800 via-slate-900 to-slate-800`) at the top
- Two decorative blurred radial blobs inside the hero (orange glow top-right, indigo glow bottom-left)
- Greeting, "Admin Dashboard" badge, and formatted date all live inside the hero

### Header
- Logo unchanged; mobile number now shown in a `bg-gray-50 border border-gray-200 rounded-full` pill badge
- Logout button changed to `rounded-full` with tighter padding; "Logout" text hidden on mobile (`hidden sm:inline`)
- Timer pill changed to `rounded-full` with `animate-pulse` when ≤ 60 seconds remaining

### Stat Cards
- Cards now overlap the hero banner using `-mt-12` negative top margin — they visually "float" above the gradient
- Each card is a **full gradient background** (no more white card + small icon):
  - Active Members: `from-blue-500 to-indigo-600`
  - Active Male: `from-cyan-500 to-sky-600`
  - Active Female: `from-pink-500 to-rose-600`
  - Today's Attendance: `from-emerald-500 to-green-600`
- Number: `text-3xl font-extrabold text-white` — white on gradient, much higher contrast
- Label: `text-sm text-white/75 font-medium`
- Two decorative semi-transparent white blobs inside each card for depth
- Clickable cards now show a `bg-white/20` chevron circle (top-right) that brightens on hover
- `active:scale-95` press feedback on touch

### Quick Access Grid
- 2-column (mobile) / 3-column (tablet) / 4-column (desktop) — one extra column on large screens
- Section header now has a horizontal rule: `<div className="flex-1 h-px bg-gray-200" />`
- Each card has a **per-category colored icon background** (`w-11 h-11 rounded-xl`):

  | Card | Icon background |
  |---|---|
  | Members | `bg-blue-100` |
  | Attendance | `bg-green-100` |
  | Packages | `bg-purple-100` |
  | Diet Plans | `bg-orange-100` |
  | Workouts | `bg-red-100` |
  | Collection | `bg-emerald-100` |
  | Roles | `bg-indigo-100` |
  | Weight | `bg-amber-100` |
  | Send Reminders | `bg-sky-100` |
  | Admissions | `bg-violet-100` |
  | ProCoins | `bg-yellow-100` |
  | Before/After Wall | `bg-rose-100` |
  | Birthdays | `bg-pink-100` |
  | Settings | `bg-gray-100` |
  | Referrals | `bg-teal-100` |
  | Approved Devices | `bg-slate-100` |

- Hover: `hover:shadow-xl hover:border-orange-200 hover:-translate-y-0.5` — card lifts upward
- Icon scales up `group-hover:scale-110` on hover for a playful micro-interaction
- "More features coming soon" banner removed (cleanup)

### Modals
- Extracted two shared helper components to eliminate duplicated JSX:
  - `ModalShell` — backdrop + bottom-sheet/centered panel wrapper, adds `backdrop-blur-sm` to overlay
  - `ModalHeader` — title + optional subtitle + close button
- Numbered avatar circles in member/attendance lists are now gradient (`from-blue-400 to-indigo-500`, `from-emerald-400 to-green-500`)
- Collection modal:
  - Tab buttons changed to `rounded-xl` with full gradient (`from-orange-500 to-red-500`) on active
  - Bar chart rows use `Math.max(4, ...)` so zero-value bars still render a visible sliver
  - Footer has `bg-orange-50` tinted background; total amount shown as `text-xl font-extrabold text-orange-600`
- Birthday modal: member photo placeholder uses a pink-to-rose gradient background
- All modals: `rounded-t-3xl` on mobile bottom-sheet corners (was `rounded-t-2xl`)

---

## Files Changed

| File | Change |
|---|---|
| `webapp/src/pages/DashboardPage.tsx` | Full JSX/UI redesign (logic unchanged) |

---

## Files NOT Changed

- All PHP API files — untouched
- All other React pages and components
- Routing, auth context, API config
- Modal business logic (birthday gifting, collection fetch, attendance fetch)
