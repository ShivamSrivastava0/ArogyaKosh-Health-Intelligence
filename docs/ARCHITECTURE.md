# ArogyaKosh — Architecture & Low-Level Design

## 1. Shape of the system

```
React (Vite, Tailwind)  ──HTTPS/JSON──▶  Express API  ──▶  MongoDB (Mongoose)
   │  lazy-loaded pages                     │  routes → controllers → services → models
   │  tiny query cache (useApi)             ├──▶  Local disk (uploads/<userId>/…)
   │  QuickAdd modals (global)              ├──▶  Gemini (optional: chat, report reading, brief summary)
   │                                        ├──▶  SMTP (optional: verification, reset, daily digest)
   └─ public pages /e/:token, /s/:token     └──▶  node-cron (demo purge, 07:30 digest)
```

`ml-service/` (Flask) is not wired into the product; it is kept for reference.

## 2. Domain model

Everything belongs to an **account** (`User`). The account manages a household of
**members**; the account holder is a member too (`isSelf: true`). Every health
record references exactly one member, so the same code paths work for "me",
"Papa" or "the baby".

```
User 1──* Member 1──* Medicine 1──* DoseLog
                 1──* Vital            (BP, sugar, HbA1c, lipids, TSH …)
                 1──* Record           (file on disk + metadata)
                 1──* Reminder         (appointments, checkups, tests; repeat rules)
                 1──* Vaccination      (generated from DOB or custom)
                 1──* ShareLink        (time-limited doctor access)
User 1──* Expense (member optional)
User.firstAidKit[]  (embedded checklist)
```

| Model | Key fields | Notes / invariants |
|---|---|---|
| `User` | email (unique, lowercase), password (bcrypt 12), refreshTokens[] (sha256), prefs, firstAidKit[], calendarToken, isDemo | Refresh tokens rotate; reuse of an old one revokes every session. |
| `Member` | relation, dob, bloodGroup, allergies[], noKnownAllergies, conditions[], emergencyContacts[], doctor, insurance[], lifestyle, emergencyToken | Virtuals `age`, `bmi`. One `isSelf` per owner. `emergencyToken` is random, rotatable. |
| `Medicine` | times[] (HH:mm), daysOfWeek[], dose, mealTiming, start/endDate, stock, refillAt, expiryDate, active | Stopping sets `endDate` so history/adherence stay correct. |
| `DoseLog` | medicine, date (YYYY-MM-DD), time, status TAKEN/SKIPPED | Unique `(medicine, date, time)`. Absence = pending/missed. |
| `Vital` | type, value, value2, at, status, record? | `status` derived in a pre-validate hook from `data/vitals.js`. |
| `Record` | category, date, tags, file{key,mime,size}, summary | `file.key` never leaves the server; files stream through an ownership check. |
| `Reminder` | type, dueAt, repeat, status | Completing a repeating reminder creates the next occurrence. |
| `Vaccination` | name, dose, dueDate, givenDate, source | Virtual `status`: GIVEN / OVERDUE / DUE (≤30 d) / UPCOMING. |
| `Expense` | category, amount, date, taxDeductible, reimbursed | Aggregated by month / category / member. |
| `ShareLink` | token (18 random bytes), expiresAt, records[], views, revoked | Virtual `active`. |

Reference data lives in `server/data/` and is pure, testable JS:
`vitals.js` (ranges & classifiers, Asian BMI cut-offs), `vaccines.js` (IAP child
schedule + adult boosters), `interactions.js` (Indian brand → generic map,
interaction pairs, allergy cross-reactivity), `firstAid.js`.

## 3. Server layering

```
routes/index.js        single route table; rate limits per group; auth boundary
controllers/*          HTTP only: parse input, call services, shape responses
  crudFactory.js       owner-scoped list/get/create/update/remove with field whitelists
services/*             all business rules, no req/res
models/*               schema, indexes, derived fields
middleware/*           auth (JWT), sanitize ($/. key stripping), upload (disk, mime allow-list), errors
```

Every query is scoped by `owner: req.user._id`. Member references in bodies are
verified with `assertMembersOwned` before writes. IDs are validated before use.

### Key services

| Service | Responsibility |
|---|---|
| `medicineService` | `isScheduledOn`, `dosesForDay`, `setDoseStatus` (keeps stock consistent with the log, idempotent on repeat), `adherence` (expected vs taken; today counts only slots already due), `stockInfo` (days left & run-out date). |
| `safetyService` | Resolves brand/generic names → ingredients; flags interactions, duplicate ingredients (e.g. two paracetamol products) and allergy cross-reactions. |
| `vitalService` | Latest two readings per (member, type) via one aggregation → value + trend. |
| `scoreService` | Explainable health score: each factor reports `points/max`, unknowns are excluded and reported as `coverage`. Children use a separate factor set. Household readiness checklist with deep links that fix each gap. |
| `insightService` | Builds the **Today** feed: doses, grouped alerts (refill, expiry, abnormal vitals, overdue items, insurance renewal, high-severity interactions), upcoming items, readiness, 7-day adherence. |
| `briefService` | Deterministic doctor brief from records; optional AI narrative layered on top. |
| `assistantService` | Emergency phrase detection → call 112/108; otherwise Gemini grounded in a household snapshot; falls back to deterministic answers from records. |
| `calendarService` | iCalendar feed (appointments with RRULE, vaccine due dates, daily medicine alarms in floating local time). |
| `demoService` | Seeds a realistic multi-generation household; purged after 24 h by the job runner. |

## 4. Important flows

**Dose check-off** — `POST /medicines/doses {medicine,date,time,status}` →
validates the time is in the schedule → upserts `DoseLog` → adjusts stock only
when the TAKEN state actually changes (so double-taps and undo are safe). The
client updates the Today cache optimistically and rolls back on error.

**Auth** — access token 15 min, refresh token 30 d stored hashed. The client
queues concurrent 401s behind a single refresh. A refresh token that is not in
the store (i.e. reused) wipes all sessions.

**Emergency QR** — `/e/:token` calls `GET /public/emergency/:token`, which
returns only emergency-relevant fields. Tokens can be rotated; cards can be
disabled per member.

**Doctor share** — `POST /share` creates a link (1 h – 30 d) with an optional
set of records. `GET /public/share/:token` returns the brief (no contacts) and
counts views; files stream only if their id is in the link. Revoked → 410.

**Report reading** — upload stores the file; `POST /records/:id/extract` sends
it to Gemini with the list of tracked parameters; the user confirms values;
`POST /records/:id/values` writes `Vital`s linked to the record.

## 5. Client structure

```
src/api/client.js        axios instance, token storage, single-flight refresh, error messages
src/hooks/useApi.js      cache keyed by path+params, ref-counted subscribers, invalidate(prefix)
src/context/             Auth, Family (members + server feature flags), QuickAdd (all add/edit modals)
src/components/ui/       Button, Field set, Modal/Drawer/Menu/Confirm, Display primitives, DataTable
src/components/forms/    Medicine (live safety check), Vital (live range preview), Record (drag-drop), Member (sectioned drawer) …
src/pages/app/*          one file per screen; list components exported for reuse on member profiles
src/pages/public/*       QR emergency card, doctor share view
```

Design tokens are in `tailwind.config.js` (paper / ink / lime palette, status
tones, member tints; Bricolage Grotesque + Geist).

## 6. Security checklist

- Helmet, CORS allow-list, JSON body limit 1 MB, per-route rate limits.
- `$`/`.` keys stripped from all input (operator injection).
- Uploads: mime allow-list, 15 MB cap, random names, path-traversal guard, served only after ownership check.
- Passwords bcrypt(12); reset/verification tokens stored as SHA-256, short expiry.
- Public endpoints return minimal projections and never expose internal file paths.
- Account deletion removes every collection row and the user's upload directory.

## 7. Testing

`npm run smoke` (in `server/`) boots the API on an in-memory MongoDB and runs
~80 end-to-end checks across every route group, including auth edge cases,
ownership, injection attempts, sharing/revocation and the demo household.
