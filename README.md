# EcoScan

AI-powered waste sorting assistant built for **NextStep Hacks 2026** (theme: Earth Forward).

Point your camera at an item and get instant, location-aware guidance on whether it's recyclable, compostable, or trash.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full feature list, data model, and design rules.

## Status
Full app is working end-to-end: camera capture, rules engine, location, verdict UI, impact dashboard, and **live AI identification** via Google Gemini.

Claude Sonnet via AWS Bedrock was the original AI plan and may still be swapped in (see `lib/claude.ts`) once the AWS account's Bedrock Marketplace payment setup is resolved.

## Getting Started

```bash
npm install
```

Create `.env.local` (not committed) with:
```
GEMINI_API_KEY=your-key-here
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
