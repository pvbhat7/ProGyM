# FIFA World Cup Prediction Campaign — Implementation Plan

> **Goal**: Drive non-member acquisition by letting anyone predict daily World Cup matches and earn ProCoins (₹1 each), which they can redeem (up to 50% of fee) only by joining a ProGym membership package.

---

## 1. Final Design Summary

### Participant flow
| User type | Entry point | Onboarding | Coin destination |
|---|---|---|---|
| **Non-member** | Separate mini-app landing page (e.g. `/predict`) | Mobile + name + **Firebase OTP** | Goes to a new `client` record (`isGymClient='no'`) wallet |
| **Existing member** | Banner on home dashboard | Already logged in | Goes to existing member wallet |
| **Duplicate mobile** | Either flow | System detects existing mobile → auto-login to existing account | Existing wallet |

### Prediction types per match (6, max 35 base coins)
| Prediction | Base coins | Difficulty |
|---|---|---|
| Match winner (A / B / Draw) | 2 | Easy |
| Both teams to score? (Yes / No) | 3 | Easy |
| Total goals range (U2.5 / 2.5-4.5 / O4.5) | 4 | Medium |
| First goal scorer (pick from squad) | 8 | Hard |
| Man of the Match (pick from squad) | 8 | Hard |
| Exact final score | 10 | Hard |

### Stage multiplier
- Group stage: **×1**
- Round of 16: **×1.5**
- Quarter-final: **×2**
- Semi-final: **×3**
- Final: **×5**

### Streak bonuses (on match winner only)
- 3-in-a-row: **+5**
- 5-in-a-row: **+15**
- 7-in-a-row: **+50**

### Redemption mechanics
- **1 ProCoin = ₹1**
- Coins act as direct ₹ discount on gym membership package
- Discount **capped at 50%** of package fee
- Unused coins carry forward into shop wallet (existing flow)
- Non-members must join a gym package to redeem

### Player list
- One-time seed of 32 World Cup teams × 23 players = ~736 entries
- Loaded into `wc_players` table before campaign goes live

### Admin workflow
- Manual match entry (teams, kickoff datetime, stage)
- Single-form result entry → auto-settles all predictions, awards coins, fires FCM

### Engagement
- **FCM push 30 min before each match kickoff**
- Leaderboard: **Daily + Overall**
- Tiebreaker: **most matches predicted**

### Predictions cutoff
- Locked at match kickoff

---

## 2. Database Schema (5 new tables)

### `wc_teams`
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(100) | e.g. "Brazil" |
| short_code | varchar(10) | e.g. "BRA" |
| flag | varchar(255) | flag image path |
| group_name | varchar(5) | e.g. "A", "B" |
| discontinue | varchar(10) | `'false'` default |

### `wc_players`
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| team_id | int | → wc_teams.id |
| name | varchar(100) | |
| position | varchar(30) | GK / DEF / MID / FWD |
| jersey_number | int | |
| discontinue | varchar(10) | |

### `wc_matches`
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| team_a_id | int | → wc_teams.id |
| team_b_id | int | → wc_teams.id |
| stage | varchar(20) | group / r16 / qf / sf / final |
| multiplier | double | 1, 1.5, 2, 3, 5 |
| kickoff_at | datetime | match start time (IST) |
| status | varchar(20) | upcoming / live / settled / cancelled |
| winner | varchar(10) | A / B / DRAW (after settle) |
| score_a | int | nullable until settled |
| score_b | int | nullable until settled |
| first_scorer_id | int | → wc_players.id (nullable) |
| motm_id | int | → wc_players.id (nullable) |
| total_goals_range | varchar(15) | UNDER_2_5 / MID / OVER_4_5 |
| both_teams_scored | varchar(5) | YES / NO |
| settled_at | datetime | |
| discontinue | varchar(10) | |

### `wc_predictions`
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| client_id | int | → client.id |
| match_id | int | → wc_matches.id |
| pred_winner | varchar(10) | A / B / DRAW |
| pred_both_score | varchar(5) | YES / NO |
| pred_total_goals_range | varchar(15) | |
| pred_first_scorer_id | int | → wc_players.id |
| pred_motm_id | int | → wc_players.id |
| pred_score_a | int | |
| pred_score_b | int | |
| coins_awarded | double | 0 until settled |
| is_settled | varchar(5) | 'yes' / 'no' |
| submitted_at | datetime | |
| settled_at | datetime | |

### `wc_participants` (campaign registry — gym + non-gym users)
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| client_id | int | → client.id (UNIQUE) |
| joined_at | datetime | when they registered for campaign |
| source | varchar(30) | `non_member_signup` / `existing_member` / `admin_added` |
| was_gym_client_at_join | varchar(5) | `yes` / `no` snapshot at join time |
| converted_to_member_at | datetime | filled if non-member later buys a gym package |
| total_coins_earned | double | running total, updated on each match settle |
| total_matches_predicted | int | leaderboard tiebreaker + engagement metric |
| status | varchar(20) | `active` / `opted_out` |

**Use cases:**
- Campaign-only reports ("how many joined this week?")
- Filter campaign-specific FCM sends
- Conversion attribution ("non-members who became gym members because of the campaign")
- Fast leaderboard queries via denormalized `total_coins_earned`

### Reused existing tables
- `client` — registration (existing `createNewClientDataToServer.php`)
- `rewards` — coin entries (existing schema)
- `procointransaction` — coin ledger (existing schema)
- `fcmtoken` — kickoff reminders
- `packagedetails` + `paymenttransaction` — discount redemption on package buy

---

## 3. API Endpoints to Build

### Teams & Players (public read)
- `GET /api/wc_teams/all.php`
- `GET /api/wc_players/byTeamId.php?team_id=`

### Matches
- `GET /api/wc_matches/upcoming.php` — status=upcoming, sorted by kickoff
- `GET /api/wc_matches/past.php` — status=settled
- `GET /api/wc_matches/byId.php?id=`
- `POST /api/wc_matches/create.php` — admin
- `POST /api/wc_matches/update.php` — admin
- `POST /api/wc_matches/settle.php` — admin (single endpoint that settles all predictions)

### Predictions
- `POST /api/wc_predictions/submit.php` — user submits or updates predictions
- `GET /api/wc_predictions/myPredictions.php?client_id=`
- `GET /api/wc_predictions/byMatch.php?match_id=` — admin view

### Leaderboard
- `GET /api/wc_leaderboard/daily.php?date=`
- `GET /api/wc_leaderboard/overall.php`

### Package discount redemption (modify existing flow)
- Modify `/api/packageDetails/create.php` or add new wrapper to apply coin discount

---

## 4. Frontend Structure

### Non-member mini-app
- Route: `/predict` (public, no auth wall)
- Pages:
  - Landing / hero with "How it works" + Sign Up CTA
  - Mobile + Name + OTP signup (Firebase)
  - Match list (upcoming + past tabs)
  - Prediction form (6 inputs)
  - My picks / my coins
  - Leaderboard (daily + overall)
  - "Convert to Member" CTA with discount preview

### Member side (existing webapp)
- Banner on dashboard linking to `/predict`
- Reuse same prediction screens (auto-detect logged-in member)

### Admin side (existing webapp)
- Match management page (list + create + edit)
- Settle match form (single screen, all 5 result fields)
- Seed teams + players one-time UI (or use SQL import directly)

---

## 5. Step-by-Step Implementation (15 Steps)

> **Validation rule**: After each step, I will pause and show you what was built. You confirm before I proceed to the next step. Every step that touches PHP must be uploaded to Hostinger before testing.

### Phase A — Foundation (Steps 1-3)
**Step 1**: Create DB schema SQL — 4 new tables (`wc_teams`, `wc_players`, `wc_matches`, `wc_predictions`) + execute on local + provide SQL to run on Hostinger DB.

**Step 2**: Seed data SQL — Insert 32 World Cup teams + ~736 players (groups A-H). Provide a single SQL file ready to run.

**Step 3**: PHP class files — Create `class/WcTeam.php`, `class/WcPlayer.php`, `class/WcMatch.php`, `class/WcPrediction.php` with basic CRUD + custom queries.

### Phase B — Read APIs (Steps 4-5)
**Step 4**: Teams & Players read APIs — `wc_teams/all.php`, `wc_players/byTeamId.php`.

**Step 5**: Matches read APIs — `wc_matches/upcoming.php`, `past.php`, `byId.php`.

### Phase C — Admin Match Management (Steps 6-7)
**Step 6**: Admin match write APIs — `wc_matches/create.php`, `update.php` (no settle yet).

**Step 7**: Admin match UI in webapp — list/create/edit screens under existing admin panel.

### Phase D — Predictions & Scoring (Steps 8-10)
**Step 8**: Prediction submit + read APIs — `wc_predictions/submit.php`, `myPredictions.php`, `byMatch.php`.

**Step 9**: Settle match API — `wc_matches/settle.php` with full scoring logic (winner + score + scorer + MOTM + total goals + multiplier + streak bonus) → writes to `rewards` + `procointransaction`.

**Step 10**: Admin settle match UI — single-form result entry screen.

### Phase E — Leaderboard & Public Frontend (Steps 11-13)
**Step 11**: Leaderboard APIs + UI — `daily.php`, `overall.php` + member-side leaderboard view.

**Step 12**: Public mini-app landing + Firebase OTP signup flow at `/predict`.

**Step 13**: Prediction form UI + my predictions screen (mobile-first, used by both members and non-members).

### Phase F — Conversion & Polish (Steps 14-15)
**Step 14**: Package discount redemption — modify or wrap `packageDetails/create.php` to apply ProCoin discount (capped at 50%). Add "Convert to Member" CTA with discount preview on mini-app.

**Step 15**: FCM kickoff reminder cron + banner on member home + final deployment build + Hostinger upload checklist.

---

## 6. Deployment Reminder

After **every** step that changes PHP files or rebuilds the frontend:
1. `cd webapp && npm run build` (if frontend changed)
2. Upload changed PHP files to `/public_html/PROGYM/ggs/api/` and `/class/` respectively
3. Upload `webapp/dist/` to `/public_html/PROGYM/ggs/webapp/dist/`
4. Test on `https://tavrostechinfo.com/PROGYM/ggs/`

---

## 7. Progress Tracking

| Step | Description | Status |
|---|---|---|
| 1 | DB schema (4 tables) | ⬜ |
| 2 | Seed teams + players | ⬜ |
| 3 | PHP class files | ⬜ |
| 4 | Teams/Players read APIs | ⬜ |
| 5 | Matches read APIs | ⬜ |
| 6 | Admin match write APIs | ⬜ |
| 7 | Admin match UI | ⬜ |
| 8 | Prediction submit/read APIs | ⬜ |
| 9 | Settle match API + scoring | ⬜ |
| 10 | Admin settle match UI | ⬜ |
| 11 | Leaderboard APIs + UI | ⬜ |
| 12 | Public mini-app + OTP | ⬜ |
| 13 | Prediction form UI | ⬜ |
| 14 | Package discount redemption | ⬜ |
| 15 | FCM cron + banner + deploy | ⬜ |
