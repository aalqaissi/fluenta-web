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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  lockSkill?: "listening" | "speaking" | "full-exam";
  aiBadge?: boolean;
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

export const secondaryNav: NavItem[] = [
  { label: "Mock Exam & Self Improvement", to: "/mock-exams", icon: Layers },
  { label: "Lessons & Library", to: "/lessons", icon: Library },
  { label: "Progress", to: "/progress", icon: TrendingUp },
  { label: "Achievements", to: "/achievements", icon: Trophy },
  { label: "Certificates", to: "/certificates", icon: BadgeCheck },
  { label: "Fluenta Coach", to: "/coach", icon: Bot, aiBadge: true },
];
