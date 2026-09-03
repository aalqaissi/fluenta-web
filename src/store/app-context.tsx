import * as React from "react";
import { currentUser } from "@/mock/data";
import type { FluentaUser, PlanTier } from "@/mock/types";

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
  updateUser: (patch: Partial<FluentaUser>) => void;
}

const AppContext = React.createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<FluentaUser>(currentUser);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [previewFree, setPreviewFree] = React.useState(false);

  const effectivePlan: PlanTier = previewFree ? "free" : user.plan;

  const updateUser = React.useCallback((patch: Partial<FluentaUser>) => {
    setUser((u) => ({ ...u, ...patch }));
  }, []);

  const isLocked = React.useCallback(
    (skill: "listening" | "speaking" | "full-exam" | "reading" | "writing") => {
      if (effectivePlan === "pro") return false;
      // Free tier: reading & writing available; the rest locked
      return skill === "listening" || skill === "speaking" || skill === "full-exam";
    },
    [effectivePlan]
  );

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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
