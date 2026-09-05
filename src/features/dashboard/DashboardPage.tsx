import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Bot,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  Sparkles,
  MessageSquareText,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LockChip } from "@/components/common/LockChip";
import { useApp } from "@/store/app-context";
import { brand } from "@/config/brand";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { formatBand, bandTone, cn } from "@/lib/utils";
import { SetExamDateModal } from "@/components/modals/SetExamDateModal";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { StudyStreak } from "./StudyStreak";
import { ExamCountdown } from "./ExamCountdown";

const quickStart = [
  { skill: "reading", label: "Reading", desc: "Comprehension exercises", to: "/simulation/reading", icon: BookOpen, tint: "bg-success/12 text-success" },
  { skill: "writing", label: "Writing", desc: "Task 1 & 2 practice", to: "/simulation/writing", icon: PenLine, tint: "bg-info/12 text-info" },
  { skill: "listening", label: "Listening", desc: "Audio practice", to: "/simulation/listening", icon: Headphones, tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  { skill: "speaking", label: "Speaking", desc: "Voice recording", to: "/simulation/speaking", icon: Mic, tint: "bg-primary/12 text-primary" },
] as const;

export function DashboardPage() {
  const { user, effectivePlan, isLocked } = useApp();
  const navigate = useNavigate();
  const [examOpen, setExamOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { data: progress } = useAsync(() => api.content.progress(), []);
  const sectionSummaries = progress?.sectionSummaries ?? [];
  const isPro = effectivePlan === "pro";
  const targetPct = Math.round((3 / user.targetBand) * 100);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="relative overflow-hidden border-0 bg-warm-gradient p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-40 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5" /> Your IELTS journey
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
              {isPro ? `Welcome back, ${user.name.split(" ")[0]} 👋` : "Unlock your full potential"}
            </h2>
            <p className="mt-1.5 text-sm text-white/85">
              {isPro
                ? "Track your progress, spot weak areas, and reach your target band with personalized AI coaching."
                : "Get unlimited practice, all four sections, and AI feedback across every skill."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {isPro ? (
              <Button variant="secondary" onClick={() => setFeedbackOpen(true)}>
                <MessageSquareText className="size-4" /> Give feedback
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => navigate("/checkout")}>
                  Upgrade to Pro <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={() => navigate("/simulation/reading")}
                >
                  Try for free
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left / main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick start */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-4 text-primary" /> Quick start practice
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">Jump right into your next practice session.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickStart.map((q) => {
                const locked = isLocked(q.skill);
                return (
                  <Link
                    key={q.skill}
                    to={q.to}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-md",
                      locked && "opacity-95"
                    )}
                  >
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", q.tint)}>
                      <q.icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{q.label}</span>
                        {locked && <LockChip />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {locked ? "Included with Pro — preview available" : q.desc}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 space-y-2">
              <Button
                className={cn("h-14 w-full justify-between text-base", !isPro && "bg-secondary text-secondary-foreground hover:brightness-95")}
                onClick={() => navigate("/simulation/full-exam")}
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="size-5" />
                  {isPro ? "Start full IELTS exam" : "Unlock full IELTS exam"}
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold opacity-90">
                  {isPro ? "2.5–3 hrs" : <LockChip className="bg-white/20 text-white" />}
                  <ArrowRight className="size-4" />
                </span>
              </Button>
              <Button variant="outline" className="h-12 w-full justify-center" onClick={() => navigate("/coach")}>
                <Bot className="size-4 text-info" /> Chat with {brand.coachName}
                <Badge variant="info" className="ml-1">AI</Badge>
              </Button>
            </div>
          </section>

          {/* Progress report */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Progress report</h3>
                <p className="text-sm text-muted-foreground">Your performance trends and target progress.</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl bg-muted/50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold">
                  <div className="size-2 rounded-full bg-primary" /> Progress to target
                </span>
                <span className="font-bold">
                  3.0 <span className="text-muted-foreground">/ {user.targetBand}</span>
                </span>
              </div>
              <Progress value={targetPct} />
              <p className="mt-1.5 text-xs text-muted-foreground">{targetPct}% of target achieved</p>
            </div>

            <Tabs defaultValue="overall">
              <TabsList className="flex w-full flex-wrap">
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="listening">Listening</TabsTrigger>
                <TabsTrigger value="reading">Reading</TabsTrigger>
                <TabsTrigger value="writing">Writing</TabsTrigger>
                <TabsTrigger value="speaking">Speaking</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sectionSummaries.map((s) => (
                <div key={s.skill} className="rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold capitalize text-muted-foreground">{s.skill}</div>
                  <div className={cn("mt-1 text-xl font-extrabold", bandTone(s.band))}>{formatBand(s.band)}</div>
                  <div className="text-[11px] text-muted-foreground">{s.tests} tests</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* right column */}
        <div className="space-y-6">
          {/* Current plan */}
          <Card className={cn("p-5", isPro ? "bg-success/[0.06]" : "")}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Your current plan</h3>
              <Badge variant={isPro ? "success" : "muted"}>{isPro ? user.planLabel : "Free"}</Badge>
            </div>
            {isPro ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-success/12 text-success">
                    <InfinityIcon className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Unlimited access</div>
                    <div className="text-xs text-muted-foreground">Practice as much as you need — no limits.</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Renews in {user.renewsInDays} days</p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => navigate("/checkout")}>
                  Manage plan
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You’re on the free plan. Upgrade for all four sections and unlimited AI feedback.
                </p>
                <Button className="mt-3 w-full" onClick={() => navigate("/checkout")}>
                  Upgrade to Pro <ArrowRight className="size-4" />
                </Button>
              </>
            )}
          </Card>

          <ExamCountdown onEdit={() => setExamOpen(true)} />
          <StudyStreak />

          {/* My feedback */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <MessageSquareText className="size-4 text-primary" /> My feedback
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Track your feedback and responses.</p>
            <Button variant="soft" className="mt-3 w-full" onClick={() => setFeedbackOpen(true)}>
              Share feedback
            </Button>
          </Card>
        </div>
      </div>

      <SetExamDateModal open={examOpen} onOpenChange={setExamOpen} />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
