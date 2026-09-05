import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Bot, GraduationCap, Sparkles, MessageSquareText, Infinity as InfinityIcon,
  RefreshCw, Loader2, WifiOff, TrendingUp, TrendingDown, ChevronRight, CheckCircle2, Clock,
  FileText, Mic, PlayCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LockChip } from "@/components/common/LockChip";
import { SkillIcon, skillMeta, COMING_SOON_SKILLS } from "@/components/common/SkillIcon";
import { useApp } from "@/store/app-context";
import { brand } from "@/config/brand";
import { api, type SkillStat } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { formatBand, bandTone, cn } from "@/lib/utils";
import { SetExamDateModal } from "@/components/modals/SetExamDateModal";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { StudyStreak } from "./StudyStreak";
import { ExamCountdown } from "./ExamCountdown";
import { TrackSwitcher } from "./TrackSwitcher";
import { ProgressLineChart, SkillBarChart } from "./charts";
import type { SkillKey } from "@/mock/types";

const PRACTICE: { skill: SkillKey; desc: string }[] = [
  { skill: "reading", desc: "Comprehension exercises" },
  { skill: "writing", desc: "Task 1 & 2 practice" },
  { skill: "listening", desc: "Audio practice" },
  { skill: "speaking", desc: "Voice recording" },
  { skill: "vocabulary", desc: "Word building" },
  { skill: "grammar", desc: "Rules & usage" },
];

const ACTIVITY_ICON: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  submitted: FileText,
  feedback: Mic,
  unfinished: PlayCircle,
};

export function DashboardPage() {
  const { user, effectivePlan, isLocked } = useApp();
  const navigate = useNavigate();
  const [examOpen, setExamOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tab, setTab] = useState<string>("overall");
  const isPro = effectivePlan === "pro";

  const { data: ov, loading, error, reload } = useAsync(() => api.overview(), []);
  const { data: fb, reload: reloadFb } = useAsync(() => api.feedback.summary(), []);

  const bandByKey = new Map((ov?.skills ?? []).map((s) => [s.key, s]));

  return (
    <div className="space-y-6">
      <TrackSwitcher />

      {/* Hero */}
      <Card className="relative overflow-hidden border-0 bg-warm-gradient p-6 text-white md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5" /> Your IELTS Journey
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
              Welcome back, {user.name.split(" ")[0]} 👋
            </h2>
            <p className="mt-1.5 text-sm text-white/85">
              Track your progress, identify areas for improvement, and reach your target band with
              personalized insights and coaching.
            </p>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={() => setFeedbackOpen(true)}>
            <MessageSquareText className="size-4" /> Give Feedback
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left / main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Practice by Skill */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-4 text-primary" /> Practice by Skill
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">Jump right into your next practice session.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRACTICE.map(({ skill, desc }) => {
                const meta = skillMeta[skill];
                const soon = COMING_SOON_SKILLS.includes(skill);
                const locked = !soon && isLocked(skill as "reading" | "writing" | "listening" | "speaking");
                const band = bandByKey.get(skill)?.band ?? null;
                const inner = (
                  <>
                    <SkillIcon skill={skill} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{meta.label}</span>
                        {soon && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">soon</span>}
                        {locked && <LockChip />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{soon ? "Coming soon" : desc}</p>
                    </div>
                    {band != null && (
                      <span className={cn("shrink-0 text-sm font-extrabold tabular-nums", bandTone(band))}>{formatBand(band)}</span>
                    )}
                  </>
                );
                const classes = cn(
                  "group relative flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all",
                  soon ? "cursor-not-allowed opacity-80" : "hover:-translate-y-0.5 hover:shadow-soft-md"
                );
                return soon ? (
                  <div key={skill} className={classes} title="Coming soon">{inner}</div>
                ) : (
                  <Link key={skill} to={`/simulation/${skill}`} className={classes}>
                    {inner}
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
                  <GraduationCap className="size-5" /> {isPro ? "Start full IELTS exam" : "Unlock full IELTS exam"}
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold opacity-90">
                  {isPro ? "2.5–3 hrs" : <LockChip className="bg-white/20 text-white" />} <ArrowRight className="size-4" />
                </span>
              </Button>
              <Button variant="outline" className="h-12 w-full justify-center" onClick={() => navigate("/coach")}>
                <Bot className="size-4 text-info" /> Chat with {brand.coachName}
                <Badge variant="info" className="ml-1">AI</Badge>
              </Button>
            </div>
          </section>

          {/* Progress Report */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold"><TrendingUp className="size-4 text-primary" /> Progress Report</h3>
                <p className="text-sm text-muted-foreground">Your performance trends and target progress.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reload}><RefreshCw className="size-4" /> Refresh</Button>
            </div>

            {error ? (
              <div className="py-8 text-center"><WifiOff className="mx-auto mb-2 size-6 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></div>
            ) : loading || !ov ? (
              <div className="py-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="mb-4 rounded-2xl bg-muted/50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-semibold"><div className="size-2 rounded-full bg-primary" /> Progress to Target</span>
                    <span className="font-bold">{formatBand(ov.currentAverage)} <span className="text-muted-foreground">/ {formatBand(ov.targetBand)}</span></span>
                  </div>
                  <Progress value={Math.min(100, Math.round((ov.currentAverage / ov.targetBand) * 100))} />
                  <p className="mt-1.5 text-xs text-muted-foreground">{Math.round((ov.currentAverage / ov.targetBand) * 100)}% of target achieved</p>
                </div>

                {/* tabs */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {["overall", ...ov.skills.map((s) => s.key)].map((k) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                        tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {k === "overall" ? "Overall" : skillMeta[k as SkillKey]?.label ?? k}
                    </button>
                  ))}
                </div>
                <ProgressLineChart points={ov.series[tab] ?? ov.series.overall ?? []} />

                {/* stat tiles */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <StatTile value={String(ov.testsCompleted)} label="Tests Completed" />
                  <StatTile value={formatBand(ov.currentAverage)} label="Current Average" tone={bandTone(ov.currentAverage)} />
                  <StatTile value={formatBand(ov.gapToTarget)} label="Gap to Target" tone="text-destructive" />
                </div>
              </>
            )}
          </Card>

          {/* Strengths & Weaknesses */}
          {ov && (
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-base font-bold"><TrendingUp className="size-4 text-primary" /> Strengths &amp; Weaknesses</h3>
                <p className="text-sm text-muted-foreground">Detailed performance analysis across all skills.</p>
              </div>

              <SkillBarChart skills={ov.skills} />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ov.strongest && (
                  <div className="rounded-xl bg-success/[0.06] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-success"><TrendingUp className="size-4" /> Strongest Section</div>
                    <div className="mt-1 text-xl font-extrabold">{ov.strongest.label}</div>
                    <div className="text-sm text-muted-foreground">Average: {formatBand(ov.strongest.band)}</div>
                  </div>
                )}
                {ov.weakest && (
                  <div className="rounded-xl bg-destructive/[0.05] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-destructive"><TrendingDown className="size-4" /> Needs Improvement</div>
                    <div className="mt-1 text-xl font-extrabold">{ov.weakest.label}</div>
                    <div className="text-sm text-muted-foreground">Average: {formatBand(ov.weakest.band)}</div>
                  </div>
                )}
              </div>

              {/* per-skill list */}
              <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                {ov.skills.map((s) => (
                  <SkillRow key={s.key} s={s} />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* right column */}
        <div className="space-y-6">
          {/* Current plan */}
          <Card className={cn("p-5", isPro ? "bg-success/[0.06]" : "")}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Your Current Plan</h3>
              <Badge variant={isPro ? "success" : "muted"}>{isPro ? user.planLabel : "Free"}</Badge>
            </div>
            {isPro ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-success/12 text-success"><InfinityIcon className="size-5" /></div>
                  <div>
                    <div className="text-sm font-bold">Unlimited Access</div>
                    <div className="text-xs text-muted-foreground">Practice as much as you need — no limits.</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Renews in {user.renewsInDays} days</p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => navigate("/checkout")}>Manage Plan</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">You’re on the free plan. Upgrade for all sections and unlimited AI feedback.</p>
                <Button className="mt-3 w-full" onClick={() => navigate("/checkout")}>Upgrade to Pro <ArrowRight className="size-4" /></Button>
              </>
            )}
          </Card>

          <ExamCountdown onEdit={() => setExamOpen(true)} />
          <StudyStreak />

          {/* My Feedback */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-base font-bold"><MessageSquareText className="size-4 text-primary" /> My Feedback</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Track your feedback and responses.</p>
            {fb && fb.total > 0 ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <FbStat n={fb.newCount} label="New" tone="text-info" />
                  <FbStat n={fb.underReview} label="In review" tone="text-secondary" />
                  <FbStat n={fb.completed} label="Completed" tone="text-success" />
                </div>
                {fb.latest && (
                  <button
                    onClick={() => navigate(`/feedback/${fb.latest!.id}`)}
                    className="mt-3 flex w-full items-center gap-2 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{fb.latest.subject || fb.latest.category}</span>
                      <span className="block text-xs text-muted-foreground capitalize">{fb.latest.status.replace("_", " ")}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                )}
                <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/feedback")}>View All Feedback</Button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted-foreground">No feedback submitted yet.</p>
                <Button variant="soft" className="mt-3 w-full" onClick={() => setFeedbackOpen(true)}>Give Feedback</Button>
              </>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-base font-bold"><Clock className="size-4 text-primary" /> Recent Activity</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Your learning journey.</p>
            {ov && ov.recentActivity.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {ov.recentActivity.map((a) => {
                  const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", a.type === "unfinished" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{a.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                          {a.band != null ? ` · band ${formatBand(a.band)}` : ""}
                        </span>
                      </span>
                      {a.type === "unfinished" && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/simulation/${a.skill}`)}>Continue</Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No recent activity yet. Start practicing to see your progress here!</p>
            )}
          </Card>
        </div>
      </div>

      <SetExamDateModal open={examOpen} onOpenChange={setExamOpen} />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} onSubmitted={reloadFb} />
    </div>
  );
}

function StatTile({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <div className={cn("text-2xl font-extrabold tabular-nums", tone)}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function FbStat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="rounded-lg border border-border py-2">
      <div className={cn("text-lg font-extrabold tabular-nums", tone)}>{n}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SkillRow({ s }: { s: SkillStat }) {
  const meta = skillMeta[s.key as SkillKey];
  return (
    <div className="flex items-center gap-3 p-3">
      <SkillIcon skill={s.key as SkillKey} size="sm" />
      <span className="flex-1 text-sm font-semibold">{meta?.label ?? s.label}</span>
      <span className={cn("text-sm font-extrabold tabular-nums", s.band == null ? "text-muted-foreground" : bandTone(s.band))}>
        {s.band == null ? "–" : formatBand(s.band)}
      </span>
      <span className="w-14 text-right text-xs text-muted-foreground">{s.tests} tests</span>
    </div>
  );
}
