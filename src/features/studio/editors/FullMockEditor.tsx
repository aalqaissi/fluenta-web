import { BookOpen, PenLine, Headphones, Mic, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, StatusBadge } from "../components";
import { useStudioExams, type StudioExam, type FullParts, type StudioSkill } from "../store";

const SLOTS: { key: keyof FullParts; skill: StudioSkill; label: string; icon: typeof BookOpen; tint: string }[] = [
  { key: "listening", skill: "listening", label: "Listening", icon: Headphones, tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  { key: "reading", skill: "reading", label: "Reading", icon: BookOpen, tint: "bg-success/12 text-success" },
  { key: "writing", skill: "writing", label: "Writing", icon: PenLine, tint: "bg-info/12 text-info" },
  { key: "speaking", skill: "speaking", label: "Speaking", icon: Mic, tint: "bg-primary/12 text-primary" },
];

export function FullMockEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const all = useStudioExams();
  const full: FullParts = exam.full ?? { reading: null, writing: null, listening: null, speaking: null };
  const setFull = (np: Partial<FullParts>) => patch({ full: { ...full, ...np } });

  const anyDraftSelected = SLOTS.some((s) => {
    const id = full[s.key];
    const picked = all.find((e) => e.id === id);
    return picked && picked.status === "draft";
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Assemble a full mock from your existing content. Only published parts can go live.</p>
      {SLOTS.map((slot) => {
        const options = all.filter((e) => e.skill === slot.skill);
        const picked = all.find((e) => e.id === full[slot.key]);
        return (
          <Card key={slot.key} className="p-4">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-xl ${slot.tint}`}>
                <slot.icon className="size-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{slot.label}</p>
                  {picked && <StatusBadge status={picked.status} />}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Field label="Choose content">
                <Select value={full[slot.key] ?? ""} onValueChange={(v) => setFull({ [slot.key]: v || null } as Partial<FullParts>)}>
                  <SelectTrigger><SelectValue placeholder={`Select a ${slot.label.toLowerCase()} exam…`} /></SelectTrigger>
                  <SelectContent>
                    {options.length === 0 ? (
                      <SelectItem value="none" disabled>No {slot.label.toLowerCase()} content yet</SelectItem>
                    ) : (
                      options.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.title} {o.status === "draft" ? "· draft" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>
        );
      })}

      {anyDraftSelected && (
        <div className="flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-[rgb(var(--on-secondary))]" />
          One or more selected parts are still drafts. Publish them individually before publishing the full mock.
        </div>
      )}
    </div>
  );
}
