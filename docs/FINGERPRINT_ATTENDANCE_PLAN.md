# Biometric (Fingerprint / Face) Attendance — Plan

> Status: **discussion only, nothing built** (2026-10-10). Pick this up when the device is bought.

## Goal

- **Now:** a small standalone fingerprint machine at reception to mark daily attendance.
- **Later:** a better-quality unit fixed on the gym's glass door that marks attendance and controls entry.
- **Question asked:** if we store fingerprints from the small machine, will the future door machine read them?

## Key answer: are fingerprints portable?

- Machines store fingerprints as vendor-specific **templates**, not images.
- A different brand's machine generally **cannot** read them. ISO 19794-2 / ANSI 378 formats exist, but door devices rarely accept them, and accuracy drops when they do.
- **Within one brand family** that uses the same algorithm version (e.g. ZKTeco "ZKFinger VX10.0"), templates **can** be copied from one device to another through our server. Members do not re-enroll.
- **Decision:** choose the brand family now (**ZKTeco / eSSL** are common in India) and buy the door unit from the same family.
- **Worst case:** re-enrollment takes about 30 s per member. 89 active members can be done as they walk in over about a week, so this is a low risk.

## Hardware guidance

1. **Prefer face + fingerprint devices.** Lifters' fingerprints often fail (barbell calluses, sweat, chalk). Finger-only machines lead to daily "not recognised" complaints.
2. **Buy a standalone device with WiFi/LAN and ADMS ("Cloud Server" / Push SDK) support.** It posts check-ins directly to our server.
3. **Avoid USB scanners** (Mantra MFS100, SecuGen, etc.). They need a PC or phone attached plus SDK work.
4. **The later door setup needs:**
   - a door access unit from the same brand
   - an electric lock with a glass-door bracket
   - an exit button
   - a power supply with a small battery backup (UPS)

## Questions for the seller (before paying)

1. Does it support **ADMS / Push / Cloud Server** mode, and can I set my own server domain?
2. Does it support **HTTPS**, or only plain HTTP? This is critical for Hostinger hosting, so check the model number before buying.
3. Which **fingerprint algorithm version** does it use? Will your door/access models use the same one?
4. Can fingerprint templates be **uploaded to and downloaded from** the device over ADMS?

## System design

```
Member puts finger/face on machine
        │  (machine matches locally — works even if internet is down)
        ▼
Machine pushes "user 1381 checked in 07:42" over the internet
        ▼
https://<server>/iclock/cdata   (new PHP endpoint, ZKTeco ADMS protocol)
        ▼
Existing attendance logic: first check-in of day → attendance table,
zone check, admin WhatsApp/Push alerts (class/AttendanceAlert.php), streaks
```

- **Device user ID = `client.id`.** Member #1381 is enrolled as user 1381, so no mapping confusion.
- **ADMS endpoints** (rewrite `/iclock/*` to PHP using `.htaccess`):
  - `GET /iclock/cdata?SN=...`: handshake and device options.
  - `POST /iclock/cdata?SN=...&table=ATTLOG`: punches. Each line is `PIN \t datetime \t status ...`.
  - `POST /iclock/cdata?table=OPERLOG`: user and fingerprint (FP) template uploads, used for the template backup.
  - `GET /iclock/getrequest?SN=...`: the device polls for commands such as `DATA UPDATE USERINFO`, `DATA UPDATE FINGERTMP` and `DATA DELETE USERINFO`.
  - `POST /iclock/devicecmd`: command results.
  - Set the poll interval to about 30 s to keep load on shared hosting low.
- **Reuse the attendance code path** from `api/attendance/create.php` and `api/dataset/markAttendanceAndGetBasicDetails.php` so alerts and first-check-in-of-the-day rules stay identical.
- **Offline:** the device buffers punches and uploads them later. Use the device's punch time, not the upload time.
- **Lock out expired members (door phase):**
  - When a package expires or the profile Active/Inactive toggle (`api/client/updateProfileActiveFlag.php`) disables a member, queue a command to block that user on the door device.
  - When the member is re-enabled or renews, unblock them.
- **Privacy (DPDP Act 2023):**
  - Biometrics are sensitive personal data.
  - Store only templates, never images. Keep them in the server backup only to copy them to new devices.
  - Record member consent at enrollment.
  - Delete a member's templates when they leave.

### Proposed new tables

| Table | Purpose |
|---|---|
| `bio_device` | serial number (SN), name, location (reception/door), last_seen, status |
| `bio_punch_log` | raw punch lines: SN, pin, punch_time, processed flag (for audit and reprocessing) |
| `bio_template` | backup of templates per client and finger: algorithm version, data, created_at |
| `bio_command_queue` | pending device commands: SN, command, status, result |
| `client` | consent fields (e.g. `bioConsent`, `bioConsentDate`), possibly in a separate table instead |

### Proposed UI

- **Settings → "Devices" card:** online/offline status, last check-in, last sync.
- **Member profile:**
  - "Enroll on device" (shows the ID to type on the device, plus a consent tick).
  - "Remove biometrics".

## Phases

| Phase | Hardware | Software | Effort |
|---|---|---|---|
| 1 (now) | 1 ZKTeco/eSSL face+finger ADMS device at reception | ADMS endpoint, attendance plus alerts, template backup, Devices card | ~2–3 days once the device is on hand |
| 2 (later) | Same-brand door unit plus electric lock, exit button, UPS | Push stored users and templates to the door unit, block/unblock on expiry or toggle | ~2 days |

## Open risks to verify

- Whether Hostinger serves the `/iclock/` path over plain HTTP if the device can't do HTTPS. If it can't, put a small relay in between or use a domain without forced HTTPS.
- That the exact model's ADMS firmware supports template upload/download (some cheap models don't).
