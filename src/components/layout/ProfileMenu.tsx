import { useNavigate } from "react-router-dom";
import { CreditCard, Eye, LogOut, Settings, Sparkles } from "lucide-react";
import { useApp } from "@/store/app-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { PlanBadge } from "@/components/common/PlanBadge";
import { cn } from "@/lib/utils";

export function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { user, effectivePlan, previewFree, setPreviewFree } = useApp();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-muted",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="size-9">
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold">{user.name}</span>
              </div>
              <PlanBadge label={effectivePlan === "pro" ? user.planLabel : "Free"} className="mt-0.5" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings/account")}>
          <Settings /> Account settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/checkout")}>
          <CreditCard /> {effectivePlan === "pro" ? "Manage plan" : "Upgrade to Pro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Eye className="size-4" /> Preview free tier
          </span>
          <Switch checked={previewFree} onCheckedChange={setPreviewFree} aria-label="Preview free tier" />
        </div>
        <p className="px-2.5 pb-1 text-[11px] leading-snug text-muted-foreground">
          <Sparkles className="mr-1 inline size-3 text-info" />
          Demo toggle — shows the locked/upsell state the owner sees on a free account.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/login")}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
