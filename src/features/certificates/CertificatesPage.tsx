import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Award, Eye, Share2, BadgeCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { brand } from "@/config/brand";
import { formatBand, prettyDate } from "@/lib/utils";
import { useCerts } from "./store";

export function CertificatesPage() {
  const navigate = useNavigate();
  const certs = useCerts();

  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle="Shareable Test Reports for the practice exams you’ve completed on Fluenta."
        actions={
          <Button size="sm" onClick={() => navigate("/studio/certificate/new")}>
            <Plus className="size-4" /> Issue certificate
          </Button>
        }
      />

      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" description="Complete a full practice test to earn your first Test Report." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="relative border-b border-border bg-warm-soft p-6 text-center">
                <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-primary/30" />
                <div className="relative">
                  <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-warm-gradient text-white shadow-glow">
                    <BadgeCheck className="size-6" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Practice Test Report</p>
                  <h3 className="mt-1 text-lg font-extrabold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Awarded by {brand.name}</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge variant="success">Overall {formatBand(c.overall)}</Badge>
                    <Badge variant="muted">{c.module === "academic" ? "Academic" : "General"}</Badge>
                    {c.status === "draft" && <Badge variant="secondary">Draft</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">Issued {prettyDate(new Date(c.issuedOn + "T00:00:00"))}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast("Shared link copied", { description: c.title })}>
                    <Share2 className="size-4" /> Share
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/certificate/${c.id}`)}>
                    <Eye className="size-4" /> View report
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
