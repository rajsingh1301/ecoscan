# EcoScan — Project Architecture

**Hackathon:** NextStep Hacks 2026 (theme: Earth Forward)
**One-liner:** Point your camera at an item and get instant, location-aware guidance on whether it's recyclable, compostable, or trash.

---

## 1. Problem & Goal

Recycling contamination (putting the wrong item in the wrong bin) is a major reason municipal recycling programs fail — contaminated batches often get sent to landfill entirely. Most people simply don't know local disposal rules, which vary by city/zip code and change often.

**Goal:** Remove the guesswork. A user takes/uploads a photo of an item, EcoScan identifies it and tells them exactly what to do with it *for their specific location*, in under 3 seconds.

---

## 2. Core Features (MVP — must ship for demo)

### F1. Camera / Photo Capture
- Web app opens directly to a camera view (mobile-first, works on desktop via file upload fallback).
- User snaps a photo or uploads an existing image.

### F2. Item Identification
- Image sent to Claude (vision) with a structured prompt.
- Returns: item name, material category (plastic #1-7, glass, metal, paper, organic, e-waste, hazardous, mixed/other), and a confidence level.

### F3. Location-Aware Disposal Rule Lookup
- User sets their location once (zip/postal code or city, stored locally).
- App matches the identified material category against a rules dataset for that location.
- Returns one of: **Recycle**, **Compost**, **Trash**, **Special Drop-off** (e.g. batteries, e-waste).

### F4. Result Screen
- Big, color-coded verdict (green = recycle, brown = compost, gray = trash, orange = special drop-off).
- Short explanation ("Why?") — e.g. "Greasy pizza boxes contaminate paper recycling — compost instead."
- If "Special Drop-off": show nearest facility type / what to search for.

### F5. Personal Impact Tracker
- Every scan logs to local history (localStorage or lightweight DB).
- Dashboard shows: total items scanned, breakdown by category, estimated contamination avoided.
- Gamification: streak counter for daily scans.

### F6. Contamination Score (Stretch, high-value for "Originality")
- User can photograph a whole bin instead of one item.
- Claude vision analyzes multiple visible items in one image and flags anything that doesn't belong.
- Returns a "bin health" score + list of items to remove.

---

## 3. Nice-to-Have Features (only if time permits, in priority order)

1. **Shareable results** — "I diverted X items from landfill this week" share card (image export).
2. **Multi-item batch scan** — scan several items in sequence, get a session summary.
3. **Offline queue** — if no connection, queue photos and process when back online (PWA service worker).
4. **Household leaderboard** — compare stats with friends/family via a shared code.
5. **Voice output** — read the verdict aloud (accessibility).

**Rule: stretch features are only started after F1–F5 are fully working and demo-able end to end.** A polished 5-feature app beats a broken 8-feature app under judging criteria "Completion."

---

## 4. Explicitly Out of Scope (for this hackathon)

- Native iOS/Android apps (PWA only).
- User accounts / auth / multi-device sync (single-device local storage is enough).
- Real-time municipal API integration (we ship with a curated static rules dataset for a handful of demo cities/regions + a sensible generic fallback).
- Payment, ads, or any monetization.
- Support for languages other than English (stretch only, not MVP).

---

## 5. System Architecture

```
┌─────────────────────────┐
│        Client (PWA)      │
│  React + Vite/Next.js    │
│  - Camera capture         │
│  - Location setting       │
│  - History / dashboard    │
│  - Result UI              │
└───────────┬───────────────┘
            │ HTTPS (image + location)
            ▼
┌─────────────────────────┐
│   Backend API (serverless)│
│  /api/identify             │
│  /api/rules/:region        │
└───────────┬───────────────┘
     │                    │
     ▼                    ▼
┌───────────┐      ┌────────────────┐
│ Claude API │      │ Rules Dataset   │
│ (vision)   │      │ (JSON, per-     │
│            │      │  region rules)  │
└───────────┘      └────────────────┘
```

- **Frontend:** React (Next.js) — single-page-app feel, deployed on Vercel.
- **Backend:** Next.js API routes (serverless functions) — keeps Claude API key server-side only, never exposed to the client.
- **AI:** Claude API (vision-capable model) for item identification and bin-contamination analysis.
- **Data storage:** No user database for MVP. Scan history lives in the browser (localStorage / IndexedDB). Rules dataset is a static JSON file bundled with the backend.
- **Hosting:** Vercel (frontend + serverless functions together).

---

## 6. Data Model

### 6.1 Rules Dataset (`/data/rules.json`)
```json
{
  "regions": {
    "default": {
      "plastic_1_2": "recycle",
      "plastic_3_7": "trash",
      "glass": "recycle",
      "metal": "recycle",
      "paper_clean": "recycle",
      "paper_greasy": "compost",
      "organic": "compost",
      "e_waste": "special_dropoff",
      "hazardous": "special_dropoff",
      "mixed_other": "trash"
    },
    "us-sf-94102": {
      "...": "overrides for San Francisco, e.g. all plastics #1-7 accepted"
    }
  }
}
```
- Lookup order: exact zip → city-level fallback → `default`.
- Rules are hand-curated for 3–5 demo regions (pick real cities with published recycling guides) + one generic default that covers everyone else.

### 6.2 Scan Record (client-side, localStorage)
```json
{
  "id": "uuid",
  "timestamp": "ISO8601",
  "itemName": "string",
  "materialCategory": "string",
  "verdict": "recycle | compost | trash | special_dropoff",
  "confidence": "high | medium | low",
  "imageThumbnail": "base64 (optional, small)"
}
```

### 6.3 Claude Identification Response (contract between backend and Claude)
Backend prompts Claude to return **strict JSON only**:
```json
{
  "itemName": "string",
  "materialCategory": "plastic_1_2 | plastic_3_7 | glass | metal | paper_clean | paper_greasy | organic | e_waste | hazardous | mixed_other",
  "confidence": "high | medium | low",
  "reasoning": "one short sentence"
}
```

---

## 7. Key Business Rules

1. **Never guess silently.** If Claude's confidence is "low," the UI must say so and offer a manual category picker instead of asserting a wrong verdict — a wrong "recycle" is worse than an honest "not sure."
2. **Default-safe fallback.** If a region has no specific rule for a category, fall back to the `default` ruleset rather than failing.
3. **Location is required before scanning.** The app cannot show a verdict without a location context (even if it's just "default/unknown region") — disposal rules are meaningless without it.
4. **No image is stored server-side.** Images are sent to Claude for analysis and discarded immediately after the response — only the lightweight scan *record* (not the photo) persists, and only in the user's own browser. This is a privacy rule, not just a technical default.
5. **Special drop-off items are never marked "trash."** Batteries, electronics, and hazardous materials must always route to "special_dropoff," even under low confidence — safety default over convenience.
6. **One source of truth for verdicts.** The mapping from `materialCategory` → `verdict` lives only in `rules.json`, never hardcoded in UI components — keeps region rules auditable and easy to extend during judging Q&A.

---

## 8. Folder Structure (planned)

```
ecoscan/
├── ARCHITECTURE.md
├── README.md
├── app/                      # Next.js app router
│   ├── page.tsx              # camera / capture screen
│   ├── result/page.tsx       # verdict screen
│   ├── history/page.tsx      # dashboard / impact tracker
│   ├── settings/page.tsx     # location setting
│   └── api/
│       ├── identify/route.ts # calls Claude, returns identification JSON
│       └── rules/route.ts    # serves region rules
├── data/
│   └── rules.json
├── lib/
│   ├── claude.ts             # Claude API client wrapper
│   ├── rulesEngine.ts        # category+region -> verdict logic
│   └── storage.ts            # localStorage helpers
├── components/
│   ├── CameraCapture.tsx
│   ├── VerdictCard.tsx
│   ├── ImpactDashboard.tsx
│   └── LocationPicker.tsx
└── public/
```

---

## 9. Judging Criteria Mapping

| Criterion | How this architecture addresses it |
|---|---|
| **Originality** | Contamination Score (bin-level analysis) + honest low-confidence handling instead of generic "point camera, get answer" clones. |
| **Adherence to Track** | Directly targets waste reduction, a named Earth Forward priority area. |
| **Completion** | MVP scope (F1–F5) is deliberately small enough to be fully working before the deadline; stretch features are clearly separated and optional. |
| **Learning** | New: Claude vision API integration, PWA/service worker patterns, geospatial rules lookup design. |
| **Design** | Mobile-first camera flow, color-coded instant feedback, minimal taps from photo to answer. |
| **Technology** | Real multimodal AI integration (not a static lookup table alone), serverless architecture, offline-capable PWA. |

---

## 10. Build Sequence (recommended order)

1. Scaffold Next.js app + deploy empty shell to Vercel (get CI/CD working day one).
2. Build `rulesEngine.ts` + `rules.json` with default + 2 demo regions (pure logic, no AI yet — testable immediately).
3. Build `LocationPicker` + settings persistence.
4. Integrate Claude API in `/api/identify` with strict JSON-mode prompting; test with sample images via curl/Postman before wiring UI.
5. Build `CameraCapture` → `VerdictCard` end-to-end flow.
6. Add scan history + `ImpactDashboard`.
7. Polish UI/animations, add confidence-based manual override.
8. Only then: attempt stretch features (Contamination Score first, others only if time remains).
9. Record 3–5 min demo video; write Devpost submission.

---

## 11. Decisions Made

- **Framework:** Next.js (App Router) — chosen for one-deploy PWA + serverless API.
- **Demo regions:** `default`, San Francisco, New York City, Delhi, Bengaluru (see `data/rules.json`). These are illustrative/hand-curated for the demo, not verified against current official municipal guidance — call this out in the pitch if asked.
- **AI provider:** Claude Sonnet via **AWS Bedrock** (using available AWS credits, not the first-party Anthropic API). Integration is currently **mocked** in `lib/claude.ts` — swap-in point and Bedrock code sample are documented inline in that file, pending an AWS Bedrock key/role.
- **State/storage:** No backend database. Location + scan history live in `localStorage` (see `lib/storage.ts`). Acceptable for a single-device hackathon demo; noted as a scope limit, not an oversight.
