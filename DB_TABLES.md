# ProGym — Database Tables Reference

Database: `u636480992_ggs` | Engine: MariaDB 11.8.6 | PDO via PHP 7.2.34

---

## Table Index

| Table | Category | Description |
|---|---|---|
| [client](#client) | Core | Member / client profiles |
| [admin_user](#admin_user) | Core | Admin / staff login accounts |
| [employee](#employee) | Core | Staff records |
| [customer](#customer) | Core | Legacy customer table |
| [module](#module) | Core | Feature flags per gym instance |
| [packages](#packages) | Membership | Membership plan templates |
| [packagedetails](#packagedetails) | Membership | Client enrollments |
| [paymenttransaction](#paymenttransaction) | Membership | Payment records |
| [attendance](#attendance) | Membership | Member check-ins |
| [t_workoutmaintype](#t_workoutmaintype) | Workout | Workout plan type templates |
| [t_workoutsubtype](#t_workoutsubtype) | Workout | Exercise templates |
| [workoutscheduleobject](#workoutscheduleobject) | Workout | Per-client daily workout schedule |
| [workoutsubtype](#workoutsubtype) | Workout | Per-client daily exercises |
| [muscleworkout](#muscleworkout) | Workout | Muscle group day-rotation map |
| [dietplantemplate](#dietplantemplate) | Diet | Diet plan templates (17 slots) |
| [dietplanobjecttable](#dietplanobjecttable) | Diet | Per-client daily diet log |
| [diettimeslots](#diettimeslots) | Diet | Global time slot labels |
| [rewards](#rewards) | ProCoins | ProCoin reward entries |
| [procointransaction](#procointransaction) | ProCoins | ProCoin ledger |
| [merchandise](#merchandise) | Shop | Gym merchandise products |
| [supplements](#supplements) | Shop | Supplement products |
| [orders](#orders) | Shop | Client purchase orders |
| [brand_images](#brand_images) | Shop | Branding config (single row) |
| [wall](#wall) | Social | Client social feed posts |
| [album](#album) | Social | Gym photo gallery albums |
| [notifications](#notifications) | Social | In-app notifications |
| [tasks](#tasks) | Social | Daily challenge tasks |
| [feedback](#feedback) | Social | Client feedback submissions |
| [enquiry](#enquiry) | Admin/Ops | Leads / prospect management |
| [fcmtoken](#fcmtoken) | Admin/Ops | FCM device tokens |
| [WeightTracker](#weighttracker) | Admin/Ops | Client weight history |
| [batch_logs](#batch_logs) | Admin/Ops | Batch job run tracker |

---

## Core

### client
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
| photo | varchar(255) | filename / URL |
| reference | varchar(255) | referring client id |
| referPoints | varchar(255) | |
| previousGym | varchar(255) | |
| profileActiveFlag | varchar(255) | `'enable'` / `'disable'` |
| discontinue | varchar(255) | `'true'` / `'false'` (strings) |
| isGymClient | varchar(30) | `'yes'` / `'no'` |
| isPTClient | varchar(255) | personal trainer client flag |
| adp | varchar(255) | active diet plan template ID → dietplantemplate.id |
| awp | varchar(255) | active workout main type ID → t_workoutmaintype.id |
| admissionDate | varchar(30) | |
| creationSource | varchar(255) | `'app'` / `'admin'` etc |

---

### admin_user
Admin/staff login accounts.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(30) | |
| username | varchar(20) | |
| password | varchar(20) | |
| authorizedToApprovePayment | varchar(20) | |

---

### employee
Staff record table (separate from login accounts).

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(256) | |
| email | varchar(50) | |
| age | int | |
| designation | varchar(255) | |
| created | datetime | |

---

### customer
Legacy/alternative customer table (likely from earlier version).

| Column | Type | Notes |
|---|---|---|
| profileId | int PK AUTO_INCREMENT | |
| firstName | varchar(50) | |
| lastName | varchar(50) | |
| dob | varchar(50) | |
| email | varchar(50) | |
| mobile1 | varchar(50) | |
| mobile2 | varchar(50) | |
| gender | varchar(20) | |
| creationDate | varchar(50) | |
| creationSource | varchar(50) | |
| discontinue | varchar(50) | |
| activePackageId | int | |
| profilePhotoId | int | |

---

### module
Feature flags / licensing per gym (single row).

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

## Membership & Billing

### packages
Membership plan templates.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| days | int | plan duration |
| fees | double | |
| gender | varchar(255) | |
| description | varchar(255) | |

---

### packagedetails
Client-specific enrollment into a package.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| packageId | int | → packages.id |
| clientId | int | → client.id |
| startDate | varchar(255) | |
| endDate | varchar(255) | |
| fees | double | |
| amountPaid | double | |
| paymentDate | varchar(255) | |
| status | varchar(255) | `'active'`, `'expired'` etc |
| description | varchar(255) | |
| discontinue | varchar(255) | |

---

### paymenttransaction
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

---

### attendance
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

## Workout System

### t_workoutmaintype
Template workout plan types (e.g. "Single Muscle - 1", "Ladies Level - 3").

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(255) | |
| discontinue | varchar(255) | |

---

### t_workoutsubtype
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

---

### workoutscheduleobject
Per-client daily workout schedule entry. Auto-created on first access for that date.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id |
| mtid | varchar(50) | → t_workoutmaintype.id |
| date | varchar(255) | `d/m/Y` format |
| externalcode | int | sync reference |
| discontinue | varchar(255) | |

---

### workoutsubtype
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

---

### muscleworkout
Maps muscle group rotation by day for "Single/Double Muscle" workout types.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| day | varchar(255) | day of week |
| mainWorkoutName | varchar(255) | matches t_workoutmaintype.name |
| subWorkoutName | varchar(255) | alternate workout assigned for that day |

---

## Diet System

### dietplantemplate
Diet plan templates with up to 17 time slots. `cid = null` means global/default template.

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

---

### dietplanobjecttable
Per-client daily diet log. Auto-created on first access for that date.

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

---

### diettimeslots
Global time slot labels (17 slots), single row configuration.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| time_1 … time_17 | varchar(255) | slot labels |

---

## Rewards / ProCoins

### rewards
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

> 100 ProCoins auto-inserted on new client signup.

---

### procointransaction
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

## Shop / Orders

### merchandise
Gym merchandise products.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| productName | varchar(50) | |
| oldPrice | int | |
| newPrice | int | |
| productPhoto | varchar(200) | |
| discontinue | varchar(20) | |

---

### supplements
Supplement products with multiple photos.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| productName | varchar(50) | |
| oldPrice | int | |
| newPrice | int | |
| productPhoto | varchar(200) | main photo |
| productPhotoDesc | varchar(220) | secondary photo / description image |
| productPhotoDesc1 | varchar(220) | tertiary photo / description image |
| discontinue | varchar(10) | |

---

### orders
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
| couponUsed | varchar(50) | `'empty'` if none used |

> On `paymentStatus = 'Paid'` with coupon: auto-awards 25 ProCoins + sends FCM push to admin.

---

### brand_images
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
| h1–h5 | heading / tagline text fields |
| upgradePlan1_img–upgradePlan3_img | plan upgrade promo images |

---

## Social & Engagement

### wall
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

---

### album
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

---

### notifications
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

---

### tasks
Daily challenge tasks with points system.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| name | varchar(20) | task name |
| img | varchar(255) | task image |
| timing | varchar(25) | timing / duration |
| description | varchar(100) | |
| date | varchar(20) | `d/m/Y` format |
| submitStatus | varchar(20) | |
| submitImg | varchar(255) | proof image submitted by client |
| submitTimestamp | varchar(20) | |
| isApproved | varchar(20) | |
| points | int | points awarded (10 when approved) |

---

### feedback
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

## Admin / Ops

### enquiry
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

---

### fcmtoken
Firebase Cloud Messaging device tokens. **Table name is all-lowercase** (`fcmtoken`).

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| mobile | varchar(50) | |
| token | varchar(255) | FCM device token |
| discontinue | varchar(25) | |

---

### WeightTracker
Client weight history. API returns last 15 entries.

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| cid | int | → client.id |
| date | varchar(50) | |
| weight | double | |

---

### batch_logs
Tracks scheduled batch job runs (e.g. auto enable/disable profiles on package expiry).

| Column | Type | Notes |
|---|---|---|
| id | int PK AUTO_INCREMENT | |
| batchName | varchar(255) | |
| date | varchar(255) | |
| status | varchar(255) | |

---

## Global Rules

| Rule | Detail |
|---|---|
| Soft delete | `discontinue = 'true'` (string) across all tables |
| Date format | `d/m/Y` (e.g. `30/04/2026`), timezone Asia/Calcutta (IST) |
| Timestamp format | `d-m-Y h:i:s` |
| Boolean-like flags | Stored as strings: `'true'`/`'false'`, `'yes'`/`'no'`, `'enable'`/`'disable'` |
| ProCoin creditDebit | `'1'` = credit, `'2'` = debit (varchar) |
| Auto-create records | `workoutscheduleobject` and `dietplanobjecttable` are auto-created on first daily access (requires `profileActiveFlag = 'enable'`) |
