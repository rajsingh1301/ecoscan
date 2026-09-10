import AuthGuard from "@/components/AuthGuard";

/**
 * Everything in this group requires a session. Keeping the guard on the group
 * layout means a new page can't be added and accidentally left open.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AuthGuard>{children}</AuthGuard>;
}
