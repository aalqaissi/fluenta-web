import * as React from "react";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import type { FluentaUser, PlanTier } from "@/mock/types";
import { api, getToken, setToken, ApiError } from "@/lib/api";
import { brand } from "@/config/brand";

export type IeltsModule = "academic" | "general";

interface AppState {
  user: FluentaUser;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  /** dev-only: preview the free (locked) experience */
  previewFree: boolean;
  setPreviewFree: (v: boolean) => void;
  effectivePlan: PlanTier;
  isLocked: (skill: "listening" | "speaking" | "full-exam" | "reading" | "writing") => boolean;
  /** Optimistically update the profile and persist it to the API. */
  updateUser: (patch: Partial<FluentaUser>) => void;
  /** Academic vs General Training — affects Reading & Writing content */
  module: IeltsModule;
  setModule: (m: IeltsModule) => void;
  logout: () => Promise<void>;
}

const AppContext = React.createContext<AppState | null>(null);

type Phase = "loading" | "ready" | "error";

function msg(e: unknown): string {
  return e instanceof ApiError ? e.message : String((e as any)?.message ?? e);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<FluentaUser | null>(null);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [error, setError] = React.useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [previewFree, setPreviewFree] = React.useState(false);
  const [module, setModule] = React.useState<IeltsModule>("academic");

  const bootstrap = React.useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      if (!getToken()) {
        const { token } = await api.auth.login();
        setToken(token);
      }
      setUser(await api.me.get());
      setPhase("ready");
    } catch (e) {
      // Expired/invalid token → try one fresh (demo) login before giving up.
      if (e instanceof ApiError && e.status === 401) {
        try {
          const { token, user: u } = await api.auth.login();
          setToken(token);
          setUser(u);
          setPhase("ready");
          return;
        } catch (e2) {
          setError(msg(e2));
          setPhase("error");
          return;
        }
      }
      setError(msg(e));
      setPhase("error");
    }
  }, []);

  React.useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const effectivePlan: PlanTier = previewFree ? "free" : user?.plan ?? "pro";

  const updateUser = React.useCallback((patch: Partial<FluentaUser>) => {
    setUser((u) => (u ? { ...u, ...patch } : u)); // optimistic
    api.me.patch(patch).then(setUser).catch(() => {
      /* keep optimistic value; a reload will resync */
    });
  }, []);

  const isLocked = React.useCallback(
    (skill: "listening" | "speaking" | "full-exam" | "reading" | "writing") => {
      if (effectivePlan === "pro") return false;
      // Free tier: reading & writing available; the rest locked
      return skill === "listening" || skill === "speaking" || skill === "full-exam";
    },
    [effectivePlan]
  );

  const logout = React.useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    await bootstrap(); // demo re-establishes a session immediately
  }, [bootstrap]);

  if (phase !== "ready" || !user) {
    return <BootstrapScreen phase={phase} error={error} onRetry={bootstrap} />;
  }

  const value: AppState = {
    user,
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((v) => !v),
    setSidebarCollapsed,
    previewFree,
    setPreviewFree,
    effectivePlan,
    isLocked,
    updateUser,
    module,
    setModule,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Branded splash while the session bootstraps, and a clear offline/error state with retry. */
function BootstrapScreen({
  phase,
  error,
  onRetry,
}: {
  phase: Phase;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-warm-gradient text-2xl font-extrabold text-white">
          F
        </div>
        {phase === "loading" ? (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading {brand.name}…</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <WifiOff className="size-5" />
            </div>
            <h1 className="text-lg font-bold">Can’t reach the {brand.name} API</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              {error ?? "The backend is unavailable."} Make sure the backend is running (see{" "}
              <code className="rounded bg-muted px-1">backend/README.md</code>), then retry.
            </p>
            <button
              onClick={onRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
