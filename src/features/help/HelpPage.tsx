import { useState } from "react";
import { MessageCircle, ChevronDown, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "How does AI grading work?", a: "After you submit a section, Fluenta analyses your answers and (for Writing/Speaking) your language, then returns a band estimate with specific, actionable feedback in about 15–30 seconds." },
  { q: "Are the band scores official?", a: "No. Fluenta gives realistic practice estimates to guide your preparation. Only the official IELTS test produces certified scores." },
  { q: "Can I upload my own reading passages?", a: "Yes — go to Mock Exams & Self Improvement and use “Upload mock” to turn any passage into a practice exam." },
  { q: "How do I cancel my subscription?", a: "You can manage or cancel your plan anytime from Account → Manage plan. Payment questions are handled via WhatsApp." },
];

export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Help & support" subtitle="Answers to common questions, or reach us directly." />

      <Card className="mb-5 flex flex-col items-start gap-3 bg-success/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-success/12 text-success">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h3 className="font-bold">Chat with support</h3>
            <p className="text-sm text-muted-foreground">We handle payment and account issues via WhatsApp.</p>
          </div>
        </div>
        <Button variant="success" onClick={() => toast("Opening WhatsApp…", { description: brand.supportWhatsApp })}>
          <MessageCircle className="size-4" /> Chat on WhatsApp
        </Button>
      </Card>

      <div className="space-y-2.5">
        {faqs.map((f, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold"
            >
              <span className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-primary" /> {f.q}
              </span>
              <ChevronDown className={cn("size-4 shrink-0 transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <p className="px-4 pb-4 pl-10 text-sm text-muted-foreground">{f.a}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
