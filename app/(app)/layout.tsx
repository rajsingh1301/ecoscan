import AuthGuard from "@/components/AuthGuard";
import LocationGate from "@/components/LocationGate";

/**
 * Everything in this group needs a session (or a guest choice) and a location.
 * Keeping both on the group layout means a new page can't be added and
 * accidentally left open, or left asking for a location of its own.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <LocationGate>{children}</LocationGate>
    </AuthGuard>
  );
}
