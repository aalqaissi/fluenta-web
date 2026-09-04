import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaDrop, AiButton, Field } from "../components";
import type { StudioExam, WritingParts, ChartType, Formality } from "../store";

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
  academicT1: { imageName: null, chartType: "bar-chart", imageDescription: "", prompt: "" },
  generalT1: { formality: "formal", prompt: "", bullets: ["", "", ""] },
  task2: { prompt: "" },
};

export function WritingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const w: WritingParts = exam.writing ?? DEFAULT_WRITING;
  const [tab, setTab] = useState("academic");
  const setW = (np: Partial<WritingParts>) => patch({ writing: { ...w, ...np } });

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm text-muted-foreground">Upload a Task 1 diagram and write the Task 2 prompt, then publish for your students.</p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="academic">Academic Task 1</TabsTrigger>
          <TabsTrigger value="general">General Task 1</TabsTrigger>
          <TabsTrigger value="task2">Task 2</TabsTrigger>
        </TabsList>

        <TabsContent value="academic">
          <div className="space-y-4">
            <Field label="Chart / Diagram / Map image">
              <MediaDrop kind="image" value={w.academicT1.imageName} onChange={(name) => setW({ academicT1: { ...w.academicT1, imageName: name } })} />
            </Field>
            <Field label="Chart type">
              <Select value={w.academicT1.chartType} onValueChange={(v) => setW({ academicT1: { ...w.academicT1, chartType: v as ChartType } })}>
                <SelectTrigger><SelectValue placeholder="Choose a chart type…" /></SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Image description (for accurate grading)">
              <Textarea value={w.academicT1.imageDescription} onChange={(e) => setW({ academicT1: { ...w.academicT1, imageDescription: e.target.value } })} rows={2} placeholder="Describe exactly what the chart shows — axes, series, units, notable values — so the AI can grade against it." />
            </Field>
            <Field label="Task 1 prompt">
              <Textarea value={w.academicT1.prompt} onChange={(e) => setW({ academicT1: { ...w.academicT1, prompt: e.target.value } })} rows={4} placeholder="The chart below shows… Summarise the information…" />
            </Field>
            <AiButton label="Generate prompt with AI" onClick={() => setW({ academicT1: { ...w.academicT1, prompt: "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant." } })} />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="space-y-4">
            <Field label="Formality">
              <Select value={w.generalT1.formality} onValueChange={(v) => setW({ generalT1: { ...w.generalT1, formality: v as Formality } })}>
                <SelectTrigger><SelectValue placeholder="Choose formality…" /></SelectTrigger>
                <SelectContent>
                  {FORMALITY.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Letter prompt">
              <Textarea value={w.generalT1.prompt} onChange={(e) => setW({ generalT1: { ...w.generalT1, prompt: e.target.value } })} rows={3} placeholder="You recently… Write a letter to…" />
            </Field>
            <Field label="You should say (bullet points)">
              <div className="space-y-2">
                {w.generalT1.bullets.map((b, i) => (
                  <Input key={i} value={b} onChange={(e) => setW({ generalT1: { ...w.generalT1, bullets: w.generalT1.bullets.map((x, j) => (j === i ? e.target.value : x)) } })} placeholder={`Bullet ${i + 1}`} />
                ))}
              </div>
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="task2">
          <Field label="Task 2 essay prompt">
            <Textarea value={w.task2.prompt} onChange={(e) => setW({ task2: { prompt: e.target.value } })} rows={4} placeholder="Some people believe… Discuss both views and give your opinion." />
          </Field>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
