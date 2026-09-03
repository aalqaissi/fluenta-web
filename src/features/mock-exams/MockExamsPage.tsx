import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Trash2, Globe, User, Upload, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { UploadMockModal } from "./UploadMockModal";
import { mockExams, QUESTION_TYPE_LABEL, type MockExamCard } from "@/mock/data";
import type { QuestionType } from "@/mock/types";
import { cn } from "@/lib/utils";

const partTabs = [
  { key: "all", label: "Mock Test" },
  { key: "1", label: "Part 1" },
  { key: "2", label: "Part 2" },
  { key: "3", label: "Part 3" },
];

export function MockExamsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MockExamCard[]>(mockExams);
  const [part, setPart] = useState("all");
  const [type, setType] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<MockExamCard | null>(null);

  const filtered = items.filter(
    (e) => (part === "all" || String(e.part) === part) && (type === "all" || e.primaryType === type)
  );

  return (
    <div>
      <PageHeader
        title="Mock exams & self-improvement"
        subtitle="Upload, manage, and take your own mock exams."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" /> Upload mock
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={part} onValueChange={setPart}>
          <TabsList>
            {partTabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {filtered.length} of {items.length} exams ready to take
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* upload card */}
        <button
          onClick={() => setUploadOpen(true)}
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-5 text-center transition-colors hover:border-primary hover:bg-primary/[0.04]"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Plus className="size-6" />
          </span>
          <span className="font-bold">Upload reading mock</span>
          <span className="text-xs text-muted-foreground">Create a new exam</span>
        </button>

        {filtered.map((e) => (
          <Card key={e.id} className="flex flex-col p-5">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant={e.scope === "global" ? "muted" : "info"}>
                {e.scope === "global" ? <Globe className="size-3" /> : <User className="size-3" />}
                {e.scope === "global" ? "Global" : "My upload"}
              </Badge>
              <button
                onClick={() => setToDelete(e)}
                aria-label="Delete exam"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <h3 className="font-bold leading-snug">{e.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{QUESTION_TYPE_LABEL[e.primaryType]}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{e.attempts} attempts</span>
              <Button
                size="sm"
                onClick={() =>
                  e.playableId
                    ? navigate(`/exam/reading/${e.playableId}`)
                    : toast("Preview exam", { description: "This sample card isn’t wired to a full passage yet." })
                }
              >
                <Play className="size-4" /> Take exam
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <UploadMockModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete exam?"
        description="Are you sure you want to delete this exam? This will permanently remove all exam data. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) {
            setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
            toast.success("Exam deleted");
          }
        }}
      />
    </div>
  );
}
