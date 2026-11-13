# ArogyaKosh

**Predictive health for your whole family.** ArogyaKosh sees health problems
coming — heart age and 10-year risk, BP and sugar forecasts, missed-dose
patterns — for your parents, your kids and you, then turns every prediction into
a reminder, a refill, a checkup or a brief for the doctor.

## ArogyaPredict — the prediction engine

| Model | What it tells you | Basis |
|---|---|---|
| Heart & stroke risk, heart age | 10-year cardiovascular risk and the "age" of the heart, with the biggest levers and a live what-if simulator | Framingham CVD (D'Agostino 2008), lipid and BMI versions |
| Trend forecasts | Where BP, sugar, weight and lab values are heading 3–6 months out, and when they'll cross into an unhealthy range | Robust Theil–Sen trends on each person's own readings, damped projections with uncertainty bands |
| Unusual readings | A reading far from that person's own baseline | Robust z-score (median/MAD) |
| Learned habits | Which doses each person tends to miss (e.g. weekend evenings) and tonight's at-risk doses | Per-slot miss rates with Bayesian smoothing |
| Sugar, kidney, metabolic | Prediabetes / control status, chance of developing diabetes (family history read from the household), eGFR stage, metabolic syndrome | ADA thresholds, Indian Diabetes Risk Score, CKD-EPI 2021, harmonised criteria |

Predictions appear on Today, on every member profile, in the doctor brief and in Ask Kosh. They are estimates, never a diagnosis.

## What it does

| | |
|---|---|
| **Today** | Top predictions and heart ages for the household, then every dose for every family member on one screen. One tap to mark taken; stock counts down; refill, expiry, overdue-checkup, abnormal-reading and insurance-renewal alerts. |
| **Medicines** | Schedules (times, weekdays, meal timing), stock forecasting ("runs out in 4 days"), refills, adherence analytics, and an interaction / allergy / duplicate-ingredient check that understands Indian brand names. |
| **Vitals & labs** | BP, sugar, HbA1c, lipids, thyroid, Hb, vitamin D and more — charted against normal ranges, with trends and flags. |
| **Health locker** | Upload prescriptions, reports, scans and bills. Search, preview, download. Optional AI reading turns lab PDFs into charted values after you confirm them. |
| **Doctor brief** | One-page clinical summary per person, printable, or shared as a link that expires (1 h – 30 d), with view counts and instant revoke. |
| **Emergency** | Scannable QR medical ID per person (no app needed to read it), printable wallet card, 112/108 one-tap, nearby hospitals/blood banks, readiness checklist and first-aid kit checker. |
| **Vaccines** | Full IAP childhood schedule generated from date of birth; adult boosters and yearly flu that reschedule themselves. |
| **Appointments** | Visits, checkups and tests with repeat rules; calendar subscription (Google / Apple / Outlook) including medicine alarms. |
| **Expenses** | Monthly, category and per-person breakdowns, Section 80D tagging, CSV export, financial-year view. |
| **Health score** | An explainable 0–100 score per person — every factor shows its points and what to do next. Includes the Indian Diabetes Risk Score check. |
| **Ask Kosh** | Questions about the family's records ("What was Papa's latest BP?"). Uses Gemini when configured, otherwise answers directly from saved data. Emergency phrases always route to 112/108. |

Plus: one-click sample household, ⌘K command palette, morning email digest,
full data export and account deletion.

## Quick start

Prerequisites: Node 18+, MongoDB (local or Atlas).

```bash
cd server
cp .env.example .env      # fill in MONGODB_URI and two JWT secrets
npm install
npm run dev               # http://localhost:5000/api
```

```bash
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

No database handy? `npm run dev:memory` in `server/` starts with a throwaway
in-memory MongoDB. Click **Explore a sample family** on the landing page to get
a fully populated household.

Optional integrations (all degrade gracefully when unset): `GEMINI_API_KEY`
(AI), `SMTP_*` (email), `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` (Google sign-in).

## Scripts

| Where | Command | |
|---|---|---|
| server | `npm run dev` / `npm start` | API with nodemon / production |
| server | `npm run dev:memory` | API on an in-memory database |
| server | `npm run smoke` | End-to-end API checks on an in-memory database |
| client | `npm run dev` / `npm run build` | Vite dev server / production build |

## Project layout

```
client/   React + Vite + Tailwind web app
server/   Express + Mongoose API (routes → controllers → services → models)
docs/     ARCHITECTURE.md — data model, layering, flows, security
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the low-level design.

## Deploying

- Serve `client/dist` from any static host; set `VITE_API_URL` at build time.
- Run the API with `NODE_ENV=production`, a persistent `UPLOAD_DIR` volume, strong JWT secrets, `CLIENT_URL` set to your web origin and `PUBLIC_API_URL` to the public API URL.
- Put both behind HTTPS.

## Disclaimer

ArogyaKosh organises health information. It does not diagnose or replace a
doctor. Interaction checks and score tips are prompts to talk to a professional.
In an emergency in India, call **112**.
