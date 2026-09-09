import ImpactDashboard from "@/components/ImpactDashboard";

export default function HistoryPage() {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h1 className="text-xl font-bold">Your Impact</h1>
      <ImpactDashboard />
    </div>
  );
}
