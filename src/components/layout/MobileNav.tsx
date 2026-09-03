import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "./Logo";
import { primaryNav, secondaryNav, simulationChildren } from "./nav";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-context";
import { LockChip } from "@/components/common/LockChip";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isLocked } = useApp();
  const all = [...primaryNav, ...simulationChildren, ...secondaryNav];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button aria-label="Open menu" className="grid size-10 place-items-center rounded-xl border border-border bg-surface">
          <Menu className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent centered={false} className="left-0 top-0 h-dvh max-w-[280px] overflow-y-auto rounded-none rounded-r-3xl">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="mb-4">
          <Logo />
        </div>
        <nav className="space-y-1 overflow-y-auto">
          {all.map((item) => {
            const locked = item.lockSkill ? isLocked(item.lockSkill) : false;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )
                }
              >
                <item.icon className="size-[18px]" />
                <span className="flex-1">{item.label}</span>
                {locked && <LockChip />}
              </NavLink>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
