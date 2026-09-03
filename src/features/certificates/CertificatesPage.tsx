import { toast } from "sonner";
import { Award, Download, Share2, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { certificates } from "@/mock/data";
import { brand } from "@/config/brand";
import { formatBand } from "@/lib/utils";

export function CertificatesPage() {
  return (
    <div>
      <PageHeader title="Certificates" subtitle="Shareable proof of the milestones you’ve completed on Fluenta." />

      {certificates.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" description="Complete a course or reach a band milestone to earn your first certificate." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {certificates.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              {/* certificate preview */}
              <div className="relative border-b border-border bg-warm-soft p-6 text-center">
                <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-primary/30" />
                <div className="relative">
                  <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-warm-gradient text-white shadow-glow">
                    <BadgeCheck className="size-6" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Certificate of achievement</p>
                  <h3 className="mt-1 text-lg font-extrabold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Awarded by {brand.name}</p>
                  <Badge variant="success" className="mt-2">Band {formatBand(c.band)}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">
                  Issued {new Date(c.issuedOn + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast("Shared link copied", { description: c.title })}>
                    <Share2 className="size-4" /> Share
                  </Button>
                  <Button size="sm" onClick={() => toast.success("Downloading certificate…", { description: `${c.title}.pdf` })}>
                    <Download className="size-4" /> Download
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
