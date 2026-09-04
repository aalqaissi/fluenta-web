import { BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brand } from "@/config/brand";
import { formatBand, prettyDate } from "@/lib/utils";
import type { CertRecord } from "./store";

export function TestReportForm({ cert }: { cert: CertRecord }) {
  const rows = [
    { label: "Listening", value: cert.scores.listening },
    { label: "Reading", value: cert.scores.reading },
    { label: "Writing", value: cert.scores.writing },
    { label: "Speaking", value: cert.scores.speaking },
  ];
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border bg-warm-soft px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-warm-gradient font-extrabold text-white">F</span>
          <div>
            <p className="text-sm font-extrabold leading-tight">{brand.name}</p>
            <p className="text-[11px] text-muted-foreground">Practice Test Report Form</p>
          </div>
        </div>
        <Badge variant={cert.module === "academic" ? "info" : "secondary"}>
          {cert.module === "academic" ? "Academic" : "General Training"}
        </Badge>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Centre", cert.centre],
            ["Date", prettyDate(new Date(cert.issuedOn + "T00:00:00"))],
            ["Candidate", cert.candidate],
            ["Candidate ID", "FL-" + cert.id.slice(-6).toUpperCase()],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ["Date of birth", cert.dateOfBirth ? prettyDate(new Date(cert.dateOfBirth + "T00:00:00")) : "—"],
            ["Sex", cert.sex === "male" ? "M" : cert.sex === "female" ? "F" : "—"],
            ["Scheme code", cert.schemeCode || "—"],
            ["Country of origin", cert.countryOfOrigin || "—"],
            ["Nationality", cert.nationality || "—"],
            ["First language", cert.firstLanguage || "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>

        <h3 className="mb-3 mt-6 text-sm font-bold">Test Results</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="rounded-xl border border-border p-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="text-2xl font-extrabold">{formatBand(r.value)}</div>
            </div>
          ))}
          <div className="rounded-xl border-2 border-primary bg-primary/[0.05] p-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Overall Band</div>
            <div className="text-2xl font-extrabold text-primary">{formatBand(cert.overall)}</div>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">CEFR</div>
            <div className="text-2xl font-extrabold">{cert.cefr}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Administrator comments</div>
            <p className="mt-1 text-sm text-muted-foreground">{cert.comments}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="grid size-14 place-items-center rounded-full border-2 border-primary/40 text-primary">
                <BadgeCheck className="size-7" />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">Validation</div>
            </div>
            <QrPlaceholder />
          </div>
        </div>
      </div>
    </Card>
  );
}

function QrPlaceholder() {
  const cells = Array.from({ length: 49 }, (_, i) => (i * 37 + 11) % 3 === 0);
  return (
    <div className="grid grid-cols-7 gap-0.5 rounded-md border border-border p-1.5" aria-label="verification code">
      {cells.map((on, i) => (
        <span key={i} className={on ? "size-1.5 bg-foreground" : "size-1.5 bg-transparent"} />
      ))}
    </div>
  );
}
