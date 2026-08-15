# ProGym API — Security Implementation Plan

---

## 1. Context & Final Decisions

### Project Goal
Add API security to the ProGym app without breaking the current live production system.
Once tested, cut over to the secured version.

### Clients & Their Constraints

| Client | Hits Which Path | Source Code? | Can Update? |
|---|---|---|---|
| React Web App (webapp/) | `/api/` today → `/progym_v2/api/` after cutover | Yes | Yes |
| Java / Spring Boot Desktop App | `/api/` (PROGYM/ggs/) | **Lost** | **No — frozen forever** |
| Android App | `/api/` (PROGYM/ggs/) | Yes | Yes (new builds only) |

### Final Architecture: Parallel Environment Strategy

**The Java desktop source code is lost — it can never be updated.**
Therefore we cannot add security to the existing `/PROGYM/ggs/` path.

**Decision**: Build a complete parallel environment `progym_v2/` on Hostinger.
- Old `PROGYM/ggs/` → **frozen, never touched**, Java desktop + old Android keep working
- New `progym_v2/` → secured, React web app + new Android builds point here
- **Cutover**: Once tested, delete `PROGYM/ggs/`, rename `progym_v2/` → `PROGYM/ggs/`

```
Hostinger /public_html/
 ├── PROGYM/
 │    └── ggs/            ← PRODUCTION — NEVER TOUCH (Java desktop + old Android)
 │         ├── api/
 │         ├── class/
 │         ├── config/
 │         └── webapp/dist/
 │
 └── progym_v2/           ← NEW TEST ENV (React + future Android)
      ├── api/            ← secured copy of all endpoints
      ├── class/          ← SQL-injection-fixed class files
      ├── config/         ← new secure config (auth, cors, validate, db)
      └── webapp/dist/    ← React build pointing to progym_v2/api/
```

**Local codebases — two separate folders:**
- `c:\software\prashant\personal\progym\` → current production source, **do not touch**
- `c:\software\prashant\personal\progym_v2\` → v2 security source, all changes go here

**Confirmed answers:**
- **Q1 — Hostinger path**: `/public_html/progym_v2/` → URL: `https://tavrostechinfo.com/progym_v2/`
- **Q2 — Local codebase**: Separate folder `progym_v2\` — zero risk to current production source

**Key URLs:**
- Production API (old, frozen): `https://tavrostechinfo.com/PROGYM/ggs/api`
- V2 API (new, secured): `https://tavrostechinfo.com/progym_v2/api`
- V2 Media base: `https://tavrostechinfo.com/progym_v2`

---

## 2. Security Issues Being Fixed

| # | Issue | Severity | Fixed In Step |
|---|---|---|---|
| SQL injection in all class files | String-concatenated queries | Critical | 3, 4, 5 |
| No authentication on any endpoint | Zero access control | Critical | 2, 6, 7, 8 |
| Admin password returned in login response | Exposes credentials | Critical | 9 |
| Passwords stored as plaintext in DB | DB leak = full compromise | High | 9 (partial) |
| DB credentials hardcoded in source | config/database.php | High | 2 |
| Firebase key hardcoded in source | api/orders/approveCoinRedemption.php | High | 9 |
| CORS wildcard (`*`) on all endpoints | Any website can call API | Medium | 2 |
| Debug `echo $sqlQuery` in class files | Leaks DB structure | Medium | 3 |
| No input validation | Untyped, unbounded inputs | Medium | 2 (helpers) |
| Sensitive error messages exposed | DB error printed in response | Low | 2 |

---

## 3. Complete File Inventory

### Class Files (39 files — all under `class/`)

Files with **confirmed SQL injection** (string concatenation found):
- `class/client.php` — getClient, createClientFromApp, createClient, update, byName, byGender, byBloodGroup, byProfileActiveFlag
- `class/adminuser.php` — validate() (login query)
- `class/attendance.php` — create, getByDate, getByMonth, getByYear, getAllByDate, getAllByMonthAndYear, getByCurrentMonth
- `class/packageDetails.php` — create, update, byId, byClientId, all
- `class/paymenttransaction.php` — create, update, byId, byPackageDetailsId
- `class/enquiry.php` — create, update, all, byId, byTrainer
- `class/wall.php` — create, update, getAll, getByClientId

Remaining class files (scan for injection during Step 5):
```
class/Dietplanobjecttable.php    class/dietPlanTemplate.php
class/packages.php               class/level1_view.php
class/procointransaction.php     class/WeightTracker.php
class/Merchandise.php            class/t_workoutmaintype.php
class/license.php                class/rewards.php
class/t_workoutsubtype.php       class/employees.php
class/WorkoutSubType.php         class/batchlogs.php
class/dataset.php                class/brand_images.php
class/Feedback.php               class/muscleworkout.php
class/Supplements.php            class/orders.php
class/diettimeslots.php          class/tasks.php
class/notifications.php          class/fcmToken.php
class/Module.php                 class/WorkoutScheduleObject.php
class/WelcomeEmail.php           class/BeforeAfterPhotos.php
class/PaymentEmail.php           class/ProCoinEmail.php
class/ReminderEmail.php          class/CoinEarningRules.php
class/UserNotifications.php      class/CoinCreditEvents.php
```

### API Endpoint Files (complete list, grouped by directory)

**Root level** (`api/*.php`) — path depth: `../config/`
```
status.php                    getClientNameByMobile.php
read.php                      create.php
getAdminCode.php              upload.php
getAdminEmails.php            imgconvert.php
pro_update.php                single_read.php
isUserMobileExistsWithActiveProfile.php
payment_key.php               update.php
updateApp.php                 delete.php
getLatestAppVersion.php       isUserMobileExists.php
attendance.php
```

**Subdirectories** (`api/{group}/*.php`) — path depth: `../../config/`
```
adminuser/      validate.php, validateByMobile.php, getAll.php, getByMobile.php
                create.php, update.php, delete.php, fixCorruptedProfiles.php

attendance/     (via root api/attendance.php — no subdirectory files)

batchlogs/      create.php, checkIfBatchCompleted.php, triggerEnableDisableProfileBatch.php

brand_images/   retrieve.php, update.php

client/         byId.php, byName.php, byGender.php, byBloodGroup.php
                byProfileActiveFlag.php, allActive.php, allNonGymClients.php
                allReferrals.php, getAllByFilter.php, getAllExtCodes.php
                multipleClientDataEagerLoading.php
                multipleClientDataEagerLoadingByName.php
                singleClientDataEagerLoadingById.php
                clientMemberStatPVO.php, convertToGymClient.php
                createNewClientDataToServer.php  ← PUBLIC (no auth)
                create.php, update.php, delete.php
                updateClientProfileFromApp.php (if exists)

dataset/        getAdmissionDetails.php, getClientAndPackagedetailsByMobile.php
                markAttendanceAndGetBasicDetails.php

dietplanobjecttable/  all.php, byId.php, byCidAndDate.php
                      create.php, update.php, updateClientDietPlanStatus.php

dietplantemplate/     byId.php, getDefaultDietTemplates.php
                      getClientPreviousTemplates.php, single_read_ext.php

enquiry/        all.php, byId.php, byTrainer.php, byGreaterThanDate.php
                create.php, update.php, delete.php

fcmToken/       all.php, byMobile.php, byMobiles.php, create.php, update.php

feedback/       create.php

level1_view/    all.php, allMale.php, allFemale.php

merchandise/    getAllMerchandise.php, update.php, updatePhoto.php

muscleworkout/  all.php

notifications/  all.php, create.php, byActivity.php, byUser.php, delete.php

orders/         getAllOrders.php, retrieve.php, getMaxId.php
                create.php, update.php, updateOrderStatus.php
                getCoinRedemptions.php, getMyCoinRedemptions.php
                approveCoinRedemption.php  ← has hardcoded Firebase key
                rejectCoinRedemption.php

package/        byId.php, byGender.php, create.php, update.php, delete.php

packageDetails/ all.php, byId.php, byClientId.php, byClientLatestPackage.php
                byStatusIn.php, byStatusNotIn.php
                create.php, update.php, delete.php

paymentTransaction/  byId.php, getCollectionByMonths.php, getInvoiceByTxnId.php
                     create.php, approveById.php

procointransaction/  create.php, retrieve.php, update.php, getAllCredits.php
                     getBalance.php, getCreditsByPeriod.php
                     getMemberSummary.php, getAllTransactions.php

rewards/        create.php, retrieve.php, update.php

supplements/    getAllSupplements.php, update.php
                updatePhoto.php, updatePhotoDesc.php, updatePhotoDesc1.php

t_workoutmaintype/   create.php, getAll.php, single_read.php, update.php

t_workoutsubtype/    create.php, getAll.php, getAllByMainTypeId.php
                     getAllDistinct.php, single_read.php, update.php

tasks/          getTodaysTask.php, getAllByDate.php, getAllPoints.php
                updateStatusToServer.php, updateSubmitStatusImg.php

wall/           getAll.php, getByClientId.php, create.php, update.php

WeightTracker/  byCid.php, byCidList.php, add.php, deleteById.php

workoutScheduleObject/  getAllByClientId.php, getAllExtCodes.php
                        create.php, single_read.php, update.php

workoutSubType/ getSubWorkoutPlansByWsoId.php, create.php, single_read.php
                update.php, updateClientWorkoutPlanStatusToServer.php
                getAllExtCodes.php
```

**Public endpoints (no auth required — self-registration flow):**
- `api/status.php`
- `api/isUserMobileExists.php`
- `api/isUserMobileExistsWithActiveProfile.php`
- `api/client/createNewClientDataToServer.php`
- `api/getLatestAppVersion.php`

---

## 4. Reference Patterns (use these during implementation)

### Pattern A — SQL Injection Fix (class files)

**BEFORE (vulnerable):**
```php
$sqlQuery = "SELECT * FROM client WHERE id = " . $this->id;
$stmt = $this->conn->prepare($sqlQuery);
$stmt->execute();
```

**AFTER (safe):**
```php
$sqlQuery = "SELECT * FROM client WHERE id = :id";
$stmt = $this->conn->prepare($sqlQuery);
$stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
$stmt->execute();
```

**BEFORE (vulnerable INSERT/UPDATE with strings):**
```php
$sqlQuery = "INSERT INTO client SET
    name = '".$this->name."',
    mobile = '".$this->mobile."'";
```

**AFTER (safe):**
```php
$sqlQuery = "INSERT INTO client SET
    name = :name,
    mobile = :mobile";
$stmt = $this->conn->prepare($sqlQuery);
$stmt->bindParam(':name',   $this->name,   PDO::PARAM_STR);
$stmt->bindParam(':mobile', $this->mobile, PDO::PARAM_STR);
```

**PDO type constants:**
- `PDO::PARAM_INT` — for id, cid, numeric IDs, int columns
- `PDO::PARAM_STR` — for all varchar/text columns
- `PDO::PARAM_STR` — for double/float (PDO has no PARAM_FLOAT; use STR)

---

### Pattern B — Secured API Endpoint Header (subdirectory files)

Replace the existing 5-line CORS block at the top of every subdirectory endpoint with:

**BEFORE (current — every endpoint has this):**
```php
<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
```

**AFTER (secured):**
```php
<?php
    require_once '../../config/cors.php';
    require_once '../../config/auth.php';
    applyCors();
    requireApiKey();
```

For **root-level** files (`api/*.php`) the path is one level shorter:
```php
<?php
    require_once '../config/cors.php';
    require_once '../config/auth.php';
    applyCors();
    requireApiKey();
```

For **public endpoints** (no auth): include cors.php but NOT auth.php, and do NOT call `requireApiKey()`:
```php
<?php
    require_once '../../config/cors.php';
    applyCors();
    // no requireApiKey() here
```

---

### Pattern C — config/database.php include path (no change needed)

All existing endpoints already have:
```php
include_once '../../config/database.php';   // subdirectory endpoints
include_once '../config/database.php';      // root-level endpoints
```
These paths stay exactly the same — we update the file in-place.

---

## 5. Implementation Steps

Each step ends with a validation checkpoint. Do not move to the next step until the current one is confirmed.

---

### STEP 1 — Create Local progym_v2 Codebase
**What**: Copy the current `progym\` folder to a new `progym_v2\` folder. All security work happens in `progym_v2\`. The original `progym\` is never touched again.

**Local folder layout after this step:**
```
c:\software\prashant\personal\
  ├── progym\         ← original, frozen reference (do not open or edit)
  └── progym_v2\      ← new working copy, all security changes go here
        ├── api\
        ├── class\
        ├── config\
        └── webapp\
```

**What to copy — use Windows Explorer or xcopy:**
```
xcopy "c:\software\prashant\personal\progym" "c:\software\prashant\personal\progym_v2" /E /I /H /EXCLUDE:exclude.txt
```

Create `exclude.txt` in `progym\` containing these lines before running xcopy:
```
webapp\node_modules\
webapp\dist\
.git\
```

Or manually copy these folders only (simpler and safer):
- `api\` → copy entire folder
- `class\` → copy entire folder
- `config\` → copy entire folder
- `webapp\` → copy entire folder **except** `node_modules\` and `dist\`
- Copy root files: `CLAUDE.md`, `SECURITY_TASKS.md`, `db_stucture.txt`, `vite.config*` if any at root

**After copying — install webapp dependencies in progym_v2:**
```
cd c:\software\prashant\personal\progym_v2\webapp
npm install
```

**Verify the build works:**
```
npm run build
```
Should produce `webapp\dist\` with no errors.

**Do NOT set up a git repo in progym_v2** unless you want separate version history. Working without git is fine for this security sprint.

**Validation**: `progym_v2\webapp\` builds cleanly. Open `progym_v2\api\client\allActive.php` — it should look identical to `progym\api\client\allActive.php`. Confirm `progym\` folder is untouched.

---

### STEP 2 — Create Security Config Infrastructure
**What**: Create 3 new files in `config/` and update `config/database.php`.
No class or endpoint files touched yet. Does not affect old `PROGYM/ggs/` at all.

**Files to create:**

**`config/auth.php`**
```php
<?php
function requireApiKey() {
    $secrets = include __DIR__ . '/secrets.local.php';
    $validKey = $secrets['API_KEY'] ?? '';
    $headers = getallheaders();
    $provided = $headers['X-Api-Key'] ?? $headers['x-api-key'] ?? '';
    if (!$provided || !hash_equals($validKey, $provided)) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit;
    }
}
```

**`config/cors.php`**
```php
<?php
function applyCors() {
    $allowedOrigins = [
        'https://tavrostechinfo.com',
        'http://localhost:5173',
        'http://localhost:5174',
    ];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Vary: Origin");
    }
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key, X-Requested-With");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: DENY");
    header("Referrer-Policy: no-referrer");
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
```

**`config/validate.php`**
```php
<?php
function requireInt(string $key, array $source): int {
    $val = $source[$key] ?? null;
    if ($val === null || !is_numeric($val)) {
        http_response_code(400);
        echo json_encode(["error" => "Missing or invalid parameter: $key"]);
        exit;
    }
    return (int)$val;
}
function requireString(string $key, array $source, int $maxLen = 255): string {
    $val = $source[$key] ?? null;
    if ($val === null) {
        http_response_code(400);
        echo json_encode(["error" => "Missing parameter: $key"]);
        exit;
    }
    return substr(trim((string)$val), 0, $maxLen);
}
function optionalString(string $key, array $source, string $default = '', int $maxLen = 255): string {
    return substr(trim((string)($source[$key] ?? $default)), 0, $maxLen);
}
function requireEnum(string $key, array $source, array $allowed): string {
    $val = $source[$key] ?? null;
    if (!in_array($val, $allowed, true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid value for: $key"]);
        exit;
    }
    return $val;
}
```

**`config/secrets.local.php`** (local dev only — never upload to Hostinger)

This file holds all credentials for local development in `progym_v2\`. Create it manually after STEP 1.
Generate a strong API key first: open any terminal and run `openssl rand -hex 32` (or use an online generator for 64 hex chars). Use the same key everywhere.

```php
<?php
return [
    'DB_HOST' => 'localhost',
    'DB_NAME' => 'u636480992_ggs',
    'DB_USER' => 'u636480992_ggs',
    'DB_PASS' => '##Ppp7771',
    'FCM_KEY'  => 'AAAArT6uHZ8:APA91bG2R01CatD2LOa-1dePZEQu0rZ3cioXD0CR53iWrBKdfP0zFxWYU4OYjIHHGQewA8oR3WLoIc_5aUN6EwQys6DDzzx_msYNwD0LTcq8PJ9jqifeIMgeMpYl9-5ON5ZOgwZSzlvi',
    'API_KEY'  => '<your-generated-64-char-hex-key>',
];
```

**Update `config/database.php`** — load credentials from secrets file, suppress error details:
```php
<?php
class Database {
    private $host;
    private $database_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $secrets = include __DIR__ . '/secrets.local.php';
        $this->host          = $secrets['DB_HOST'];
        $this->database_name = $secrets['DB_NAME'];
        $this->username      = $secrets['DB_USER'];
        $this->password      = $secrets['DB_PASS'];
    }

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->database_name,
                $this->username,
                $this->password
            );
            $this->conn->exec("set names utf8");
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database connection failed"]);
            exit;
        }
        return $this->conn;
    }
}
```

**Add `config/secrets.local.php` to `.gitignore`** in `progym_v2\` (if using git):
```
config/secrets.local.php
webapp/.env
webapp/.env.local
webapp/.env.*.local
webapp/.env.production
webapp/.env.development
```

**Note**: The Hostinger production secrets file is created separately in STEP 11 — it lives outside `public_html/` on the server and is never uploaded from local.

**Validation**: All 4 config files exist in `progym_v2\config\`. No PHP parse errors. Load `config/database.php` via browser against local PHP server — DB connects successfully. `config/auth.php` returns 401 when called without the header.

---

### STEP 3 — Fix SQL Injection: client.php + adminuser.php
**Working folder**: `c:\software\prashant\personal\progym_v2\`
**Files**: `class/client.php`, `class/adminuser.php`
**Also**: Remove `echo $sqlQuery;` debug lines from `class/client.php` (~line 218, ~line 274)

Full `class/client.php` and `class/adminuser.php` rewrite using Pattern A.
All string-concatenated queries → named PDO parameters.

**Validation**: Test via React app (running against local PHP server pointed at `progym_v2\`) that client list, client search, and admin login still work correctly.

---

### STEP 4 — Fix SQL Injection: attendance.php + packageDetails.php + paymenttransaction.php
**Files**: `class/attendance.php`, `class/packageDetails.php`, `class/paymenttransaction.php`

All string-concatenated queries → named PDO parameters.

**Validation**: Test attendance marking and package/payment operations via React app.

---

### STEP 5 — Fix SQL Injection: enquiry.php + wall.php + remaining class files
**Files**: `class/enquiry.php`, `class/wall.php`, and scan + fix all remaining class files:
```
Dietplanobjecttable.php  dietPlanTemplate.php   packages.php
procointransaction.php   Merchandise.php        Supplements.php
diettimeslots.php        notifications.php      level1_view.php
WeightTracker.php        t_workoutmaintype.php  t_workoutsubtype.php
rewards.php              batchlogs.php          brand_images.php
muscleworkout.php        orders.php             tasks.php
fcmToken.php             WorkoutScheduleObject.php  WorkoutSubType.php
dataset.php              Module.php             CoinEarningRules.php
employees.php            BeforeAfterPhotos.php  UserNotifications.php
CoinCreditEvents.php
```

Email class files (`WelcomeEmail.php`, `PaymentEmail.php`, `ReminderEmail.php`, `ProCoinEmail.php`, `ProCoinEmail.php`) — check for any query methods.

**Validation**: All class files pass a grep for `'".$this->` and `'" . $this->` — result should be zero matches.

---

### STEP 6 — Secure API Endpoints: adminuser/ + paymentTransaction/ + packageDetails/
**What**: Replace the 5-line CORS block with Pattern B (cors.php + auth.php includes) in:

```
api/adminuser/validate.php          api/adminuser/validateByMobile.php
api/adminuser/getAll.php            api/adminuser/getByMobile.php
api/adminuser/create.php            api/adminuser/update.php
api/adminuser/delete.php            api/adminuser/fixCorruptedProfiles.php

api/paymentTransaction/byId.php
api/paymentTransaction/getCollectionByMonths.php
api/paymentTransaction/getInvoiceByTxnId.php
api/paymentTransaction/create.php
api/paymentTransaction/approveById.php

api/packageDetails/all.php          api/packageDetails/byId.php
api/packageDetails/byClientId.php   api/packageDetails/byClientLatestPackage.php
api/packageDetails/byStatusIn.php   api/packageDetails/byStatusNotIn.php
api/packageDetails/create.php       api/packageDetails/update.php
api/packageDetails/delete.php
```

**Validation**: Call `GET /api/adminuser/getAll.php` without the `X-Api-Key` header → must get `401 Unauthorized`. Call with correct header → must get data.

---

### STEP 7 — Secure API Endpoints: client/ + attendance/ + dataset/
**What**: Pattern B applied to:

```
api/client/byId.php                         api/client/byName.php
api/client/byGender.php                     api/client/byBloodGroup.php
api/client/byProfileActiveFlag.php          api/client/allActive.php
api/client/allNonGymClients.php             api/client/allReferrals.php
api/client/getAllByFilter.php               api/client/getAllExtCodes.php
api/client/multipleClientDataEagerLoading.php
api/client/multipleClientDataEagerLoadingByName.php
api/client/singleClientDataEagerLoadingById.php
api/client/clientMemberStatPVO.php          api/client/convertToGymClient.php
api/client/create.php                       api/client/update.php
api/client/delete.php

api/client/createNewClientDataToServer.php  ← PUBLIC: cors.php only, NO auth

api/attendance.php (root-level)             ← use '../config/' paths
api/dataset/getAdmissionDetails.php
api/dataset/getClientAndPackagedetailsByMobile.php
api/dataset/markAttendanceAndGetBasicDetails.php
```

**Validation**: `GET /api/client/allActive.php` without header → `401`. With header → data.
`POST /api/client/createNewClientDataToServer.php` without header → still works (public).

---

### STEP 8 — Secure API Endpoints: All Remaining Groups
**What**: Pattern B applied to all remaining endpoint files:

```
api/attendance/ (if subdirectory files exist beyond root api/attendance.php)

api/batchlogs/create.php
api/batchlogs/checkIfBatchCompleted.php
api/batchlogs/triggerEnableDisableProfileBatch.php

api/brand_images/retrieve.php          api/brand_images/update.php

api/dietplanobjecttable/all.php         api/dietplanobjecttable/byId.php
api/dietplanobjecttable/byCidAndDate.php
api/dietplanobjecttable/create.php      api/dietplanobjecttable/update.php
api/dietplanobjecttable/updateClientDietPlanStatus.php

api/dietplantemplate/byId.php           api/dietplantemplate/getDefaultDietTemplates.php
api/dietplantemplate/getClientPreviousTemplates.php
api/dietplantemplate/single_read_ext.php

api/enquiry/all.php    api/enquiry/byId.php     api/enquiry/byTrainer.php
api/enquiry/byGreaterThanDate.php
api/enquiry/create.php api/enquiry/update.php   api/enquiry/delete.php

api/fcmToken/all.php   api/fcmToken/byMobile.php  api/fcmToken/byMobiles.php
api/fcmToken/create.php  api/fcmToken/update.php

api/feedback/create.php

api/level1_view/all.php  api/level1_view/allMale.php  api/level1_view/allFemale.php

api/merchandise/getAllMerchandise.php
api/merchandise/update.php             api/merchandise/updatePhoto.php

api/muscleworkout/all.php

api/notifications/all.php   api/notifications/create.php
api/notifications/byActivity.php  api/notifications/byUser.php
api/notifications/delete.php

api/orders/getAllOrders.php    api/orders/retrieve.php
api/orders/getMaxId.php        api/orders/create.php
api/orders/update.php          api/orders/updateOrderStatus.php
api/orders/getCoinRedemptions.php  api/orders/getMyCoinRedemptions.php
api/orders/approveCoinRedemption.php  api/orders/rejectCoinRedemption.php

api/package/byId.php   api/package/byGender.php
api/package/create.php api/package/update.php   api/package/delete.php

api/procointransaction/create.php   api/procointransaction/retrieve.php
api/procointransaction/update.php   api/procointransaction/getAllCredits.php
api/procointransaction/getBalance.php  api/procointransaction/getCreditsByPeriod.php
api/procointransaction/getMemberSummary.php  api/procointransaction/getAllTransactions.php

api/rewards/create.php  api/rewards/retrieve.php  api/rewards/update.php

api/supplements/getAllSupplements.php  api/supplements/update.php
api/supplements/updatePhoto.php  api/supplements/updatePhotoDesc.php
api/supplements/updatePhotoDesc1.php

api/t_workoutmaintype/create.php  api/t_workoutmaintype/getAll.php
api/t_workoutmaintype/single_read.php  api/t_workoutmaintype/update.php

api/t_workoutsubtype/create.php   api/t_workoutsubtype/getAll.php
api/t_workoutsubtype/getAllByMainTypeId.php  api/t_workoutsubtype/getAllDistinct.php
api/t_workoutsubtype/single_read.php  api/t_workoutsubtype/update.php

api/tasks/getTodaysTask.php   api/tasks/getAllByDate.php
api/tasks/getAllPoints.php     api/tasks/updateStatusToServer.php
api/tasks/updateSubmitStatusImg.php

api/wall/getAll.php  api/wall/getByClientId.php
api/wall/create.php  api/wall/update.php

api/WeightTracker/byCid.php   api/WeightTracker/byCidList.php
api/WeightTracker/add.php     api/WeightTracker/deleteById.php

api/workoutScheduleObject/getAllByClientId.php
api/workoutScheduleObject/getAllExtCodes.php
api/workoutScheduleObject/create.php
api/workoutScheduleObject/single_read.php
api/workoutScheduleObject/update.php

api/workoutSubType/getSubWorkoutPlansByWsoId.php
api/workoutSubType/create.php       api/workoutSubType/single_read.php
api/workoutSubType/update.php       api/workoutSubType/getAllExtCodes.php
api/workoutSubType/updateClientWorkoutPlanStatusToServer.php
```

**Root-level files** (use `'../config/'` path, not `'../../config/'`):
```
api/status.php                ← PUBLIC (no auth)
api/isUserMobileExists.php    ← PUBLIC (no auth)
api/isUserMobileExistsWithActiveProfile.php  ← PUBLIC (no auth)
api/getLatestAppVersion.php   ← PUBLIC (no auth)
api/getClientNameByMobile.php  api/read.php         api/create.php
api/getAdminCode.php           api/upload.php        api/getAdminEmails.php
api/imgconvert.php             api/pro_update.php    api/single_read.php
api/payment_key.php            api/update.php        api/updateApp.php
api/delete.php                 api/attendance.php
```

**Validation**: Pick 3 random endpoints across different groups, test without API key → all return 401. Test with key → all return data.

---

### STEP 9 — Fix Specific Security Issues in Endpoints
**What**: Targeted fixes on top of the auth already added in Steps 6–8.

**9-A: Remove password from admin login response**

In `api/adminuser/validate.php` and `api/adminuser/validateByMobile.php`:
- Remove `"password" => $row['password']` from the success JSON
- Remove `"password" => null` from the failure JSON
- No client needs the password returned after login

**9-B: Remove Firebase key from source**

In `api/orders/approveCoinRedemption.php` (and any other file with hardcoded FCM key):
- Replace: `$apiKey = "AAAArT6uHZ8:APA91bG2..."` (full key)
- With:
  ```php
  $secrets = include __DIR__ . '/../../config/secrets.local.php';
  $apiKey = $secrets['FCM_KEY'];
  ```
- Grep all api/ files for `AAAArT6uHZ8` to find every occurrence

**9-C: Suppress DB connection error details**

Already done in STEP 2 (database.php updated to return generic error instead of `echo $exception->getMessage()`).

**Validation**: Login via React app → response JSON must NOT contain `password` field. Order notification endpoint → fires correctly using key from secrets file.

---

### STEP 10 — Update React Web App
**What**: Point the React app to `progym_v2/` and attach API key to all requests.

**10-A: Create Vite env files**

`webapp/.env.development`:
```
VITE_API_KEY=<same key as in secrets.local.php>
VITE_API_BASE_PROD=https://tavrostechinfo.com/progym_v2/api
```

`webapp/.env.production`:
```
VITE_API_KEY=<same key>
VITE_API_BASE_PROD=https://tavrostechinfo.com/progym_v2/api
```

(Both files are git-ignored per STEP 2 .gitignore update.)

**10-B: Update `webapp/src/api/config.ts`**

```ts
export const API_BASE = import.meta.env.DEV
  ? '/progym-api'
  : (import.meta.env.VITE_API_BASE_PROD as string)

export const MEDIA_BASE = import.meta.env.DEV
  ? '/progym-media'
  : 'https://tavrostechinfo.com/progym_v2'

export const API_KEY = import.meta.env.VITE_API_KEY as string

export const ACTIVITY_KEY = 'progym_last_activity'

export function touchActivity(): void {
  localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
}

const _fetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const url = input instanceof Request ? input.url
            : input instanceof URL    ? input.href
            : String(input)
  if (url.startsWith(API_BASE)) {
    touchActivity()
    init.headers = { ...init.headers as Record<string, string>, 'X-Api-Key': API_KEY }
  }
  return _fetch(input, init)
}
```

**10-C: Rebuild**
```
cd webapp
npm run build
```

**Validation**: In browser dev tools, confirm every API request from the React app includes `X-Api-Key` header. Confirm the production build URL in `config.ts` points to `/progym_v2/api`.

---

### STEP 11 — Deploy to progym_v2/ on Hostinger
**Confirmed**: `progym_v2/` lives at `/public_html/progym_v2/` → `https://tavrostechinfo.com/progym_v2/`

**11-A: On Hostinger — create secrets file outside web root**

Via Hostinger File Manager or SSH, create a file **one level above `public_html/`** so it is not web-accessible.
Typical Hostinger home path: `/home/u636480992/`

File content (same structure as `secrets.local.php` but with production values):
```php
<?php
return [
    'DB_HOST' => 'localhost',
    'DB_NAME' => 'u636480992_ggs',
    'DB_USER' => 'u636480992_ggs',
    'DB_PASS' => '##Ppp7771',
    'FCM_KEY'  => 'AAAArT6uHZ8:APA91bG2R01CatD2LOa-1dePZEQu0rZ3cioXD0CR53iWrBKdfP0zFxWYU4OYjIHHGQewA8oR3WLoIc_5aUN6EwQys6DDzzx_msYNwD0LTcq8PJ9jqifeIMgeMpYl9-5ON5ZOgwZSzlvi',
    'API_KEY'  => '<same key used in webapp env files>',
];
```

**The secrets file auto-detection** is already baked into `config/auth.php` and `config/database.php` in STEP 2 via:
```php
$secretsPath = file_exists(__DIR__ . '/secrets.local.php')
    ? __DIR__ . '/secrets.local.php'
    : '/home/u636480992/progym_secrets.php';
$secrets = include $secretsPath;
```
- On local: finds `config/secrets.local.php` → uses local DB credentials
- On Hostinger: `secrets.local.php` does not exist → falls back to `/home/u636480992/progym_secrets.php`

No code change needed between environments.

**11-B: Create `progym_v2/` folder on Hostinger**
Via Hostinger File Manager: create folder `/public_html/progym_v2/`
Then create subfolders: `api/`, `class/`, `config/`, `webapp/`, `webapp/dist/`

**11-C: Upload to Hostinger progym_v2/**

| What | Local path (in progym_v2\) | Upload to Hostinger |
|---|---|---|
| PHP endpoints | `api\` (entire folder) | `/public_html/progym_v2/api/` |
| Class files | `class\` (entire folder) | `/public_html/progym_v2/class/` |
| Config files | `config\` — **exclude `secrets.local.php`** | `/public_html/progym_v2/config/` |
| React app | `webapp\dist\` (entire folder) | `/public_html/progym_v2/webapp/dist/` |

**Do NOT upload `config/secrets.local.php`** — that file stays on your local machine only.

**Validation**: `GET https://tavrostechinfo.com/progym_v2/api/status.php` → returns OK. `GET https://tavrostechinfo.com/progym_v2/api/client/allActive.php` without header → 401. With `X-Api-Key` header → returns data.

---

### STEP 12 — Full UAT on progym_v2/
**What**: Thorough testing of the React web app pointing to `progym_v2/` before cutover.

**Test checklist:**
- [ ] Admin login works
- [ ] Admin login response does NOT contain `password` field
- [ ] Client list loads
- [ ] Member search works
- [ ] Attendance marking works
- [ ] Package enrollment and payment recording works
- [ ] Diet plan loads for a client
- [ ] Workout plan loads for a client
- [ ] ProCoin balance displays correctly
- [ ] Orders list loads
- [ ] Enquiry list loads
- [ ] Reports / collection by months loads
- [ ] QR scan attendance endpoint works
- [ ] API call without `X-Api-Key` header returns 401
- [ ] Old `PROGYM/ggs/` production app still works (Java desktop + Android unaffected)

---

### STEP 13 — Cutover
**What**: Replace old `PROGYM/ggs/` with tested `progym_v2/`.

**Procedure on Hostinger:**
1. Rename `PROGYM/ggs/` → `PROGYM/ggs_backup_YYYYMMDD/` (keep as safety net for 7 days)
2. Copy `progym_v2/` contents into `PROGYM/ggs/` (or rename as needed)
3. Verify `https://tavrostechinfo.com/PROGYM/ggs/` now serves the secured app
4. Verify old Android app and Java desktop still work (they will — they hit `PROGYM/ggs/api/` which is now the secured version; they'll get 401 since they don't send `X-Api-Key`, but this is acceptable and expected — they are legacy clients)
5. After 7-day soak, delete `PROGYM/ggs_backup_YYYYMMDD/` and `progym_v2/`

> **Note on legacy clients after cutover**: The Java desktop app will receive 401 on all API calls
> since it cannot send the API key. This is the accepted trade-off — security takes priority over
> the abandoned Java app. Confirm with stakeholders before cutover.

---

## 6. Step Status Tracker

| Step | Description | Status |
|---|---|---|
| STEP 1 | Create local progym_v2\ codebase (copy + npm install + verify build) | ⬜ Not started |
| STEP 2 | Create security config infrastructure (auth.php, cors.php, validate.php, update database.php) | ⬜ Not started |
| STEP 3 | Fix SQL injection: class/client.php + class/adminuser.php | ⬜ Not started |
| STEP 4 | Fix SQL injection: class/attendance.php + class/packageDetails.php + class/paymenttransaction.php | ⬜ Not started |
| STEP 5 | Fix SQL injection: class/enquiry.php + class/wall.php + all remaining class files | ⬜ Not started |
| STEP 6 | Secure endpoints: api/adminuser/ + api/paymentTransaction/ + api/packageDetails/ | ⬜ Not started |
| STEP 7 | Secure endpoints: api/client/ + api/dataset/ | ⬜ Not started |
| STEP 8 | Secure endpoints: all remaining api/ groups + root-level files | ⬜ Not started |
| STEP 9 | Fix specific issues: remove password from login response + move Firebase key to secrets | ⬜ Not started |
| STEP 10 | Update React web app: API_BASE → progym_v2 URL + auto-attach X-Api-Key header | ⬜ Not started |
| STEP 11 | Deploy progym_v2\ to Hostinger /public_html/progym_v2/ + create server secrets file | ⬜ Not started |
| STEP 12 | Full UAT on https://tavrostechinfo.com/progym_v2/ | ⬜ Not started |
| STEP 13 | Cutover: backup PROGYM/ggs/, replace with progym_v2/ contents | ⬜ Not started |
