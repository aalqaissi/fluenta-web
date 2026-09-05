import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Zap, MessageSquare, Gauge, Clock, ShieldCheck, Check, Minus, ArrowRight, Radio, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { UpgradeBanner } from "@/components/common/UpgradeBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

const STANDARD_FEATURES = [
  { icon: Clock, title: "Practice at your pace", note: "No time pressure — review questions as needed" },
  { icon: Sparkles, title: "Pre-generated prompts", note: "AI-generated questions for all three parts" },
  { icon: Gauge, title: "Instant AI grading", note: "Detailed band scores and improvement suggestions" },
];
const LIVE_FEATURES = [
  { icon: Radio, title: "Real-time AI interviewer", note: "The examiner responds naturally, like the real thing" },
  { icon: Mic, title: "Live voice interaction", note: "Speak naturally; it listens and responds instantly" },
  { icon: Zap, title: "Adaptive questions", note: "Follow-up questions adjust to your answers" },
  { icon: GraduationCap, title: "Authentic exam experience", note: "Exact timing and format of the real Speaking test" },
];
const COMPARISON: { label: string; standard: string | boolean; live: string | boolean }[] = [
  { label: "AI-generated questions", standard: true, live: true },
  { label: "Instant AI feedback", standard: true, live: true },
  { label: "Real-time voice conversation", standard: false, live: true },
  { label: "Adaptive follow-up questions", standard: false, live: true },
  { label: "Exam-like timing", standard: "Flexible", live: "Exact" },
  { label: "Practice pace", standard: "Self-paced", live: "Real-time" },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-4 text-success" />;
  if (v === false) return <Minus className="mx-auto size-4 text-muted-foreground" />;
  return <span className="text-sm font-semibold">{v}</span>;
}

export function SpeakingPage() {
  const navigate = useNavigate();
  const { isLocked } = useApp();
  const locked = isLocked("speaking");

  return (
    <div>
      <PageHeader
        title="Speaking practice"
        subtitle="Choose your practice mode. Both provide AI-powered feedback and an authentic IELTS experience."
      />
      {locked && <UpgradeBanner feature="Speaking practice" />}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Standard */}
        <Card className="flex flex-col p-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-secondary/15 text-[rgb(var(--on-secondary))]">
              <Mic className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">Standard Practice</h2>
              <p className="text-sm text-muted-foreground">Record your responses at your own pace with instant AI feedback</p>
            </div>
          </div>
          <div className="mt-2 space-y-3">
            {STANDARD_FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3">
                <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
            <span className="font-semibold">Best for:</span> <span className="text-muted-foreground">Beginners &amp; self-study</span>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={() => navigate("/simulation/speaking/standard")}>
            Start Standard Practice <ArrowRight className="size-4" />
          </Button>
        </Card>

        {/* Live Interview */}
        <Card className="relative flex flex-col overflow-hidden border-primary/40 p-6">
          <Badge variant="success" className="absolute right-4 top-4">NEW</Badge>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-warm-gradient text-white shadow-glow">
              <Radio className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">Live Interview</h2>
              <p className="text-sm text-muted-foreground">Real-time conversation with the AI interviewer — just like the real exam</p>
            </div>
          </div>
          <div className="mt-2 space-y-3">
            {LIVE_FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3">
                <f.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
            <span className="font-semibold">Best for:</span> <span className="text-muted-foreground">Exam simulation &amp; advanced prep</span>
          </div>
          <Button className="mt-5 w-full" size="lg" disabled title="Coming soon">
            Live Interview — coming soon
          </Button>
        </Card>
      </div>

      {/* comparison */}
      <h2 className="mb-3 mt-8 text-lg font-bold">Feature comparison</h2>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 text-center font-semibold">Standard</th>
                <th className="px-4 py-3 text-center font-semibold">Live Interview</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{row.label}</td>
                  <td className="px-4 py-3 text-center"><Cell v={row.standard} /></td>
                  <td className="px-4 py-3 text-center"><Cell v={row.live} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-success" /> 100% secure &amp; private · your recordings stay yours
      </p>
    </div>
  );
}
