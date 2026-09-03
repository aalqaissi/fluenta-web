import { BookOpen, PenLine, Headphones, Mic, type LucideIcon } from "lucide-react";
import type { SkillKey } from "@/mock/types";
import { cn } from "@/lib/utils";

export const skillMeta: Record<SkillKey, { label: string; icon: LucideIcon; tint: string; text: string }> = {
  reading: { label: "Reading", icon: BookOpen, tint: "bg-success/12", text: "text-success" },
  writing: { label: "Writing", icon: PenLine, tint: "bg-info/12", text: "text-info" },
  listening: { label: "Listening", icon: Headphones, tint: "bg-secondary/15", text: "text-[rgb(var(--on-secondary))]" },
  speaking: { label: "Speaking", icon: Mic, tint: "bg-primary/12", text: "text-primary" },
};

export function SkillIcon({ skill, className, size = "md" }: { skill: SkillKey; className?: string; size?: "sm" | "md" | "lg" }) {
  const m = skillMeta[skill];
  const Icon = m.icon;
  const box = size === "lg" ? "size-12 rounded-2xl" : size === "sm" ? "size-8 rounded-lg" : "size-10 rounded-xl";
  const ic = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  return (
    <span className={cn("inline-flex items-center justify-center", box, m.tint, m.text, className)}>
      <Icon className={ic} />
    </span>
  );
}
