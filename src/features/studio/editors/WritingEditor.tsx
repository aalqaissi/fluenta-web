import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MediaDrop, AiButton, Field } from "../components";
import type { StudioExam, WritingParts } from "../store";

export function WritingEditor({ exam, patch }: { exam: StudioExam; patch: (p: Partial<StudioExam>) => void }) {
  const w: WritingParts = exam.writing ?? { academicT1: { imageName: null, prompt: "" }, generalT1: { prompt: "", bullets: ["", "", ""] }, task2: { prompt: "" } };
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
            <Field label="Task 1 prompt">
              <Textarea value={w.academicT1.prompt} onChange={(e) => setW({ academicT1: { ...w.academicT1, prompt: e.target.value } })} rows={4} placeholder="The chart below shows… Summarise the information…" />
            </Field>
            <AiButton label="Generate prompt with AI" onClick={() => setW({ academicT1: { ...w.academicT1, prompt: "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant." } })} />
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="space-y-4">
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
