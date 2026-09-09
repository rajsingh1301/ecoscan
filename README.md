# EcoScan

AI-powered waste sorting assistant built for **NextStep Hacks 2026** (theme: Earth Forward).

Point your camera at an item and get instant, location-aware guidance on whether it's recyclable, compostable, or trash.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full feature list, data model, and design rules.

## Status
Core app (camera capture, rules engine, location, verdict UI, impact dashboard) is built.
AI identification is currently **mocked** — real Claude (via AWS Bedrock) integration is pending an API key.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
