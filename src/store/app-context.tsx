import * as React from "react";
import type { FluentaUser, PlanTier } from "@/mock/types";
import { api } from "@/lib/api";
import { useAuth } from "./auth-context";

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

/**
 * App UI state + the authenticated user. Mounted only once the user is signed in and onboarded
 * (see AppShell), so `user` is always present here. Auth/session lives in {@link useAuth}.
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const user = auth.user;

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [previewFree, setPreviewFree] = React.useState(false);
  const [module, setModule] = React.useState<IeltsModule>("academic");

  const effectivePlan: PlanTier = previewFree ? "free" : user?.plan ?? "pro";

  const updateUser = React.useCallback(
    (patch: Partial<FluentaUser>) => {
      if (auth.user) auth.setUser({ ...auth.user, ...patch }); // optimistic
      api.me.patch(patch).then(auth.setUser).catch(() => {
        /* keep optimistic value; a refresh resyncs */
      });
    },
    [auth]
  );

  const isLocked = React.useCallback(
    (skill: "listening" | "speaking" | "full-exam" | "reading" | "writing") => {
      if (effectivePlan === "pro") return false;
      // Free tier: reading & writing available; the rest locked
      return skill === "listening" || skill === "speaking" || skill === "full-exam";
    },
    [effectivePlan]
  );

  if (!user) return null; // guarded by AppShell; defensive

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
    logout: auth.logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
