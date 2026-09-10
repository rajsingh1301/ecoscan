import Link from "next/link";
import HeroDemo from "@/components/HeroDemo";
import { TIERS } from "@/lib/ranks";

const REFUSALS = [
  {
    title: "It won't credit a different place",
    body: "Photograph a clean street that isn't the one you scanned and the quest is rejected outright. The check runs on the server, so it can't be skipped from the app.",
  },
  {
    title: "It won't rubber-stamp an unchanged photo",
    body: "Send the same picture twice and it reports nothing removed. We tested exactly this — the model refused to award a single point.",
  },
  {
    title: "It won't guess when it isn't sure",
    body: "A low-confidence scan says so and hands you the choice, rather than stating a wrong bin with confidence. A wrong 'recycle' is worse than an honest 'not sure'.",
  },
];

export default function LandingPage() {
  return (
    <div className="wide flex flex-col gap-20 py-4">
      {/* Hero */}
      <section className="hero">
        <div className="flex flex-col gap-5">
          <span className="eyebrow">Earth Forward · NextStep Hacks 2026</span>

          <h1 className="hero-title">
            Anyone can say they cleaned up.
            <br />
            <span className="hero-turn">This one checks.</span>
          </h1>

          <p className="text-[1.02rem] leading-relaxed max-w-[34ch]" style={{ color: "var(--ink-soft)" }}>
            EcoScan tells you which bin something belongs in — using your city&apos;s
            rules, not a generic guess. Then it goes further: photograph a
            littered place, clear it, and it verifies what actually went away
            before awarding a single point.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/scan" className="btn btn-primary">
              Scan something
            </Link>
            <Link href="/cleanup" className="btn btn-quiet">
              Start a cleanup quest
            </Link>
          </div>

          <p className="text-[0.8rem]" style={{ color: "var(--ink-faint)" }}>
            Try it as a guest, no signup. Make an account when you want your
            rank and streak to follow you to another phone.
          </p>
        </div>

        <HeroDemo />
      </section>

      {/* What it does */}
      <section className="flex flex-col gap-6">
        <div className="rule-label">
          <span className="eyebrow">Two things</span>
        </div>

        <div className="pitch">
          <div className="pitch-item">
            <h3>Point at one thing</h3>
            <p>
              The camera identifies the item and answers against your local
              collection rules — the same bottle is recycling in San Francisco
              and landfill somewhere else, and the app knows the difference.
            </p>
          </div>

          <div className="pitch-item">
            <h3>Or take on a whole place</h3>
            <p>
              Scan a littered spot and every piece gets counted. Clear it,
              photograph it again, and XP is awarded only for the litter that
              genuinely left the frame.
            </p>
          </div>
        </div>
      </section>

      {/* Integrity — what it refuses to do */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="rule-label">
            <span className="eyebrow">Where most of the work went</span>
          </div>
          <h2 className="display text-[1.9rem] max-w-[22ch]">
            A reward you can fake is worth nothing.
          </h2>
        </div>

        <div className="refusals">
          {REFUSALS.map((item) => (
            <div key={item.title} className="refusal">
              <span className="refusal-mark" aria-hidden="true">
                ✕
              </span>
              <div>
                <b>{item.title}</b>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Progression */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="rule-label">
            <span className="eyebrow">Progression</span>
          </div>
          <h2 className="display text-[1.9rem] max-w-[24ch]">
            Climb a ladder that had to be earned.
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((tier) => (
            <span
              key={tier.name}
              className="tier-chip"
              style={{
                ["--tier" as string]: tier.color,
                border: "1px solid color-mix(in srgb, var(--tier) 35%, var(--rule))",
                borderRadius: "999px",
                padding: "0.3rem 0.6rem",
              }}
            >
              {tier.name}
            </span>
          ))}
        </div>

        <p className="text-[0.92rem] leading-relaxed max-w-[52ch]" style={{ color: "var(--ink-soft)" }}>
          Bronze through Legend, three divisions apiece, with global, country and
          city leaderboards. A daily streak grid tracks the habit, and verified
          cleanups can be shared to a city feed where photos are screened before
          they publish.
        </p>
      </section>

      {/* Close */}
      <section className="cta-band">
        <h2 className="display text-[1.9rem] max-w-[18ch]">
          Find out where it actually goes.
        </h2>
        <Link href="/scan" className="btn btn-primary">
          Open the scanner
        </Link>
        <p className="text-[0.8rem]" style={{ color: "var(--ink-faint)" }}>
          Built for NextStep Hacks 2026
        </p>
      </section>
    </div>
  );
}
