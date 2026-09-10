import ImpactDashboard from "@/components/ImpactDashboard";
import LevelBar from "@/components/LevelBar";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import BadgeGrid from "@/components/BadgeGrid";
import AccountPanel from "@/components/AccountPanel";

export default function HistoryPage() {
  return (
    <div className="shell flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Your impact</span>
        <h1 className="display text-[2rem]">Everything you&apos;ve sorted.</h1>
      </div>
      <LevelBar />
      <DailyChallengeCard />
      <BadgeGrid />
      <ImpactDashboard />
      <AccountPanel />
    </div>
  );
}
