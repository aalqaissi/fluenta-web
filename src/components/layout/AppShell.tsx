import { Navigate, Outlet } from "react-router-dom";
import { useAuth, AuthLoading } from "@/store/auth-context";
import { AppProvider } from "@/store/app-context";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Guards the authenticated app: loading → splash, no session → /login, signed in but not onboarded
 * → /onboarding. Only then mounts {@link AppProvider} (which guarantees a non-null user downstream).
 */
export function AppShell() {
  const { status, user } = useAuth();

  if (status === "loading") return <AuthLoading />;
  if (status === "unauthed" || !user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;

  return (
    <AppProvider>
      <div className="flex min-h-dvh bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
