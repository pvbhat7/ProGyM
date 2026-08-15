# ProGym - Gym Management System

## Repository Contains Two Projects

This `progym/` folder hosts **two separate projects**. Always confirm which one the user is referring to before making changes — never touch the other.

1. **progym** — the main gym management web app. Frontend lives in [webapp/](webapp/), deployed to `https://tavrostechinfo.com/PROGYM/ggs/` at `/`. Backend is the PHP API in [api/](api/) + [class/](class/).
2. **wc2026-app** — a separate Vite app in [wc2026-app/](wc2026-app/), deployed under `/wc2026/` on the same Hostinger host. Has its own Firebase project (`progym-web`) for FCM.

**Rule**: When the user mentions a project name (e.g. "in progym...", "for wc2026..."), scope all edits, builds, and deployments to that project only. If ambiguous, ask which project before proceeding.

The rest of this document describes the **progym** project. wc2026-app has its own conventions — read its own files when working there.

---

## Project Overview

ProGym is a gym management application. The original Android app consumed a PHP REST API backend hosted on **Hostinger**. The goal is to **reuse these existing PHP APIs** and build a modern web app (accessible in Chrome, mobile/responsive).

- **Backend**: PHP 7.2.34 REST API + MariaDB 11.8.6 (PDO)
- **Database**: `u636480992_ggs` on Hostinger
- **Config**: [config/database.php](config/database.php)
- **Live API Base URL**: `https://tavrostechinfo.com/PROGYM/ggs/api`
- **API root**: `/api/`
- **Classes root**: `/class/`

---

## Deployment to Hostinger

Local dev runs at `http://localhost:517x/progym/` via `npm run dev` inside `webapp/`.

To deploy changes to the live server (`https://tavrostechinfo.com/PROGYM/ggs/`):

### Step 1 — Rebuild the frontend (always do this first)
```
cd C:\software\prashant\personal\progym\webapp
npm run build
```
This regenerates `webapp/dist/` from the latest source. **Never copy `dist` without rebuilding first.**

### Step 2 — Upload to Hostinger
Upload the relevant changed files/folders via Hostinger File Manager or FTP:

| What changed | Local path | Upload to (Hostinger) |
|---|---|---|
| Frontend (React app) | `webapp/dist/` (entire folder) | `/public_html/PROGYM/ggs/webapp/dist/` (replace contents) |
| Existing PHP API file modified | `api/...` | Same relative path under `/public_html/PROGYM/ggs/api/` |
| New PHP API file added | `api/...` | Same relative path under `/public_html/PROGYM/ggs/api/` |
| PHP class file modified | `class/...` | Same relative path under `/public_html/PROGYM/ggs/class/` |

> **Important**: If a new PHP file was created (e.g. a new endpoint), it must be uploaded separately — copying `dist` only updates the frontend, not the PHP backend.

### Checklist before each deployment
- [ ] Ran `npm run build` and `dist/` is freshly generated
- [ ] Identified all new or modified PHP files (not just frontend changes)
- [ ] Uploaded both `dist/` and any new/changed PHP files

---

## Architecture

```
/api/{entity}/{operation}.php   → REST endpoints (GET/POST)
/class/{Entity}.php             → Data model + DB query methods
/config/database.php            → DB connection (PDO)
```

All APIs follow a simple pattern: include the relevant class, instantiate with a DB connection, call the method, return JSON.

---

## Database Schema

> Source: `db_stucture.txt` (phpMyAdmin export, generated 2026-04-24)

### Core Entities

#### `client`
Central member/client table.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(255) | |
| mobile | varchar(255) | |
| email | varchar(255) | |
| gender | varchar(255) | |
| birthDate | varchar(255) | |
| address | varchar(255) | |
| bloodGroup | varchar(255) | |
| occupation | varchar(255) | |
| remarks | varchar(255) | |
| height | double | |
| weight | double | |
| photo | varchar(255) | filename/URL |
| reference | varchar(255) | referring client id |
| referPoints | varchar(255) | |
| previousGym | varchar(255) | |
| profileActiveFlag | varchar(255) | `'enable'` / `'disable'` |
| discontinue | varchar(255) | `'true'` / `'false'` (strings) |
| isGymClient | varchar(30) | `'yes'` / `'no'` |
| isPTClient | varchar(255) | personal trainer client flag |
| adp | varchar(255) | active diet plan template ID (→ dietplantemplate.id) |
| awp | varchar(255) | active workout main type ID (→ t_workoutmaintype.id) |
| admissionDate | varchar(30) | |
| creationSource | varchar(255) | `'app'` / `'admin'` etc |

#### `admin_user`
Admin/staff login accounts.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(30) | |
| username | varchar(20) | |
| password | varchar(20) | |
| authorizedToApprovePayment | varchar(20) | |

#### `employee`
Staff record table (separate from login accounts).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(256) | |
| email | varchar(50) | |
| age | int | |
| designation | varchar(255) | |
| created | datetime | |

#### `customer`
Legacy/alternative customer table (likely from earlier version).
| Column | Type | Notes |
|---|---|---|
| profileId | int PK AUTO_INCREMENT | |
| firstName, lastName | varchar(50) | |
| dob | varchar(50) | |
| email | varchar(50) | |
| mobile1, mobile2 | varchar(50) | |
| gender | varchar(20) | |
| creationDate, creationSource | varchar(50) | |
| discontinue | varchar(50) | |
| activePackageId | int | |
| profilePhotoId | int | |

#### `module`
Feature flags / licensing per gym.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| mac | varchar(20) | |
| email | varchar(20) | feature enabled? |
| sms | varchar(20) | |
| diet | varchar(20) | |
| workout | varchar(20) | |
| monthlyData | varchar(20) | |

---

### Membership & Billing

#### `packages`
Membership plan templates.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| days | int | plan duration |
| fees | double | |
| gender | varchar(255) | |
| description | varchar(255) | |

#### `packagedetails`
Client-specific enrollment into a package.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| packageId | int | → packages.id |
| clientId | int | → client.id |
| startDate, endDate | varchar(255) | |
| fees | double | |
| amountPaid | double | |
| paymentDate | varchar(255) | |
| status | varchar(255) | e.g. `'active'`, `'expired'` |
| description | varchar(255) | |
| discontinue | varchar(255) | |

#### `paymenttransaction`
Individual payment records linked to an enrollment.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| packageDetailsId | int | → packagedetails.id |
| clientId | varchar(255) | |
| clientGender | varchar(255) | |
| feesPaid | double | |
| paymentDate | varchar(255) | |
| paymentMode | varchar(255) | |
| isApproved | varchar(255) | `'YES'` when approved |
| discontinue | varchar(255) | |

#### `attendance`
Member check-ins.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id |
| date | varchar(15) | `d/m/Y` format |
| status | int | `1` = present |
| day | int | |
| month | int | |
| year | int | |
| timeStamp | varchar(25) | `d-m-Y h:i:s` format |

---

### Workout System

#### `t_workoutmaintype`
Template workout plan types (e.g. "Single Muscle - 1", "Ladies Level - 3").
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(255) | |
| discontinue | varchar(255) | |

#### `t_workoutsubtype`
Template exercises under each workout type.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| mtid | int | FK → t_workoutmaintype.id |
| name | varchar(255) | exercise name |
| reps | int | |
| sets | int | |
| gifFilePath | varchar(255) | animation/demo image |
| muscle | varchar(50) | muscle group targeted |
| discontinue | varchar(255) | |

#### `workoutscheduleobject`
Per-client daily workout schedule entry (auto-created on first access for that date).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id |
| mtid | varchar(50) | → t_workoutmaintype.id |
| date | varchar(255) | `d/m/Y` format |
| externalcode | int | sync reference |
| discontinue | varchar(255) | |

#### `workoutsubtype`
Actual exercises assigned to a client's daily workout (copied from template).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| wsoid | int | → workoutscheduleobject.id |
| twsid | varchar(55) | exercise name (from template) |
| maxReps | varchar(255) | |
| sets | int | |
| clientPerformance | varchar(10) | `'false'` / `'true'` |
| image | varchar(220) | gif/image path |
| externalCode | int | sync reference |
| discontinue | varchar(255) | |

#### `muscleworkout`
Maps muscle group rotation by day for "Single/Double Muscle" workout types.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| day | varchar(255) | day of week |
| mainWorkoutName | varchar(255) | matches t_workoutmaintype.name |
| subWorkoutName | varchar(255) | alternate workout assigned for that day |

**Auto-create logic**: When a client requests workout for a date with no record, the server auto-creates a `workoutscheduleobject` and populates `workoutsubtype` from the client's `awp` template (with special day-rotation logic for Single/Double Muscle types using `muscleworkout`).

---

### Diet System

#### `dietplantemplate`
Diet plan templates with up to 17 time slots. `cid = null` means it's a default/global template.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id (null = default template) |
| name | varchar(255) | template name |
| createDate | varchar(255) | |
| discontinue | varchar(255) | |
| time_1 … time_17 | varchar(255) | meal time labels |
| activity_1 … activity_17 | varchar(255) | meal descriptions |
| externalCode | int | sync reference |

FK: `cid` → `client.id`

#### `dietplanobjecttable`
Per-client daily diet log (auto-created on first access for that date).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id |
| dptid | int | → dietplantemplate.id |
| dietDate | varchar(255) | `d/m/Y` format |
| clientCompletionStatus_timeActivity_1 … _17 | varchar(255) | `'yes'` / `'no'` |
| adminDataSyncRequired | varchar(255) | |
| clientDataSyncRequired | varchar(255) | |
| discontinue | varchar(255) | |
| externalCode | int | sync reference |

FKs: `cid` → `client.id`, `dptid` → `dietplantemplate.id`

**Auto-create logic**: Server creates the daily diet object from `client.adp` template when client first accesses their diet for that date (if `profileActiveFlag = 'enable'`).

#### `diettimeslots`
Global time slot labels (17 slots: time_1 … time_17), single row configuration.

---

### Rewards / ProCoins

#### `rewards`
ProCoin reward entries per client.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| clientId | varchar(20) | |
| title | varchar(100) | |
| subTitle | varchar(100) | |
| img | varchar(200) | |
| amount | varchar(100) | coin amount |
| isRedeemed | varchar(20) | `'true'` / `'false'` |
| creditDebit | varchar(20) | |
| redeemDate | varchar(150) | |

Welcome bonus: 100 ProCoins auto-inserted on new client signup.

#### `procointransaction`
Full ledger of ProCoin movements.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| txnId | varchar(100) | reference transaction ID |
| des | varchar(100) | description |
| amount | double | |
| creditDebit | varchar(20) | `'1'` = credit, `'2'` = debit |
| txnDate | varchar(30) | |
| clientId | varchar(20) | |

---

### Shop / Orders

#### `merchandise`
Gym merchandise products.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| productName | varchar(50) | |
| oldPrice | int | |
| newPrice | int | |
| productPhoto | varchar(200) | |
| discontinue | varchar(20) | |

#### `supplements`
Supplement products with multiple photos and description.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| productName | varchar(50) | |
| oldPrice | int | |
| newPrice | int | |
| productPhoto | varchar(200) | main photo |
| productPhotoDesc | varchar(220) | secondary photo/description image |
| productPhotoDesc1 | varchar(220) | tertiary photo/description image |
| discontinue | varchar(10) | |

#### `orders`
Client purchase orders.
| Column | Type | Notes |
|---|---|---|
| order_id | int PK AUTO_INCREMENT | |
| clientId | varchar(20) | |
| name | varchar(100) | product name |
| img | varchar(200) | product image |
| date | varchar(50) | order date |
| status | varchar(20) | `'Pending'`, `'Shipped'`, `'Delivered'`, `'Cancelled'` |
| amount | double | |
| txnId | varchar(100) | payment transaction ref |
| paymentStatus | varchar(50) | `'Paid'` etc |
| trackingDetails | varchar(100) | |
| proCoinsUsed | double | |
| couponUsed | varchar(50) | `'empty'` if none |

On payment marked `'Paid'` with coupon: auto-awards 25 ProCoins + ProCoin txn record. Sends FCM push notification to admin.

#### `brand_images`
Single-row config table for all brand/gym images and branding text.
| Column | Notes |
|---|---|
| id | PK |
| brandName | gym name |
| login_brand_logo | logo for login screen |
| login_screen_banner | banner on login screen |
| banner_1 | general banner |
| owner_1, owner_2 | owner profile images |
| trainer_1, trainer_2 | trainer profile images |
| appAdvertise_1–4 | advertisement images |
| appBanner_1–4 | in-app banner images |
| appAdvertise_1–4Contact | contact info for each ad |
| appBanner_1–4Contact | contact info for each banner |
| h1–h5 | heading/tagline text fields |
| upgradePlan1_img–upgradePlan3_img | plan upgrade promo images |

---

### Social & Engagement

#### `wall`
Client social feed (photo posts with admin approval).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| clientId | varchar(50) | |
| clientName | varchar(50) | |
| clientPhoto | varchar(200) | |
| clientMobile | varchar(50) | |
| clientEmail | varchar(50) | |
| uploadDate | varchar(50) | |
| postPhoto | varchar(200) | |
| hashTag | varchar(50) | |
| isApproved | varchar(50) | `'deleted'` = soft delete |

#### `album`
Gym photo gallery albums.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(100) | album title |
| image | varchar(500) | cover image |
| url | varchar(255) | album URL |
| month | int | |
| year | int | |
| private | varchar(25) | `'false'` / `'true'` |
| discontinue | varchar(25) | |

#### `notifications`
In-app notifications.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| activity | varchar(255) | activity type |
| activityDate | varchar(255) | |
| amount | varchar(255) | |
| clientId | int | |
| clientGender | varchar(255) | |
| memberName | varchar(255) | |
| trainer | varchar(255) | assigned trainer |
| discontinue | varchar(255) | |

#### `tasks`
Daily challenge tasks with points system.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(20) | task name |
| img | varchar(255) | task image |
| timing | varchar(25) | timing/duration |
| description | varchar(100) | |
| date | varchar(20) | `d/m/Y` format |
| submitStatus | varchar(20) | |
| submitImg | varchar(255) | proof image submitted by client |
| submitTimestamp | varchar(20) | |
| isApproved | varchar(20) | |
| points | int | points awarded (10 when approved) |

#### `feedback`
Client feedback submissions.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| clientId | varchar(10) | |
| name | varchar(30) | |
| email | varchar(30) | |
| mobile | varchar(30) | |
| feedback | varchar(30) | feedback text |

---

### Admin / Ops

#### `enquiry`
Leads / prospect management.
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(50) | |
| mobile | varchar(15) | |
| email | varchar(30) | |
| updateDate | varchar(20) | |
| status | varchar(10) | `'new'` etc |
| trainer | varchar(20) | assigned trainer |
| discontinue | varchar(10) | |

#### `fcmtoken`
Firebase Cloud Messaging device tokens (table name: lowercase `fcmtoken`).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| mobile | varchar(50) | |
| token | varchar(255) | FCM device token |
| discontinue | varchar(25) | |

#### `WeightTracker`
Client weight history (last 15 entries returned by API).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id |
| date | varchar(50) | |
| weight | double | |

#### `batch_logs`
Tracks scheduled batch job runs (e.g. auto enable/disable profiles on package expiry).
| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| batchName | varchar(255) | |
| date | varchar(255) | |
| status | varchar(255) | |

---

## API Endpoints

### Generic CRUD (root-level)
- `GET  /api/read.php` — fetch all records
- `GET  /api/single_read.php?id={id}` — fetch single record
- `POST /api/create.php` — create record
- `POST /api/update.php` — update record
- `DELETE /api/delete.php` — delete record

### Authentication
- `POST /api/adminuser/validate.php` — admin login
- `GET  /api/getAdminCode.php` — get admin code
- `GET  /api/getAdminEmails.php` — get admin emails
- `GET  /api/payment_key.php` — get payment gateway key

### Client
- `GET  /api/client/byId.php?id=`
- `GET  /api/client/byName.php?name=` — LIKE search
- `GET  /api/client/byBloodGroup.php?bloodGroup=` — values: A_plus, A_minus, B_plus etc
- `GET  /api/client/byProfileActiveFlag.php?profileActiveFlag=enable/disable`
- `GET  /api/client/byGender.php?gender=`
- `GET  /api/client/allActive.php` — all active gym clients (discontinue=false, isGymClient=yes)
- `GET  /api/client/allNonGymClients.php`
- `GET  /api/client/allReferrals.php`
- `GET  /api/client/getAllByFilter.php?filter=enable/disable/enabledisable/all`
- `GET  /api/client/singleClientDataEagerLoadingById.php?id=`
- `GET  /api/client/multipleClientDataEagerLoading.php` — list with latest package info
- `GET  /api/client/multipleClientDataEagerLoadingByName.php?name=`
- `GET  /api/client/clientMemberStatPVO.php?profileActiveFlag=` — member stat view (joins with packagedetails)
- `GET  /api/client/getAllExtCodes.php`
- `POST /api/client/create.php` — admin create
- `POST /api/client/createNewClientDataToServer.php` — app self-registration
- `POST /api/client/update.php` — admin update
- `POST /api/client/updateClientProfileFromApp.php` — client edits own profile (birthDate, email, address, height, weight, photo)
- `POST /api/client/updateProfilePhoto.php`
- `POST /api/client/convertToGymClient.php` — sets isGymClient='yes'
- `DELETE /api/client/delete.php`

### Packages
- `GET  /api/package/byId.php`
- `GET  /api/package/byGender.php`
- `POST /api/package/create.php`
- `POST /api/package/update.php`
- `DELETE /api/package/delete.php`

### Package Details (Enrollment)
- `GET  /api/packageDetails/all.php`
- `GET  /api/packageDetails/byId.php`
- `GET  /api/packageDetails/byClientId.php`
- `GET  /api/packageDetails/byClientLatestPackage.php`
- `GET  /api/packageDetails/byStatusIn.php`
- `GET  /api/packageDetails/byStatusNotIn.php`
- `POST /api/packageDetails/create.php`
- `POST /api/packageDetails/update.php`
- `DELETE /api/packageDetails/delete.php`

### Payment Transactions
- `GET  /api/paymentTransaction/byId.php`
- `GET  /api/paymentTransaction/byPackageDetailsId.php`
- `GET  /api/paymentTransaction/getCollectionByMonths.php` — revenue by month (last N months)
- `GET  /api/paymentTransaction/getInvoiceByTxnId.php` — full invoice join (client+package+txn)
- `POST /api/paymentTransaction/create.php`
- `POST /api/paymentTransaction/approveById.php`

### Attendance
- `POST /api/attendance/create.php` — mark attendance (server sets date/time from IST)
- `GET  /api/attendance/byDate.php?date=&cid=`
- `GET  /api/attendance/byMonthAndYear.php?month=&year=&cid=`
- `GET  /api/attendance/byYear.php?cid=`
- `GET  /api/attendance/byToday.php?cid=`
- `GET  /api/attendance/byCurrentMonth.php?cid=`
- `GET  /api/attendance/getAllbyDate.php?date=` — all members on date (joins client)
- `GET  /api/attendance/getAllbyMonthAndYear.php?month=&year=`
- `GET  /api/attendance/getAllbyYear.php?year=`
- `GET  /api/attendance/getLastTenDaysAttendance.php` — last 10 days records with client info
- `GET  /api/attendance/getLastTenDaysCount.php` — count per day for last 10 days
- `GET  /api/dataset/markAttendanceAndGetBasicDetails.php` — QR scan: marks attendance + returns client info

### Workout Plans
- `GET  /api/t_workoutmaintype/getAll.php`
- `GET  /api/t_workoutmaintype/single_read.php`
- `POST /api/t_workoutmaintype/create.php`
- `POST /api/t_workoutmaintype/update.php`
- `GET  /api/t_workoutsubtype/getAll.php`
- `GET  /api/t_workoutsubtype/getAllByMainTypeId.php`
- `GET  /api/t_workoutsubtype/getAllDistinct.php`
- `POST /api/t_workoutsubtype/create.php`
- `POST /api/t_workoutsubtype/update.php`
- `GET  /api/workoutScheduleObject/byClientIdAndDate.php?cid=&date=` — **auto-creates schedule if missing**
- `GET  /api/workoutScheduleObject/getAllByClientId.php?cid=`
- `GET  /api/workoutScheduleObject/getAllExtCodes.php`
- `POST /api/workoutScheduleObject/create.php`
- `POST /api/workoutScheduleObject/update.php`
- `GET  /api/workoutSubType/getSubWorkoutPlansByWsoId.php?wsoid=` — exercises for a day
- `POST /api/workoutSubType/update.php`
- `POST /api/workoutSubType/updateClientWorkoutPlanStatusToServer.php`
- `GET  /api/muscleworkout/all.php`

### Diet Plans
- `GET  /api/dietplantemplate/getDefaultDietTemplates.php` — global templates (cid is null/0)
- `GET  /api/dietplantemplate/getClientPreviousTemplates.php?cid=` — client's past templates
- `GET  /api/dietplantemplate/byId.php?id=`
- `GET  /api/dietplantemplate/getMaxId.php`
- `POST /api/dietplantemplate/create.php`
- `POST /api/dietplantemplate/update.php`
- `GET  /api/dietplanobjecttable/byCidAndDate.php?cid=&dietDate=` — **auto-creates diet log if missing**
- `GET  /api/dietplanobjecttable/all.php`
- `GET  /api/dietplanobjecttable/byId.php`
- `POST /api/dietplanobjecttable/create.php`
- `POST /api/dietplanobjecttable/update.php`
- `POST /api/dietplanobjecttable/updateClientDietPlanStatus.php` — mark a meal slot as done
- `GET  /api/diettimeslots/getAll.php`

### Rewards & ProCoins
- `GET  /api/rewards/retrieve.php?clientId=`
- `POST /api/rewards/create.php`
- `POST /api/rewards/update.php`
- `GET  /api/procointransaction/retrieve.php?clientId=`
- `POST /api/procointransaction/create.php`
- `POST /api/procointransaction/update.php`

### Shop
- `GET  /api/merchandise/getAllMerchandise.php`
- `POST /api/merchandise/update.php`
- `POST /api/merchandise/updatePhoto.php`
- `GET  /api/supplements/getAllSupplements.php`
- `POST /api/supplements/update.php`
- `POST /api/supplements/updatePhoto.php`
- `POST /api/supplements/updatePhotoDesc.php`
- `POST /api/supplements/updatePhotoDesc1.php`
- `GET  /api/orders/getAllOrders.php?filter=all/Pending/Shipped/Delivered/Cancelled`
- `GET  /api/orders/retrieve.php?clientId=`
- `GET  /api/orders/getMaxId.php`
- `POST /api/orders/create.php`
- `POST /api/orders/update.php` — client updates order (triggers ProCoin award + FCM on Paid)
- `POST /api/orders/updateOrderStatus.php` — admin updates status (triggers FCM to client)
- `GET  /api/brand_images/retrieve.php`
- `POST /api/brand_images/update.php`

### Wall (Social Feed)
- `GET  /api/wall/getAll.php`
- `GET  /api/wall/getByClientId.php?clientId=`
- `POST /api/wall/create.php`
- `POST /api/wall/update.php` — admin approve/reject/delete

### Notifications
- `GET  /api/notifications/all.php`
- `GET  /api/notifications/byUser.php?trainer=`
- `GET  /api/notifications/byActivity.php?activity=`
- `POST /api/notifications/create.php`
- `DELETE /api/notifications/delete.php`

### Enquiries (Leads)
- `GET  /api/enquiry/all.php`
- `GET  /api/enquiry/byId.php`
- `GET  /api/enquiry/byTrainer.php`
- `GET  /api/enquiry/byGreaterThanDate.php`
- `POST /api/enquiry/create.php`
- `POST /api/enquiry/update.php`
- `DELETE /api/enquiry/delete.php`

### Misc / Utilities
- `GET  /api/isUserMobileExists.php?mobile=` — returns client id or '0'
- `GET  /api/isUserMobileExistsWithActiveProfile.php?mobile=` — returns id only if enable+not discontinued
- `GET  /api/getClientNameByMobile.php?mobile=`
- `GET  /api/getLatestAppVersion.php`
- `POST /api/upload.php` — file/image upload
- `GET  /api/status.php` — API health check
- `GET  /api/level1_view/all.php` — full active member view
- `GET  /api/level1_view/allMale.php`
- `GET  /api/level1_view/allFemale.php`
- `GET  /api/WeightTracker/byCid.php?cid=` — last 15 weight entries
- `POST /api/WeightTracker/add.php`
- `DELETE /api/WeightTracker/deleteById.php`
- `GET  /api/tasks/getTodaysTask.php`
- `GET  /api/tasks/getAllByDate.php?date=`
- `GET  /api/tasks/getAllPoints.php` — points grouped by date
- `POST /api/tasks/updateStatusToServer.php` — approve task (sets points=10)
- `POST /api/tasks/updateSubmitStatusImg.php` — client submits proof photo
- `GET  /api/fcmToken/all.php`
- `GET  /api/fcmToken/byMobile.php?mobile=`
- `POST /api/fcmToken/byMobiles.php`
- `POST /api/fcmToken/create.php`
- `POST /api/fcmToken/update.php`
- `POST /api/feedback/create.php`
- `GET  /api/dataset/getAdmissionDetails.php`
- `GET  /api/dataset/getClientAndPackagedetailsByMobile.php`
- `POST /api/batchlogs/create.php`
- `GET  /api/batchlogs/checkIfBatchCompleted.php`
- `POST /api/batchlogs/triggerEnableDisableProfileBatch.php`
- `POST /api/adminuser/fixCorruptedProfiles.php`

---

## Key Business Rules

1. **Soft Delete**: `discontinue = 'true'` (string, not boolean) marks records inactive across all tables.
2. **Date format**: `d/m/Y` everywhere (e.g. `24/04/2026`). Timezone: `Asia/Calcutta` (IST). Timestamps use `d-m-Y h:i:s`.
3. **ProCoins**:
   - 100 coins awarded on signup (auto-inserted into `rewards` + `procointransaction`)
   - 25 coins awarded when order paid with coupon
   - `procointransaction.creditDebit`: `'1'` = credit, `'2'` = debit (stored as varchar string)
4. **Auto workout/diet creation**: Server auto-creates the daily `workoutscheduleobject` / `dietplanobjecttable` record from `client.awp` / `client.adp` template when client first accesses for that date — only if `profileActiveFlag = 'enable'`.
5. **FCM Push Notifications**: Order updates send FCM push. Admin mobile is hard-coded as `8796655176` in server code.
6. **profileActiveFlag**: `'enable'` = active member, `'disable'` = paused/expired.
7. **isGymClient**: `'yes'` = paid gym member, `'no'` = app-only self-registered user.
8. **Batch jobs**: `batch_logs` tracks automated jobs that enable/disable client profiles based on `packagedetails.endDate`.
9. **`module` table**: Single-row feature flag table that controls which features (diet, workout, email, sms, etc.) are active for the gym instance.
10. **`fcmtoken` table name**: Actual DB table is `fcmtoken` (all lowercase), even though PHP class files reference it as `fcmToken`.

---

## Web App Goal

Build a Chrome-accessible web app (mobile-responsive) that:
- **Reuses all existing PHP APIs** (no backend changes, APIs stay on Hostinger)
- Covers both **admin panel** and **client/member portal**
- Replaces the original Android app

### Suggested Tech Stack (Frontend)
- React (with TypeScript) + Vite
- React Router for navigation
- Tailwind CSS for styling (mobile-first)
- Axios or fetch for API calls
- PWA support (installable on mobile like an app)

### Key Screens to Build
**Admin Side:**
- Dashboard (attendance today, collections summary, active members count)
- Member management (list, add, edit, package enrollment, payment recording)
- Enquiry / leads management
- Workout plan template management (t_workoutmaintype, t_workoutsubtype)
- Diet plan template management
- Wall post moderation (approve/reject)
- Orders management (status updates)
- Reports (monthly revenue, attendance trends)
- Branding / brand_images config
- Album / photo gallery management

**Client/Member Side:**
- Login (by mobile number)
- Dashboard (today's workout, diet progress, attendance streak)
- Workout tracker (view exercises with GIFs, mark performance)
- Diet tracker (17 meal slots, mark each as done)
- Attendance history (calendar view)
- ProCoins / rewards wallet
- Shop (merchandise + supplements, place order with ProCoin redemption)
- Wall (post photos, view feed)
- Weight tracker (chart last 15 entries)
- Profile edit (birthDate, email, address, height, weight, photo)
