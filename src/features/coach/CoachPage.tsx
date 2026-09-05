import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, BookOpen, PenLine, User } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { coachSuggestions, initialCoachMessages } from "@/mock/data";
import type { CoachMessage } from "@/mock/types";
import { brand } from "@/config/brand";
import { delay, cn } from "@/lib/utils";

function replyFor(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("task achievement") || q.includes("band 5"))
    return "Your Task 2 lost marks on Task Achievement because the body paragraphs were left empty — you signposted “On the one hand / On the other hand” but didn’t develop either side. Try this: write one clear reason + one concrete example per paragraph. Want a 3-sentence template you can reuse?";
  if (q.includes("true/false") || q.includes("not given") || q.includes("reading drill"))
    return "Great — here’s a 10-minute True/False/Not Given drill: 1) Read the statement first, 2) find the matching lines, 3) ask “does the text confirm, contradict, or stay silent?”. Silent = Not Given. I’ll give you 5 statements now — ready?";
  if (q.includes("coherence") || q.includes("cohesion"))
    return "To lift coherence: use referencing (this, such, the latter) instead of repeating nouns, and make each paragraph start with a clear topic sentence. Shall we rewrite your intro together?";
  if (q.includes("skim") || q.includes("scan"))
    return "Skimming = reading fast for the general idea (read first/last sentences). Scanning = hunting for a specific detail (names, dates, numbers). In IELTS you skim once, then scan per question. Want to practice on a short passage?";
  return "Good question! Based on your recent results, I’d prioritise Writing Task 2 structure and Reading time-management. Want me to build you a short practice plan for this week?";
}

export function CoachPage() {
  const [messages, setMessages] = useState<CoachMessage[]>(initialCoachMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: CoachMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    await delay(900);
    setTyping(false);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "coach", text: replyFor(text), createdAt: new Date().toISOString() }]);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <PageHeader title={brand.coachName} subtitle="Your always-on AI tutor — ask about feedback, drills, or a study plan." />

      {/* AI held this stage */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-info/30 bg-info/[0.06] px-3 py-2 text-sm text-info">
        <Sparkles className="size-4" />
        <span><strong>Coming soon.</strong> The AI Coach is being built — chat is disabled for now.</span>
      </div>

      {/* context chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant="muted"><Sparkles className="size-3 text-info" /> Personalized to your results</Badge>
        <Badge variant="outline"><BookOpen className="size-3" /> Reading · band 3.5</Badge>
        <Badge variant="outline"><PenLine className="size-3" /> Writing · band 5.0</Badge>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full",
                m.role === "coach" ? "bg-warm-gradient text-white" : "bg-muted text-foreground"
              )}
            >
              {m.role === "coach" ? <Bot className="size-4" /> : <User className="size-4" />}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "coach" ? "bg-muted" : "bg-primary text-primary-foreground"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-warm-gradient text-white">
              <Bot className="size-4" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* suggestions (disabled while the AI Coach is held) */}
      {messages.length <= 2 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {coachSuggestions.map((s) => (
            <button
              key={s}
              disabled
              title="Coming soon"
              className="cursor-not-allowed rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* input (disabled while the AI Coach is held) */}
      <form onSubmit={(e) => e.preventDefault()} className="mt-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${brand.coachName} is coming soon…`}
          className="h-12"
          disabled
        />
        <Button type="button" size="icon" className="size-12 shrink-0" disabled title="Coming soon">
          <Send className="size-5" />
        </Button>
      </form>
    </div>
  );
}
