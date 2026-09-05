import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, BadgeCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/features/studio/components";
import { TestReportForm } from "./TestReportForm";
import { certStore, useCerts, blankCert, avgBand, cefrFor, type CertRecord } from "./store";
import { formatBand } from "@/lib/utils";

const BANDS = [0, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export function CertificateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editingId = id && id !== "new" ? id : null;
  const certs = useCerts(); // triggers the API load + reactive updates
  const [cert, setCert] = useState<CertRecord>(() => (editingId ? certStore.find(editingId) ?? blankCert() : blankCert()));
  const [hydrated, setHydrated] = useState(!editingId || !!certStore.find(editingId));

  // When editing an existing certificate that wasn't cached yet, adopt it once it loads.
  useEffect(() => {
    if (editingId && !hydrated) {
      const found = certs.find((c) => c.id === editingId);
      if (found) {
        setCert(found);
        setHydrated(true);
      }
    }
  }, [certs, editingId, hydrated]);

  function set(patch: Partial<CertRecord>) {
    setCert((c) => {
      const next = { ...c, ...patch };
      // keep overall + cefr derived from section scores
      const overall = avgBand(next.scores);
      return { ...next, overall, cefr: cefrFor(overall) };
    });
  }
  function setScore(key: keyof CertRecord["scores"], v: number) {
    set({ scores: { ...cert.scores, [key]: v } });
  }
  function save(status: "draft" | "issued") {
    const rec = { ...cert, status };
    certStore.upsert(rec);
    toast.success(status === "issued" ? "Certificate issued" : "Draft saved", {
      description: status === "issued" ? "The student can now view their Test Report." : "Your changes are saved.",
    });
    if (status === "issued") navigate(`/certificate/${rec.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => save("draft")}>
            <Save className="size-4" /> Save draft
          </Button>
          <Button size="sm" onClick={() => save("issued")}>
            <BadgeCheck className="size-4" /> Issue certificate
          </Button>
        </div>
      </div>

      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Edit certificate details</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* form */}
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <Field label="Certificate title">
              <Input value={cert.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Candidate name">
                <Input value={cert.candidate} onChange={(e) => set({ candidate: e.target.value })} />
              </Field>
              <Field label="Module">
                <Select value={cert.module} onValueChange={(v) => set({ module: v as CertRecord["module"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="general">General Training</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Centre">
                <Input value={cert.centre} onChange={(e) => set({ centre: e.target.value })} />
              </Field>
              <Field label="Date">
                <Input type="date" value={cert.issuedOn} onChange={(e) => set({ issuedOn: e.target.value })} />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={cert.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
              </Field>
              <Field label="Sex">
                <Select value={cert.sex || undefined} onValueChange={(v) => set({ sex: v as CertRecord["sex"] })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Country / region of origin">
                <Input value={cert.countryOfOrigin} onChange={(e) => set({ countryOfOrigin: e.target.value })} placeholder="e.g. Jordan" />
              </Field>
              <Field label="Country of nationality">
                <Input value={cert.nationality} onChange={(e) => set({ nationality: e.target.value })} placeholder="e.g. Jordanian" />
              </Field>
              <Field label="First language">
                <Input value={cert.firstLanguage} onChange={(e) => set({ firstLanguage: e.target.value })} placeholder="e.g. Arabic" />
              </Field>
              <Field label="Scheme code">
                <Input value={cert.schemeCode} onChange={(e) => set({ schemeCode: e.target.value })} placeholder="Online Practice Test" />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-sm font-bold">Test Results</p>
            <div className="grid grid-cols-2 gap-4">
              {(["listening", "reading", "writing", "speaking"] as const).map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                  <Select value={String(cert.scores[k])} onValueChange={(v) => setScore(k, Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANDS.map((b) => (
                        <SelectItem key={b} value={String(b)}>{formatBand(b)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-xl bg-muted/50 p-3 text-sm">
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Overall</div>
                <div className="text-lg font-extrabold text-primary">{formatBand(cert.overall)}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">CEFR</div>
                <div className="text-lg font-extrabold">{cert.cefr}</div>
              </div>
              <p className="ml-auto text-xs text-muted-foreground">Overall &amp; CEFR are calculated from the section scores.</p>
            </div>
          </Card>

          <Card className="p-5">
            <Field label="Administrator comments">
              <Textarea value={cert.comments} onChange={(e) => set({ comments: e.target.value })} rows={3} />
            </Field>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.success("Downloading…", { description: `${cert.title}.pdf` })}>
              <Download className="size-4" /> Download PDF
            </Button>
          </Card>
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
          <TestReportForm cert={cert} />
        </div>
      </div>
    </div>
  );
}
