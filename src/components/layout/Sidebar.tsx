import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronsLeft, ChevronsRight, LifeBuoy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-context";
import { Logo } from "./Logo";
import { LockChip } from "@/components/common/LockChip";
import { primaryNav, secondaryNav, simulationChildren, simulationNav, type NavItem } from "./nav";
import { ProfileMenu } from "./ProfileMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { isLocked } = useApp();
  const locked = item.lockSkill ? isLocked(item.lockSkill) : false;

  const inner = (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={cn("size-[18px] shrink-0", isActive && "text-primary")} />
          {!collapsed && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {!collapsed && item.aiBadge && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-info/12 px-1.5 py-0.5 text-[10px] font-bold text-info">
              <Sparkles className="size-2.5" /> AI
            </span>
          )}
          {!collapsed && locked && <LockChip />}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useApp();
  const location = useLocation();
  const [simOpen, setSimOpen] = React.useState(location.pathname.startsWith("/simulation"));

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface/80 backdrop-blur-sm transition-[width] duration-300 md:flex",
          sidebarCollapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        <div className={cn("flex h-16 items-center px-4", sidebarCollapsed && "justify-center px-0")}>
          <Logo collapsed={sidebarCollapsed} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {primaryNav.map((item) => (
            <NavRow key={item.to} item={item} collapsed={sidebarCollapsed} />
          ))}

          {/* Simulation group */}
          {sidebarCollapsed ? (
            simulationChildren.map((c) => <NavRow key={c.to} item={c} collapsed />)
          ) : (
            <div>
              <button
                onClick={() => setSimOpen((v) => !v)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <simulationNav.icon className="size-[18px]" />
                <span className="flex-1 text-left">Simulation</span>
                <ChevronDown className={cn("size-4 transition-transform", simOpen && "rotate-180")} />
              </button>
              {simOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-border pl-3">
                  {simulationChildren.map((c) => (
                    <NavRow key={c.to} item={c} collapsed={false} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="my-2 h-px bg-border" />

          {secondaryNav.map((item) => (
            <NavRow key={item.to} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <NavLink
            to="/help"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <LifeBuoy className="size-[18px]" />
            {!sidebarCollapsed && "Help & Support"}
          </NavLink>
          <ProfileMenu collapsed={sidebarCollapsed} />
        </div>

        {/* collapse toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 grid size-6 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-soft transition-colors hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
