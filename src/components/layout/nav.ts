import {
  Home,
  Zap,
  BookOpen,
  PenLine,
  Headphones,
  Mic,
  GraduationCap,
  Layers,
  Library,
  TrendingUp,
  Trophy,
  BadgeCheck,
  Bot,
  Wand2,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  lockSkill?: "listening" | "speaking" | "full-exam";
  aiBadge?: boolean;
  adminBadge?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  collapsibleKey?: string;
}

export const primaryNav: NavItem[] = [{ label: "Overview", to: "/", icon: Home }];

export const simulationNav: NavItem = { label: "Simulation", to: "/simulation", icon: Zap };

export const simulationChildren: NavItem[] = [
  { label: "Reading", to: "/simulation/reading", icon: BookOpen },
  { label: "Writing", to: "/simulation/writing", icon: PenLine },
  { label: "Listening", to: "/simulation/listening", icon: Headphones, lockSkill: "listening" },
  { label: "Speaking", to: "/simulation/speaking", icon: Mic, lockSkill: "speaking" },
  { label: "Full Exam", to: "/simulation/full-exam", icon: GraduationCap, lockSkill: "full-exam" },
];

import { brand } from "@/config/brand";

export const secondaryNav: NavItem[] = [
  // NOTE: "Mock Exam & Self Improvement" is intentionally hidden this stage (see docs/ROADMAP.md
  // — cleanup item). The route/components still exist; do not delete yet.
  // { label: "Mock Exam & Self Improvement", to: "/mock-exams", icon: Layers },
  { label: "Content Studio", to: "/studio", icon: Wand2, adminBadge: true },
  { label: "Feedback Review", to: "/studio/feedback", icon: MessageSquare, adminBadge: true },
  { label: "Lessons & Library", to: "/lessons", icon: Library },
  // "Progress" removed — merged into the Overview page (see docs/ROADMAP.md).
  { label: "Achievements", to: "/achievements", icon: Trophy },
  { label: "Certificates", to: "/certificates", icon: BadgeCheck },
  { label: brand.coachName, to: "/coach", icon: Bot, aiBadge: true },
];
