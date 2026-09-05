import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaDrop, Field } from "../components";
import type { StudioExam, WritingParts, ChartType, Formality } from "../store";
import { cn } from "@/lib/utils";

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "bar-chart", label: "Bar Chart" },
  { value: "diagram", label: "Diagram" },
  { value: "line-graph", label: "Line Graph" },
  { value: "maps", label: "Maps" },
  { value: "multiple-graph", label: "Multiple Graph" },
  { value: "pie-chart", label: "Pie Chart" },
  { value: "process-diagram", label: "Process Diagram" },
  { value: "table", label: "Table" },
];
const FORMALITY: { value: Formality; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "semi-formal", label: "Semi Formal" },
];

const DEFAULT_WRITING: WritingParts = {
  academicT1: { imageName: null, chartType: "bar-chart", imageDescription: "", prompt: "", minWords: 150, timeMinutes: 20, idealAnswer: "" },
  generalT1: { imageName: null, formality: "formal", prompt: "", minWords: 150, timeMinutes: 20, idealAnswer: "" },
  task2: { imageName: null, prompt: "", minWords: 250, timeMinutes: 40, idealAnswer: "" },
};

function Collapsible({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold"
        aria-expanded={open}
      >
        <span>{label}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

function MinWordsTime({ minWords, timeMinutes, onChange }: {
  minWords: number;
  timeMinutes: number;
  onChange: (np: { minWords?: number; timeMinutes?: number }) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Minimum words">
        <Input type="number" min={0} value={minWords} onChange={(e) => onChange({ minWords: Math.max(0, Number(e.target.value) || 0) })} />
      </Field>
      <Field label="Time (minutes)">
        <Input type="number" min={0} value={timeMinutes} onChange={(e) => onChange({ timeMinutes: Math.max(0, Number(e.target.value) || 0) })} />
      </Field>
    </div>
  );
}

const IDEAL_PLACEHOLDER = "A model answer admins can reference when reviewing AI grading later.";

export function WritingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const w: WritingParts = exam.writing ?? DEFAULT_WRITING;
  const [tab, setTab] = useState("academic");
  const setW = (np: Partial<WritingParts>) => patch({ writing: { ...w, ...np } });
  const setA = (np: Partial<WritingParts["academicT1"]>) => setW({ academicT1: { ...w.academicT1, ...np } });
  const setG = (np: Partial<WritingParts["generalT1"]>) => setW({ generalT1: { ...w.generalT1, ...np } });
  const setT2 = (np: Partial<WritingParts["task2"]>) => setW({ task2: { ...w.task2, ...np } });

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm text-muted-foreground">Set up each task, then publish for your students. The tabs cover Academic and General Training.</p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="academic">Academic Task 1</TabsTrigger>
          <TabsTrigger value="general">General Task 1</TabsTrigger>
          <TabsTrigger value="task2">Task 2</TabsTrigger>
        </TabsList>

        {/* Academic Task 1 */}
        <TabsContent value="academic">
          <div className="space-y-4">
            <Field label="Chart / Diagram / Map image">
              <MediaDrop kind="image" value={w.academicT1.imageName} onChange={(name) => setA({ imageName: name })} />
            </Field>
            <Field label="Task 1 question">
              <Textarea value={w.academicT1.prompt} onChange={(e) => setA({ prompt: e.target.value })} rows={4} placeholder="The chart below shows… Summarise the information…" />
            </Field>
            <Collapsible label="Advanced">
              <Field label="Chart type">
                <Select value={w.academicT1.chartType} onValueChange={(v) => setA({ chartType: v as ChartType })}>
                  <SelectTrigger><SelectValue placeholder="Choose a chart type…" /></SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </Collapsible>
            <Field label="Image description (for accurate grading)">
              <Textarea value={w.academicT1.imageDescription} onChange={(e) => setA({ imageDescription: e.target.value })} rows={2} placeholder="Describe exactly what the chart shows — axes, series, units, notable values — so the AI can grade against it." />
            </Field>
            <MinWordsTime minWords={w.academicT1.minWords} timeMinutes={w.academicT1.timeMinutes} onChange={setA} />
            <Collapsible label="Add an ideal answer (optional)">
              <Textarea value={w.academicT1.idealAnswer} onChange={(e) => setA({ idealAnswer: e.target.value })} rows={5} placeholder={IDEAL_PLACEHOLDER} />
            </Collapsible>
          </div>
        </TabsContent>

        {/* General Task 1 */}
        <TabsContent value="general">
          <div className="space-y-4">
            <Field label="Letter image / photo (optional)">
              <MediaDrop kind="image" value={w.generalT1.imageName} onChange={(name) => setG({ imageName: name })} />
            </Field>
            <Field label="Task 1 question (letter prompt)">
              <Textarea value={w.generalT1.prompt} onChange={(e) => setG({ prompt: e.target.value })} rows={4} placeholder="You recently… Write a letter to… In your letter…" />
            </Field>
            <Collapsible label="Advanced">
              <Field label="Letter formality">
                <Select value={w.generalT1.formality} onValueChange={(v) => setG({ formality: v as Formality })}>
                  <SelectTrigger><SelectValue placeholder="Choose formality…" /></SelectTrigger>
                  <SelectContent>
                    {FORMALITY.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </Collapsible>
            <MinWordsTime minWords={w.generalT1.minWords} timeMinutes={w.generalT1.timeMinutes} onChange={setG} />
            <Collapsible label="Add an ideal answer (optional)">
              <Textarea value={w.generalT1.idealAnswer} onChange={(e) => setG({ idealAnswer: e.target.value })} rows={5} placeholder={IDEAL_PLACEHOLDER} />
            </Collapsible>
          </div>
        </TabsContent>

        {/* Task 2 */}
        <TabsContent value="task2">
          <div className="space-y-4">
            <Field label="Prompt image (optional)">
              <MediaDrop kind="image" value={w.task2.imageName} onChange={(name) => setT2({ imageName: name })} />
            </Field>
            <Field label="Task 2 question">
              <Textarea value={w.task2.prompt} onChange={(e) => setT2({ prompt: e.target.value })} rows={4} placeholder="Some people believe… Discuss both views and give your opinion." />
            </Field>
            <MinWordsTime minWords={w.task2.minWords} timeMinutes={w.task2.timeMinutes} onChange={setT2} />
            <Collapsible label="Add an ideal answer (optional)">
              <Textarea value={w.task2.idealAnswer} onChange={(e) => setT2({ idealAnswer: e.target.value })} rows={5} placeholder={IDEAL_PLACEHOLDER} />
            </Collapsible>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
