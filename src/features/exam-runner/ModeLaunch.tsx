import { useNavigate } from "react-router-dom";
import { Dumbbell, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withMode } from "./examMode";

/**
 * Launch a runner in Practice (timer optional, replay allowed) or under Full Exam conditions
 * (official timing, audio once, auto-submit) — the owner spec keeps these as separate modes.
 */
export function ModeLaunch({ to, size = "md", className }: { to: string; size?: "md" | "lg" | "sm"; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button size={size} variant="outline" onClick={() => navigate(withMode(to, "practice"))} title="Timer optional, audio can be replayed">
        <Dumbbell className="size-4" /> Practice
      </Button>
      <Button size={size} onClick={() => navigate(withMode(to, "exam"))} title="Official timing, audio played once, auto-submit">
        <Timer className="size-4" /> Exam conditions
      </Button>
    </div>
  );
}
