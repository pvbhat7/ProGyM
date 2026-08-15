# ProGym — ProCoin System Design

> Status: **In Progress — Step 13 Pending**
> Last updated: 2026-04-30

---

## HOW TO USE THIS FILE

**At the start of every new session:** Read this file first before asking questions or writing
any code. It contains the full design, all decisions made, codebase research, and live
implementation progress. This avoids re-explaining context and saves tokens.

**Progress tracking:** Every time a step is completed, update the checkbox in the
Implementation Progress section below and add any relevant notes (e.g. file paths created,
decisions changed, issues found).

---

## Overview

Expanding the existing ProCoin system into a full loyalty & redemption engine.
Coins are earned by members on various engagement events and redeemed either as
package payment discount or for merchandise pickup at the gym.

**Conversion rate: 1 ProCoin = ₹1 (everywhere, no exceptions)**

---

## Earning Rules

### Key Design Decision
Earning rules (event types + coin amounts) are stored in a DB table `coin_earning_rules`
so amounts can be changed by the admin without any code deployment.

### `coin_earning_rules` Table
```
id | eventType | coinAmount | description | isActive | updatedAt
```

| eventType | Default coinAmount | description | Notes |
|---|---|---|---|
| `signup` | 100 | Signup Welcome Bonus | One-time, already exists in client.php |
| `full_payment` | 25 | Full Package Payment | Triggered when cash + coins used = total fees |
| `daily_login` | 1 | Daily App Login | Once per calendar day |
| `weight_log` | 2 | Weight Tracker Update | Once per calendar week |
| `before_after_photo` | 5 | Weekly After Photo Upload | Once per new week slot (after photo only) |
| `profile_pic` | 10 | Profile Picture Update | Once per calendar month |
| `attendance` | 1 | Daily Attendance Check-in | Once per calendar day |

`isActive = 'yes'/'no'` — admin can disable an earning event entirely.

---

## Deduplication Logic Per Event

| Event | Deduplication Method |
|---|---|
| `signup` | Already handled in existing system (`client.php` createClientFromApp) |
| `full_payment` | `coin_credit_events` record per `clientId + eventType + referenceId (packageDetailsId)` |
| `daily_login` | `client.last_login` column (varchar d/m/Y), compare with today IST |
| `weight_log` | `coin_credit_events` record per `clientId + eventType + week_start_date` (stored in eventDate) |
| `before_after_photo` | `before_after_photos.coins_credited = 'yes'` per week slot; re-upload same week = no coin |
| `profile_pic` | `coin_credit_events` record per `clientId + eventType` — once in a lifetime, no date filter |
| `attendance` | `coin_credit_events` record per `clientId + eventType + eventDate = today (d/m/Y)` — uses `existsForDay()` |

---

## Redemption Options

### Option 1 — Package Payment Discount (Admin applies)
- Admin opens payment form for a member
- System shows member's **live coin balance**
- Admin enters how many coins to apply (0 to min(balance, remaining fees))
- Cash collected = installment − coins applied
- `cash paid + coins used = total value of payment`
- Full payment trigger: when sum of all payments (cash + coins) for a `packageDetailsId` ≥ `packagedetails.fees` → 25 coins credited

### Option 2 — Merchandise via ProCoins Section (Member requests)
- Member browses merchandise in their ProCoins section
- Product coin price = product rupee price (1 coin = ₹1, no separate price field needed)
- Member must have **full balance** to redeem — no partial coins + cash
- On request: coins deducted **immediately**
- Order goes to admin for approval in ProCoins → Coin Redemptions tab
- On **approve**: member notified → comes to gym to collect physically
- On **reject**: coins auto-refunded + member notified via `user_notifications`

---

## Database Changes

### New Tables

#### `coin_earning_rules`
```
id            int PK AUTO_INCREMENT
eventType     varchar(50)    -- unique key, matches eventType values above
coinAmount    int            -- how many coins to award
description   varchar(255)   -- human-readable label
isActive      varchar(5)     -- 'yes' / 'no'
updatedAt     varchar(30)
```

#### `before_after_photos`
Stores weekly **after** photos only. Before photo is uploaded once and stored in `client` table.
```
id               int PK AUTO_INCREMENT
clientId         int
week_label       varchar(50)    -- e.g. "April Week 1"
week_start_date  varchar(15)    -- d/m/Y, e.g. "01/04/2026"
week_end_date    varchar(15)    -- d/m/Y, e.g. "07/04/2026"
after_photo      varchar(255)   -- file path (after pic for this week)
upload_date      varchar(30)    -- d-m-Y h:i:s
coins_credited   varchar(5)     -- 'yes' / 'no'
discontinue      varchar(10)
```

Week auto-generation logic (calendar-based):
- Week 1: 1–7, Week 2: 8–14, Week 3: 15–21, Week 4: 22–28, Week 5: 29–end of month

#### `user_notifications`
```
id           int PK AUTO_INCREMENT
clientId     int
type         varchar(50)    -- see values below
title        varchar(100)
message      varchar(255)
amount       varchar(50)    -- optional, for coin/payment events
isRead       varchar(5)     -- 'yes' / 'no'
createdAt    varchar(30)    -- d-m-Y h:i:s
discontinue  varchar(10)
```

`type` values: `coin_credit`, `coin_debit`, `payment`, `package`,
`merchandise_approved`, `merchandise_rejected`

#### `coin_credit_events`
```
id           int PK AUTO_INCREMENT
clientId     int
eventType    varchar(50)    -- matches coin_earning_rules.eventType
eventDate    varchar(15)    -- d/m/Y — used for daily events (weight_log)
eventMonth   varchar(10)    -- MM/YYYY — used for monthly events (profile_pic)
referenceId  varchar(50)    -- packageDetailsId for full_payment, etc.
coinAmount   int
createdAt    varchar(30)
```

### Modified Existing Tables

| Table | Column to Add | Type | Notes |
|---|---|---|---|
| `client` | `last_login` | varchar(15) | `d/m/Y` format, IST |
| `client` | `before_photo_path` | varchar(255) | One-time before photo, uploaded at start |
| `paymenttransaction` | `proCoinsUsed` | double | Default 0, coins applied to this payment |

---

## New PHP API Endpoints Needed

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/beforeAfterPhotos/upload.php` | Upload before+after pair for a week slot |
| GET | `/api/beforeAfterPhotos/byClientId.php?cid=` | Member's own before/after wall |
| GET | `/api/beforeAfterPhotos/getAll.php` | Admin view — all members |
| GET | `/api/userNotifications/byClientId.php?cid=` | Fetch member notifications |
| POST | `/api/userNotifications/markRead.php` | Mark notification(s) as read |
| GET | `/api/coinEarningRules/getAll.php` | Fetch all earning rules (admin + app) |
| POST | `/api/coinEarningRules/update.php` | Admin updates coin amounts |
| GET | `/api/orders/getCoinRedemptions.php` | Admin — pending/all coin redemption orders |
| POST | `/api/orders/approveCoinRedemption.php` | Admin approve → FCM to member |
| POST | `/api/orders/rejectCoinRedemption.php` | Admin reject → refund coins + notification |

---

## Existing APIs to Modify

| File | Change Required |
|---|---|
| OTP login flow (`OtpPage.tsx` → member login) | After successful login: call new endpoint to credit `daily_login` coin + update `client.last_login` |
| `api/WeightTracker/add.php` | After successful add: check `coin_credit_events` for today → credit `weight_log` coins |
| `api/client/updateProfilePhoto.php` | After successful update: check `coin_credit_events` for current month → credit `profile_pic` coins |
| `api/paymentTransaction/create.php` | Accept `proCoinsUsed` field + run full payment detection → credit `full_payment` coins |
| `api/attendance/create.php` | After successful insert: check `coin_credit_events` for today → credit `attendance` coins. `cid` available as `$item->cid`. |
| `api/dataset/markAttendanceAndGetBasicDetails.php` | After successful attendance mark (inside `if($itemCount > 0)`): use `$row['id']` as cid → check `coin_credit_events` for today → credit `attendance` coins. |

**Note on login:** The existing `api/adminuser/validate.php` is admin-only. Member login uses
Firebase OTP (handled entirely in `OtpPage.tsx`). There is no server-side member login API
call currently. We will need a new lightweight endpoint, e.g. `api/client/recordLogin.php`,
that OtpPage calls after successful OTP verification for a member.

---

## Key Flows

### Daily Login Coin
```
OtpPage.tsx (member verified) → POST /api/client/recordLogin.php { clientId }
→ fetch client.last_login from DB
→ if last_login != today (IST):
    → fetch coin_earning_rules where eventType='daily_login' and isActive='yes'
    → insert procointransaction (credit, creditDebit='1')
    → insert user_notifications (type='coin_credit')
    → UPDATE client SET last_login = today (IST d/m/Y)
```

### Weight Log Coin
```
WeightTracker/add.php called
→ after successful INSERT:
→ calculate current week's start date (Monday of current week, IST, d/m/Y)
→ check coin_credit_events: clientId + 'weight_log' + eventDate = week_start_date
→ if no record:
    → fetch coin_earning_rules where eventType='weight_log' and isActive='yes'  (coinAmount=2)
    → insert procointransaction (credit, amount=2)
    → insert coin_credit_events (eventDate = week_start_date)
    → insert user_notifications
```

### Profile Pic Coin
```
updateProfilePhoto.php called
→ after successful update:
→ check coin_credit_events: clientId + 'profile_pic' + current MM/YYYY
→ if no record:
    → fetch coin_earning_rules where eventType='profile_pic' and isActive='yes'
    → insert procointransaction (credit)
    → insert coin_credit_events
    → insert user_notifications
```

### Before Photo Upload (One-Time)
```
POST /api/client/uploadBeforePhoto.php { clientId, photo (base64) }
→ decode + save image file to server
→ UPDATE client SET before_photo_path = savedPath WHERE id = clientId
→ return saved path
→ NO coin credited (before photo is just setup, not a reward event)
```

### After Photo Upload (Weekly, earns coins)
```
POST /api/beforeAfterPhotos/upload.php { clientId, week_label, week_start_date,
                                         week_end_date, after_photo (base64) }
→ decode + save image file to server
→ check before_after_photos: clientId + week_label
→ if existing row (re-upload same week):
    → UPDATE after_photo only, coins_credited unchanged, no coin
→ if new week slot:
    → INSERT row with coins_credited='yes'
    → fetch coin_earning_rules where eventType='before_after_photo' and isActive='yes'
    → insert procointransaction (credit)
    → insert user_notifications
```

### Wall Display Logic
```
Member's progress wall shows:
  - client.before_photo_path  (the one original before photo)
  - latest before_after_photos.after_photo for this client (most recent week)

Admin's before/after wall shows all clients, each with:
  - their before_photo_path + latest after_photo side by side
```

### Full Payment Detection
```
paymentTransaction/create.php (after saving record)
→ SUM (feesPaid + proCoinsUsed) from paymenttransaction WHERE packageDetailsId = X
→ fetch packagedetails.fees WHERE id = X
→ if sum >= fees:
    → check coin_credit_events: clientId + 'full_payment' + referenceId=packageDetailsId
    → if no record:
        → fetch coin_earning_rules where eventType='full_payment' and isActive='yes'
        → insert procointransaction (credit)
        → insert coin_credit_events (referenceId = packageDetailsId)
        → insert user_notifications
```

### Package Payment with Coins (Admin)
```
Admin opens payment form for member
→ GET live coin balance (SUM procointransaction credits - debits for clientId)
→ Admin enters proCoinsToApply (0 to min(balance, remaining fees))
→ Validate both constraints server-side
→ Save paymenttransaction with proCoinsUsed = proCoinsToApply
→ insert procointransaction (debit, creditDebit='2')
→ insert user_notifications (type='coin_debit')
→ Run full payment detection (above)
```

### Merchandise Coin Redemption
```
Member clicks "Redeem with ProCoins" on product
→ Validate: live balance >= product.newPrice
→ insert procointransaction (debit, creditDebit='2')
→ insert orders (proCoinsUsed=price, amount=0, paymentStatus='ProCoins', status='Pending')
→ insert user_notifications (type='coin_debit', message='Redemption request submitted')
→ FCM push to admin (hardcoded mobile 8796655176)

Admin sees in ProCoins → Coin Redemptions tab:

  APPROVE path:
  → UPDATE orders SET status='Ready for Pickup'
  → insert user_notifications (type='merchandise_approved')
  → FCM push to member (via fcmtoken table by clientId mobile)

  REJECT path:
  → UPDATE orders SET status='Cancelled'
  → insert procointransaction (credit refund, creditDebit='1')
  → insert user_notifications (type='merchandise_rejected')
  → FCM push to member
```

---

## UI Sections

### Admin Panel — What's New
| Section | Change |
|---|---|
| Payment form (MemberDetailPage or AddPaymentPage) | Show live coin balance; add "Apply ProCoins" input |
| AdminProCoinsPage | Add "Coin Redemptions" tab (Pending/Approved/Rejected filter) |
| AdminProCoinsPage | Add "Earning Rules" tab — table of eventTypes, edit coinAmount + isActive toggle |
| New route `/admin-before-after` | All members' before/after photos, filterable by member/month/week |

### Member Dashboard — What's New
| Section | Change |
|---|---|
| MemberProCoinsPage | Add "Earn" tab showing all earning opportunities with current coin values |
| MemberProCoinsPage | Add merchandise browse + "Redeem with ProCoins" flow |
| New route `/member-before-after` | One-time before photo upload (if not yet set) + weekly after photo upload + history showing original before alongside each week's after |
| App header (all member pages) | Notification bell icon with unread count badge |
| New notification slide-out panel | Lists recent notifications (coin, payment, merchandise) |

---

## ProCoin Balance Computation

Always computed **live** from `procointransaction` (no cached balance field):
```sql
SELECT
  SUM(CASE WHEN creditDebit = '1' THEN amount ELSE 0 END) -
  SUM(CASE WHEN creditDebit = '2' THEN amount ELSE 0 END)
AS balance
FROM procointransaction
WHERE clientId = ?
```

---

## Codebase Reference (Pre-researched)

### Key Frontend Files
```
webapp/src/App.tsx                              — all routes + role-based access
webapp/src/context/AuthContext.tsx              — auth state, stored as { mobile, role, userId, userName }
webapp/src/api/config.ts                        — API base URL config
webapp/src/pages/MemberProCoinsPage.tsx         — existing member wallet (balance + txn history)
webapp/src/pages/AdminProCoinsPage.tsx          — existing admin coins (bonus send, targeted, history tabs)
webapp/src/pages/MemberWeightTrackerPage.tsx    — weight log page (calls WeightTracker/add.php)
webapp/src/pages/MemberProfilePage.tsx          — profile edit (calls updateProfilePhoto.php)
webapp/src/pages/OtpPage.tsx                    — OTP verification + login (member + admin)
webapp/src/pages/MemberDashboardPage.tsx        — member home screen
```

### Key PHP Class Files
```
class/procointransaction.php   — createProcointransactionFromApp(), getProcointransactionByClientId()
class/rewards.php              — createRewardsFromApp(), getRewardByClientId()
class/orders.php               — createOrderFromApp(), updateOrderFromApp() (has ProCoin award logic)
class/client.php               — createClientFromApp() (has signup 100-coin logic, hardcoded txnId='4564pt')
class/paymenttransaction.php   — create(), getByPackageDetailsid() (no ProCoin logic yet)
class/ProCoinEmail.php         — sendBonus(), sendGift() static methods via PHPMailer
class/PaymentEmail.php         — payment confirmation email
```

### Key PHP API Files to Modify
```
api/WeightTracker/add.php              — add coin logic after line 23 (successful insert)
api/client/updateProfilePhoto.php      — add coin logic after line 40 (successful update)
api/paymentTransaction/create.php      — add proCoinsUsed field + full payment detection
```

### Existing ProCoin API Endpoints
```
GET  /api/procointransaction/retrieve.php?clientId=     — member txn history
GET  /api/procointransaction/getAllCredits.php           — admin all credits
POST /api/procointransaction/create.php                 — insert new txn
POST /api/procoins/sendBonusToAll.php                   — admin bulk bonus
POST /api/procoins/sendToClient.php                     — admin targeted coin send
GET  /api/rewards/retrieve.php?clientId=                — member rewards list
```

### Auth Storage (localStorage key: `progym_auth`)
```json
{ "mobile": "9876543210", "role": "admin|member", "userId": 123, "userName": "Name" }
```
Cookie backup key: `progym_member_session` (30-day expiry, for mobile browser resilience)

### PHP API Conventions
- POST body: `json_decode(file_get_contents("php://input"))`
- GET params: standard query string
- Response: plain string or JSON object/array
- CORS: `Access-Control-Allow-Origin: *` on all endpoints
- Date storage: `d/m/Y` (e.g. `29/04/2026`), Timezone: `Asia/Calcutta`
- Timestamp storage: `d-m-Y h:i:s`
- Soft delete: `discontinue = 'true'` (string)
- SQL: most class files use string concatenation (not prepared statements) — follow same pattern for consistency, do not refactor

### Already Implemented (Do Not Rebuild)
- ✓ Signup 100-coin bonus (`class/client.php` → `createClientFromApp()`)
- ✓ Order paid with coupon → 25 coins (`class/orders.php` → `updateOrderFromApp()`)
- ✓ Admin send bonus to all members (`api/procoins/sendBonusToAll.php`)
- ✓ Admin send coins to one member (`api/procoins/sendToClient.php`)
- ✓ Member ProCoin wallet page with balance + history (`MemberProCoinsPage.tsx`)
- ✓ Admin ProCoins management page with 3 tabs (`AdminProCoinsPage.tsx`)

---

## Step-by-Step Implementation Plan

**Rule:** Each step is fully built, uploaded to Hostinger, and validated by the user before
the next step begins. No step is started without explicit confirmation.

---

## Corrections to Already-Completed Steps
> Design changed after steps 1–3 were done. Apply these fixes before proceeding to Step 4.

### Step 1 Corrections (DB)
Run these SQL statements in phpMyAdmin on Hostinger:
```sql
-- Fix 1: weight_log coin amount changed from 1 to 2, frequency daily → weekly
UPDATE `coin_earning_rules`
SET coinAmount = 2, description = 'Weight Tracker Update (once per week)', updatedAt = '29/04/2026'
WHERE eventType = 'weight_log';

-- Fix 2: before_after_photos table — drop before_photo column (only after photos stored here)
ALTER TABLE `before_after_photos` DROP COLUMN `before_photo`;

-- Fix 3: client table — add before_photo_path for one-time before photo
ALTER TABLE `client` ADD COLUMN `before_photo_path` varchar(255) DEFAULT NULL;
```

### Step 2 Corrections (PHP Classes)
- `class/BeforeAfterPhotos.php`: Remove any reference to `before_photo` column. The class
  only handles after photos now. Add new method `uploadBeforePhoto()` is NOT needed here —
  that logic goes in `class/client.php` (update `before_photo_path` column).
- `class/CoinCreditEvents.php`: The `existsForDay()` method for `weight_log` must check by
  **week start date** (not calendar day). Add `existsForWeek($clientId, $eventType, $weekStartDate)`.

### Step 3 Corrections (Earning Rules Admin Tab)
- The admin Earning Rules tab may show `weight_log` as "once per day" in its description —
  ensure it now reads "once per week" (the DB update in Fix 1 above handles this if the tab
  just displays the DB value).
- No code change needed if the description column is displayed as-is from the DB.

---

### Step 1 — Database Setup
**What:** All 4 new tables + 2 column additions. Done entirely in phpMyAdmin on Hostinger.
**Deliverable:** Run the following SQL. User verifies tables exist in phpMyAdmin.
```sql
-- 1. coin_earning_rules
CREATE TABLE `coin_earning_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventType` varchar(50) NOT NULL,
  `coinAmount` int(11) NOT NULL DEFAULT 0,
  `description` varchar(255) DEFAULT NULL,
  `isActive` varchar(5) DEFAULT 'yes',
  `updatedAt` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
INSERT INTO `coin_earning_rules` (`eventType`, `coinAmount`, `description`, `isActive`, `updatedAt`) VALUES
('signup',            100, 'Signup Welcome Bonus',       'yes', '29/04/2026'),
('full_payment',       25, 'Full Package Payment',       'yes', '29/04/2026'),
('daily_login',         1, 'Daily App Login',            'yes', '29/04/2026'),
('weight_log',          1, 'Weight Tracker Update',      'yes', '29/04/2026'),
('before_after_photo',  5, 'Weekly Before/After Photo',  'yes', '29/04/2026'),
('profile_pic',        10, 'Profile Picture Update',     'yes', '29/04/2026');

-- 2. coin_credit_events
CREATE TABLE `coin_credit_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientId` int(11) NOT NULL,
  `eventType` varchar(50) NOT NULL,
  `eventDate` varchar(15) DEFAULT NULL,
  `eventMonth` varchar(10) DEFAULT NULL,
  `referenceId` varchar(50) DEFAULT NULL,
  `coinAmount` int(11) NOT NULL DEFAULT 0,
  `createdAt` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

-- 3. before_after_photos
CREATE TABLE `before_after_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientId` int(11) NOT NULL,
  `week_label` varchar(50) DEFAULT NULL,
  `week_start_date` varchar(15) DEFAULT NULL,
  `week_end_date` varchar(15) DEFAULT NULL,
  `before_photo` varchar(255) DEFAULT NULL,
  `after_photo` varchar(255) DEFAULT NULL,
  `upload_date` varchar(30) DEFAULT NULL,
  `coins_credited` varchar(5) DEFAULT 'no',
  `discontinue` varchar(10) DEFAULT 'false',
  PRIMARY KEY (`id`)
);

-- 4. user_notifications
CREATE TABLE `user_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientId` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `amount` varchar(50) DEFAULT NULL,
  `isRead` varchar(5) DEFAULT 'no',
  `createdAt` varchar(30) DEFAULT NULL,
  `discontinue` varchar(10) DEFAULT 'false',
  PRIMARY KEY (`id`)
);

-- 5. Add last_login to client
ALTER TABLE `client` ADD COLUMN `last_login` varchar(15) DEFAULT NULL;

-- 6. Add proCoinsUsed to paymenttransaction
ALTER TABLE `paymenttransaction` ADD COLUMN `proCoinsUsed` double DEFAULT 0;
```
**Validate:** All 4 tables visible in phpMyAdmin. `client` and `paymenttransaction` have new columns.
**Status:** [x] Done

---

### Step 2 — PHP Foundation Classes
**What:** 4 new PHP class files. No APIs yet, just the data layer.
**Files to create:**
- `class/CoinEarningRules.php` — `getAll()`, `getByEventType()`  , `update()`
- `class/CoinCreditEvents.php` — `create()`, `existsForDay()`, `existsForMonth()`, `existsForReference()`
- `class/BeforeAfterPhotos.php` — `upload()`, `updatePhotos()`, `getByClientId()`, `getAll()`, `existsForWeek()`
- `class/UserNotifications.php` — `create()`, `getByClientId()`, `markRead()`

**Upload to:** `/public_html/PROGYM/ggs/class/`
**Validate:** Files visible on Hostinger file manager. No PHP syntax errors (test via a quick include).
**Status:** [x] Done

---

### Step 3 — Earning Rules APIs + Admin "Earning Rules" Tab
**What:** First fully testable end-to-end feature. Admin can view and edit coin amounts per event.
**Files to create:**
- `api/coinEarningRules/getAll.php`
- `api/coinEarningRules/update.php`

**Frontend change:** Add "Earning Rules" tab to `AdminProCoinsPage.tsx` — table showing all 6
event types with current coin amount + isActive toggle. Admin can edit and save.
**Validate:** Admin opens ProCoins page → Earning Rules tab → sees 6 rows → can change an amount → saves → refreshes → new value persists.
**Status:** [x] Done

---

### Step 4 — User Notifications (Foundation for all coin events)
**What:** Build the notification system before earning events so every subsequent step can
insert notifications as part of its implementation.
**Files to create:**
- `api/userNotifications/byClientId.php`
- `api/userNotifications/markRead.php`

**Frontend changes:**
- Add notification bell icon to member app header (all member pages)
- Slide-out panel listing recent notifications with unread count badge
- `OtpPage.tsx` or `AuthContext.tsx` — no change yet, just UI shell

**Validate:** Member logs in → sees bell icon in header → clicks it → panel opens (empty for now, no errors).
**Status:** [x] Done

---

### Step 5 — Daily Login Coin
**What:** Credit 1 coin on first member login each day.
**Files to create:**
- `api/client/recordLogin.php` — checks `client.last_login` vs today IST, credits coin if new day
- `class/CoinCreditEvents.php` — created here (was missing from Step 2)

**Frontend change:** `OtpPage.tsx` — after successful member OTP verification, call
`POST /api/client/recordLogin.php { clientId }`.
**Validate:** Member logs in → notification bell shows "+1 ProCoin: Daily Login" → ProCoin
wallet balance increases by 1 → logging in again same day does NOT add another coin.
**Status:** [x] Done

---

### Step 6 — Weight Log Coin
**What:** Credit 1 coin when member logs weight (once per day).
**File to modify:** `api/WeightTracker/add.php` — after successful insert, check
`coin_credit_events` for today, credit coin if not yet credited today.
**Validate:** Member adds weight → notification shows "+1 ProCoin: Weight Update" → balance
increases → adding weight again same day does NOT add another coin.
**Status:** [x] Done

---

### Step 7 — Profile Picture Coin
**What:** Credit 10 coins when member updates profile photo (once per calendar month).
**File to modify:** `api/client/updateProfilePhoto.php` — after successful update, check
`coin_credit_events` for current month, credit coin if not yet credited this month.
**Validate:** Member updates profile pic → notification shows "+10 ProCoins: Profile Picture
Updated" → balance increases → updating pic again same month does NOT add more coins.
**Status:** [x] Done

---

### Step 8 — Package Payment with ProCoins + Full Payment Detection
**What:** Admin can apply member's coins toward a package payment. System detects when full
fees are paid and awards 25 coins.
**File to modify:** `api/paymentTransaction/create.php` — accept `proCoinsUsed` field, debit
coins from member, run full payment detection after saving.
**Frontend change:** Payment form in admin panel (wherever admin records a payment for a
member) — fetch and display member's live coin balance + input field "Apply ProCoins (max X)".
**Validate:**
1. Admin records payment with some coins applied → member coin balance decreases → `paymenttransaction` row has `proCoinsUsed` value.
2. When total payments (cash + coins) reach package fees → member gets "+25 ProCoins: Full Payment" notification → balance increases → repeating does NOT double-credit.
**Status:** [x] Done

---

### Step 9 — Before/After Photos
**What:** Member uploads their "before" photo once at the start. Every week they upload a new
"after" photo and earn 5 coins per new week slot. Wall shows original before + latest after.
**Files to create:**
- `api/client/uploadBeforePhoto.php` — saves base64 image, updates `client.before_photo_path`
- `api/beforeAfterPhotos/upload.php` — weekly after photo upload, coin logic
- `api/beforeAfterPhotos/byClientId.php` — member's after photo history

**Frontend change:** New route `/member-before-after`:
- If `client.before_photo_path` is null → show one-time "Upload Your Before Photo" prompt
- After before is set → show week selector + "Upload This Week's After Photo"
- History section: original before photo on left, each week's after photo on right (timeline)

**Validate:**
- New member sees before photo prompt → uploads → no coin, photo saved
- Member uploads after for "May Week 1" → 5 coins credited → notification shown
- Re-uploading same week replaces photo, NO extra coin
- "May Week 2" upload credits 5 coins again
**Status:** [x] Done

---

### Step 10 — Member ProCoins Page: Earn Tab + Merchandise Redeem
**What:** Enhance member ProCoins page with earning opportunities display and merchandise
redemption flow.
**Frontend changes to `MemberProCoinsPage.tsx`:**
- Add "Earn" tab — fetches `coin_earning_rules`, shows each event with coin value and how to earn it
- Add "Shop" tab — fetches `merchandise` + `supplements`, shows products with coin price,
  "Redeem" button (disabled if balance insufficient)
- Redemption flow: confirm dialog → deduct coins → create order → show success

**New API calls used:**
- `GET /api/coinEarningRules/getAll.php`
- `GET /api/merchandise/getAllMerchandise.php` (existing)
- `GET /api/supplements/getAllSupplements.php` (existing)
- `POST /api/orders/create.php` (existing, with `proCoinsUsed` + `paymentStatus='ProCoins'`)
- `POST /api/procointransaction/create.php` (existing, debit)

**Validate:** Member sees Earn tab with 6 rules → sees Shop tab with products and coin prices →
redeems a product → balance deducts → notification shows → order appears as Pending in admin.
**Status:** [x] Done

---

### Step 11 — Admin Coin Redemptions Tab
**What:** Admin can see, approve, and reject merchandise coin redemption requests.
**Files to create:**
- `api/orders/getCoinRedemptions.php`
- `api/orders/approveCoinRedemption.php`
- `api/orders/rejectCoinRedemption.php`

**Frontend change:** Add "Coin Redemptions" tab to `AdminProCoinsPage.tsx` — list of pending
orders with `paymentStatus='ProCoins'`, filter by Pending/Approved/Rejected, approve and reject
buttons.
**Validate:**
- Admin sees pending redemption request from Step 10 test
- Admin approves → member notification shows "Approved, collect at gym" → order status updates
- Admin rejects → member coins refunded → notification shows rejection
**Status:** [x] Done

---

### Step 13 — Attendance Coin
**What:** Credit 1 coin when a member marks attendance, once per calendar day. Two entry points
both need the same coin logic: `api/attendance/create.php` (used by PublicMembersPage) and
`api/dataset/markAttendanceAndGetBasicDetails.php` (used by QuickAttendancePage).

**DB change:** Insert new row into `coin_earning_rules` (run in phpMyAdmin):
```sql
INSERT INTO `coin_earning_rules` (`eventType`, `coinAmount`, `description`, `isActive`, `updatedAt`)
VALUES ('attendance', 1, 'Daily Attendance Check-in (once per day)', 'yes', '30/04/2026');
```

**Files to modify:**
- `api/attendance/create.php` — after line 18 (`$resultId = $item->create()`), add coin credit
  block: include `CoinCreditEvents`, `CoinEarningRules`, `procointransaction`, `UserNotifications`
  classes; check `existsForDay($item->cid, 'attendance', $today)`; if not exists credit coin +
  insert `coin_credit_events` + insert `user_notifications`. txnId format: `ATTEND-{cid}-{timestamp}`
- `api/dataset/markAttendanceAndGetBasicDetails.php` — inside `if($itemCount > 0)` while loop,
  after `extract($row)`, add same coin credit block using `$row['id']` as the clientId.

**Deduplication:** `coin_credit_events` per `clientId + 'attendance' + eventDate = today IST d/m/Y`
using `existsForDay()`. Safe to check in both endpoints — whichever runs first credits the coin,
the second call the same day is a no-op.

**Frontend:** No new UI needed — the notification bell (Step 4) automatically shows the
"+1 ProCoin: Daily Attendance" notification. The Earning Rules tab (Step 3) will display this
event once the DB row is inserted.

**Validate:**
1. Member marks attendance via QuickAttendancePage → notification bell shows "+1 ProCoin: Daily Attendance" → wallet balance increases by 1.
2. Member marks attendance again the same day (via either page) → NO second coin credited.
3. Admin opens Earning Rules tab → sees "attendance" row with coinAmount=1 → can edit amount and toggle isActive.
**Status:** [ ] Pending — code written, awaiting DB seed + Hostinger upload + validation

---

### Step 12 — Admin Before/After Wall
**What:** Admin can view all members' before/after photo pairs in one dedicated section.
**File to create:** `api/beforeAfterPhotos/getAll.php`
**Frontend change:** New route `/admin-before-after` — grid of all members' photos, filterable
by member name, month, week. Linked from admin nav.
**Validate:** Admin opens Before/After wall → sees photo pairs from Step 9 test → filter by
member name works.
**Status:** [x] Done

---

## Implementation Progress Summary

| Step | Description | Status |
|---|---|---|
| 1 | Database — tables + columns | [x] Done — ⚠️ apply DB corrections (see Corrections section) |
| 2 | PHP Foundation Classes | [x] Done — ⚠️ apply class corrections (see Corrections section) |
| 3 | Earning Rules APIs + Admin UI tab | [x] Done — verify weight_log description shows "once per week" |
| 4 | User Notifications system + bell UI | [x] Done |
| 5 | Daily Login Coin | [x] Done |
| 6 | Weight Log Coin | [x] Done |
| 7 | Profile Picture Coin | [x] Done |
| 8 | Package Payment with ProCoins + Full Payment Detection | [x] Done |
| 9 | Before/After Photos | [x] Done |
| 10 | Member ProCoins: Earn tab + Merchandise Redeem | [x] Done |
| 11 | Admin Coin Redemptions Tab | [x] Done |
| 12 | Admin Before/After Wall | [x] Done |
| 13 | Attendance Coin | [ ] Pending |

---

*Each step: build → upload to Hostinger → user validates → confirm → next step.*
