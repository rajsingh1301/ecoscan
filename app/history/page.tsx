import ImpactDashboard from "@/components/ImpactDashboard";
import LevelBar from "@/components/LevelBar";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import BadgeGrid from "@/components/BadgeGrid";

export default function HistoryPage() {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h1 className="text-xl font-bold">Your Impact</h1>
      <div className="w-full max-w-sm flex flex-col gap-4">
        <LevelBar />
        <DailyChallengeCard />
        <BadgeGrid />
      </div>
      <ImpactDashboard />
    </div>
  );
}
