# Workout Builder — Implementation TODO

**Goal**: Enable the disabled "Workouts" icon in the admin dashboard and build a full workout plan management UI.  
**Date created**: 2026-05-14

---

## Background / Data Model

### Tables involved

| Table | Purpose |
|---|---|
| `t_workoutmaintype` | Workout plan templates (e.g. "Single Muscle - 1", "Ladies Level - 3") |
| `t_workoutsubtype` | Individual exercises belonging to a plan (sets, reps, gifFilePath, muscle) |
| `muscleworkout` | Day-of-week rotation rules — which sub-workout to assign on which day for rotation-type plans |
| `workoutscheduleobject` | Per-client daily workout record (auto-created on first access, not admin-managed) |
| `workoutsubtype` | Per-client exercise instances copied from template (client-facing, not admin-managed) |

### Relationship
```
t_workoutmaintype  (plan template)
    └── t_workoutsubtype  (exercises in the plan)  via mtid FK

muscleworkout  (day-rotation config)
    links day + mainWorkoutName → subWorkoutName
    used by server auto-create logic for client daily schedules
```

### Special rotation plans
Plans named exactly **"Single Muscle - 1/2/3"**, **"Double Muscle - 1/2/3"**, or **"Ladies Level - 3"** use the `muscleworkout` table to assign a *different* sub-workout per day of the week. This is server-side auto-create logic — the admin builder should **display** the rotation rules but does not need to create/edit them in Phase 1.

---

## Existing API Endpoints (all on live server, no changes needed unless noted)

### Plan Templates (`t_workoutmaintype`)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/t_workoutmaintype/getAll.php` | Returns all non-discontinued plans |
| GET | `/api/t_workoutmaintype/single_read.php?id=` | Single plan by ID |
| POST | `/api/t_workoutmaintype/create.php` | Body: `{ name, discontinue }` |
| POST | `/api/t_workoutmaintype/update.php` | Body: `{ id, name, discontinue }` |

### Exercises (`t_workoutsubtype`)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/t_workoutsubtype/getAll.php` | All exercises |
| GET | `/api/t_workoutsubtype/getAllByMainTypeId.php?mtid=` | Exercises for a specific plan |
| GET | `/api/t_workoutsubtype/getAllDistinct.php` | Distinct exercise names (public library) |
| POST | `/api/t_workoutsubtype/create.php` | Body: `{ name, mtid, discontinue, gifFilePath, sets, reps }` |
| POST | `/api/t_workoutsubtype/update.php` | Body: `{ id, name, mtid, discontinue, gifFilePath, sets, reps }` |

### Muscle Rotation Rules
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/muscleworkout/all.php` | All day-rotation mappings (read-only display) |

---

## Known PHP Backend Gap (requires PHP file changes)

The `t_workoutsubtype` create and update APIs **do not include the `muscle` field** even though the DB column exists and is used for exercise filtering in the public WorkoutsPage.

**Files to modify:**
- [class/t_workoutsubtype.php](class/t_workoutsubtype.php) — add `muscle` to `createSubWorkoutType()` and `updateSubWorkoutType()` SQL
- [api/t_workoutsubtype/create.php](api/t_workoutsubtype/create.php) — accept `$data->muscle` and assign to `$item->muscle`
- [api/t_workoutsubtype/update.php](api/t_workoutsubtype/update.php) — accept `$data->muscle` and assign to `$item->muscle`

These 3 PHP files need to be uploaded to Hostinger after changes.

---

## Implementation Steps

### Step 1 — Fix PHP backend: add `muscle` field support
- [ ] **1a.** Edit `class/t_workoutsubtype.php`:
  - In `createSubWorkoutType()` SQL: add `muscle = '".$this->muscle."'` to the SET clause
  - In `updateSubWorkoutType()` SQL: add `muscle = '".$this->muscle."'` to the SET clause
- [ ] **1b.** Edit `api/t_workoutsubtype/create.php`:
  - Add line: `$item->muscle = $data->muscle;` (after the other field assignments)
- [ ] **1c.** Edit `api/t_workoutsubtype/update.php`:
  - Add line: `$item->muscle = $data->muscle;` (after the other field assignments)
- [ ] **1d.** Upload the 3 modified PHP files to Hostinger

---

### Step 2 — Enable Workouts icon in Dashboard
- [ ] **2a.** Edit [webapp/src/pages/DashboardPage.tsx](webapp/src/pages/DashboardPage.tsx) line 293:
  - Change `path: null` → `path: '/admin-workouts'` for the Workouts quick link

---

### Step 3 — Add route in App.tsx
- [ ] **3a.** Edit [webapp/src/App.tsx](webapp/src/App.tsx):
  - Import `AdminWorkoutsPage` from `'./pages/AdminWorkoutsPage'`
  - Add route: `<Route path="/admin-workouts" element={<AdminRoute><AdminWorkoutsPage /></AdminRoute>} />`

---

### Step 4 — Create `AdminWorkoutsPage.tsx` (main page)

**URL:** `/admin-workouts`  
**Layout:** Back button → Page title "Workout Plans" → Plan cards list → FAB (+) to add new plan

#### 4a. Plan list view
- [ ] On mount, fetch all plans via `GET /api/t_workoutmaintype/getAll.php`
- [ ] Render each plan as a card showing:
  - Plan name (bold)
  - Exercise count (fetch from `getAllByMainTypeId` or compute client-side after loading all exercises)
  - "Rotation plan" badge if name matches Single/Double Muscle or Ladies Level pattern
  - Tap → opens Plan Detail view (Step 5)
- [ ] Empty state: "No workout plans yet. Tap + to create one."
- [ ] Floating Action Button (bottom-right, red, `+`) → opens Create Plan modal/drawer

#### 4b. Create Plan modal/drawer
- [ ] Form fields: Plan Name (text input)
- [ ] Submit: POST to `/api/t_workoutmaintype/create.php` with `{ name, discontinue: 'false' }`
- [ ] On success: refresh plan list, close modal

#### 4c. Edit Plan name
- [ ] Each plan card has a ✏️ edit icon
- [ ] Opens inline edit or modal to change the name
- [ ] Submit: POST to `/api/t_workoutmaintype/update.php` with `{ id, name, discontinue }`

#### 4d. Disable/archive a plan
- [ ] Each plan card has a disable (🚫) icon
- [ ] Confirm dialog: "Disable this workout plan? Existing client schedules using this plan will not be affected."
- [ ] On confirm: POST to `/api/t_workoutmaintype/update.php` with `{ id, name, discontinue: 'true' }`
- [ ] Remove from list on success

---

### Step 5 — Plan Detail view (exercises within a plan)

**Layout:** Back → Plan name header → Exercise list → FAB (+) to add exercise  
**Can be a sub-page `/admin-workouts/:id` or a pushed view within `AdminWorkoutsPage`**

#### 5a. Load exercises
- [ ] Fetch: `GET /api/t_workoutsubtype/getAllByMainTypeId.php?mtid={id}`
- [ ] Filter out `discontinue === 'true'` records on the frontend
- [ ] Render each exercise as a card:
  - Exercise name
  - Muscle group tag (coloured badge)
  - Sets × Reps (e.g. "3 sets × 12 reps")
  - GIF thumbnail (small, from `gifFilePath` URL) — tap to preview full GIF
  - Edit (✏️) and Disable (🚫) icon buttons

#### 5b. Add Exercise modal/drawer
- [ ] Form fields:
  - **Name** (text) — with autocomplete from `getAllDistinct` exercise library
  - **Muscle group** (dropdown or tag picker): Chest, Back, Shoulders, Biceps, Triceps, Legs, Abs, Cardio, Full Body, Other
  - **Sets** (number, default 3)
  - **Reps** (number, default 12)
  - **GIF URL** (text input) — paste Hostinger-hosted GIF path, show live preview below the field
- [ ] Submit: POST to `/api/t_workoutsubtype/create.php` with `{ name, mtid, muscle, sets, reps, gifFilePath, discontinue: 'false' }`
- [ ] On success: refresh exercise list

#### 5c. Edit Exercise
- [ ] Opens same form pre-filled with existing values
- [ ] Submit: POST to `/api/t_workoutsubtype/update.php` with `{ id, name, mtid, muscle, sets, reps, gifFilePath, discontinue }`

#### 5d. Disable Exercise
- [ ] Confirm dialog
- [ ] POST to `/api/t_workoutsubtype/update.php` with `{ ..., discontinue: 'true' }`
- [ ] Remove from list on success

---

### Step 6 — Rotation rules info panel (read-only, for rotation-type plans)

For plans whose name matches the rotation pattern, show an info section on the Plan Detail view:

- [ ] Fetch: `GET /api/muscleworkout/all.php`
- [ ] Filter rows where `mainWorkoutName` matches the current plan name
- [ ] Display as a 7-row table: **Day → Workout assigned** (the `subWorkoutName` column)
- [ ] Add info tooltip/note: "On each day, the server auto-assigns the exercise set for that day's muscle group when a client first opens their workout."

---

### Step 7 — Build & Deploy
- [ ] Run `npm run build` inside `webapp/`
- [ ] Upload `webapp/dist/` to Hostinger at `/public_html/PROGYM/ggs/webapp/dist/`
- [ ] Upload the 3 modified PHP files (Step 1) to their respective paths

---

## UI / UX Notes

- Match existing admin page style (white cards, Tailwind, mobile-first, bottom-sheet drawers)
- Use the same back-button + header pattern as `AdminProCoinsPage.tsx`, `AdminBeforeAfterPage.tsx`
- Plan list: red icon background (`bg-red-100`) to match the Dashboard icon colour
- Exercise GIF preview: lazy-loaded `<img>` with a skeleton loader placeholder
- Muscle group colours: consistent with the public `WorkoutsPage.tsx` muscle badges

---

## Files To Create / Modify

| Action | File |
|---|---|
| Modify | `class/t_workoutsubtype.php` |
| Modify | `api/t_workoutsubtype/create.php` |
| Modify | `api/t_workoutsubtype/update.php` |
| Modify | `webapp/src/pages/DashboardPage.tsx` |
| Modify | `webapp/src/App.tsx` |
| **Create** | `webapp/src/pages/AdminWorkoutsPage.tsx` |

---

## Out of Scope (Phase 1)

- Creating or editing `muscleworkout` day-rotation rules (admin reads them, does not edit)
- Viewing per-client workout schedules (`workoutscheduleobject` / `workoutsubtype`) — handled in Member Detail page
- Re-ordering exercises within a plan (no ordering column in DB)
- Uploading GIF files directly (GIF URL must be pasted; actual file hosting is separate)
