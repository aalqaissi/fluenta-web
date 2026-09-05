import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BookOpen, PenLine, Headphones, Mic, GraduationCap, Pencil, Copy, Eye, Trash2,
  Upload, CloudOff, BadgeCheck, Loader2, WifiOff,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { StatusBadge } from "./components";
import { studioStore, useStudioExamsState, type StudioSkill, type StudioExam } from "./store";
import { cn, prettyDate } from "@/lib/utils";

const SKILLS: { key: StudioSkill; label: string; icon: typeof BookOpen; tint: string }[] = [
  { key: "reading", label: "Reading", icon: BookOpen, tint: "bg-success/12 text-success" },
  { key: "writing", label: "Writing", icon: PenLine, tint: "bg-info/12 text-info" },
  { key: "listening", label: "Listening", icon: Headphones, tint: "bg-secondary/15 text-[rgb(var(--on-secondary))]" },
  { key: "speaking", label: "Speaking", icon: Mic, tint: "bg-primary/12 text-primary" },
  { key: "full", label: "Full Mock", icon: GraduationCap, tint: "bg-primary/12 text-primary" },
];

export function StudioHome() {
  const navigate = useNavigate();
  const { exams, loading, error, reload } = useStudioExamsState();
  const [filter, setFilter] = useState<StudioSkill | "all">("all");
  const [toDelete, setToDelete] = useState<StudioExam | null>(null);

  const list = exams.filter((e) => filter === "all" || e.skill === filter);

  function create(skill: StudioSkill) {
    const id = studioStore.create(skill);
    navigate(`/studio/${skill}/${id}`);
  }

  return (
    <div>
      <PageHeader
        title="Content Studio"
        subtitle="Author reading, writing, listening & speaking exams — then draft, preview and publish. No developer needed."
      />

      {/* create row */}
      <Card className="mb-6 p-4">
        <p className="mb-3 text-sm font-bold">Create new content</p>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <Button key={s.key} variant="outline" onClick={() => create(s.key)}>
              <s.icon className="size-4" /> {s.label}
            </Button>
          ))}
          <Button variant="outline" onClick={() => navigate("/studio/certificate/new")}>
            <BadgeCheck className="size-4" /> Certificate
          </Button>
        </div>
      </Card>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StudioSkill | "all")}>
        <TabsList className="mb-5 flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {SKILLS.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <Card className="p-10 text-center">
          <WifiOff className="mx-auto mb-2 size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={reload}>Retry</Button>
        </Card>
      ) : loading && list.length === 0 ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading your content…</p>
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No content here yet. Use “Create new content” above.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((e) => {
            const meta = SKILLS.find((s) => s.key === e.skill)!;
            return (
              <Card key={e.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", meta.tint)}>
                  <meta.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{e.title || "Untitled"}</h3>
                    <StatusBadge status={e.status} />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                      {e.skill === "full" ? "Full mock" : `${meta.label} · ${e.module}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {countLabel(e)} · updated {prettyDate(new Date(e.updatedAt))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="ghost" size="icon-sm" title="Preview" onClick={() => toast("Preview", { description: "Opens the student view of this content." })}>
                    <Eye className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Duplicate" onClick={() => { studioStore.duplicate(e.id); toast.success("Duplicated"); }}>
                    <Copy className="size-4" />
                  </Button>
                  {e.status === "published" ? (
                    <Button variant="outline" size="sm" onClick={() => { studioStore.setStatus(e.id, "draft"); toast("Unpublished"); }}>
                      <CloudOff className="size-4" /> Unpublish
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { studioStore.setStatus(e.id, "published"); toast.success("Published"); }}>
                      <Upload className="size-4" /> Publish
                    </Button>
                  )}
                  <Button size="sm" onClick={() => navigate(`/studio/${e.skill}/${e.id}`)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => setToDelete(e)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete content?"
        description="This permanently removes this exam and its questions. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) {
            studioStore.remove(toDelete.id);
            toast.success("Deleted");
          }
        }}
      />
    </div>
  );
}

function countLabel(e: StudioExam): string {
  if (e.skill === "reading") return `${e.passages?.length ?? 0} passages`;
  if (e.skill === "listening") return `${e.sections?.length ?? 0} sections`;
  if (e.skill === "speaking") return `${e.parts?.length ?? 0} parts`;
  if (e.skill === "full") {
    const p = e.full;
    const n = p ? [p.reading, p.writing, p.listening, p.speaking].filter(Boolean).length : 0;
    return `${n}/4 parts selected`;
  }
  return "Task 1 & Task 2";
}
