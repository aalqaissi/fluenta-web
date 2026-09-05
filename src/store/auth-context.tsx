import * as React from "react";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import type { FluentaUser } from "@/mock/types";
import { api, getToken, setToken, ApiError } from "@/lib/api";
import { brand } from "@/config/brand";

export type AuthStatus = "loading" | "authed" | "unauthed" | "error";

interface AuthState {
  status: AuthStatus;
  user: FluentaUser | null;
  error: string | null;
  /** Prototype login — any email; no password. Returns the signed-in user. */
  login: (email?: string) => Promise<FluentaUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Update the cached user (after a PATCH). */
  setUser: (u: FluentaUser) => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

function msg(e: unknown): string {
  return e instanceof ApiError ? e.message : String((e as any)?.message ?? e);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [user, setUser] = React.useState<FluentaUser | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!getToken()) {
      setStatus("unauthed");
      setUser(null);
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      setUser(await api.me.get());
      setStatus("authed");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
        setStatus("unauthed");
        setUser(null);
        return;
      }
      setError(msg(e));
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const login = React.useCallback(async (email?: string) => {
    const { token, user: u } = await api.auth.login(email);
    setToken(token);
    setUser(u);
    setStatus("authed");
    return u;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setStatus("unauthed");
  }, []);

  // A hard error (backend unreachable) blocks the whole app — show a retry screen.
  if (status === "error") {
    return <AuthErrorScreen error={error} onRetry={refresh} />;
  }

  const value: AuthState = { status, user, error, login, logout, refresh, setUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthErrorScreen({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-warm-gradient text-2xl font-extrabold text-white">
          {brand.shortName?.[0] ?? "Y"}
        </div>
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
      </div>
    </div>
  );
}

/** Small splash used while auth is resolving. */
export function AuthLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-warm-gradient text-2xl font-extrabold text-white">
          {brand.shortName?.[0] ?? "Y"}
        </div>
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading {brand.name}…</p>
      </div>
    </div>
  );
}
