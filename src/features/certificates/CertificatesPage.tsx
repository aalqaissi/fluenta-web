import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Award, Eye, Copy, Trash2, MoreVertical, Plus, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { formatBand, prettyDate } from "@/lib/utils";
import { useCerts, certStore, type CertRecord } from "./store";

export function CertificatesPage() {
  const navigate = useNavigate();
  const certs = useCerts();
  const [toDelete, setToDelete] = useState<CertRecord | null>(null);

  return (
    <div>
      <PageHeader
        title="Certificates"
        actions={
          <Button size="sm" onClick={() => navigate("/studio/certificate/new")}>
            <Plus className="size-4" /> Issue certificate
          </Button>
        }
      />

      <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
        Certificates are created from an exam’s results page once it’s graded.{" "}
        <span className="font-semibold text-foreground">Standard</span> is free for any completed practice test.{" "}
        <span className="font-semibold text-foreground">IELTS Report</span> is available on a full exam and requires a Pro or Lifetime plan.
      </p>

      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" description="Complete a full practice test to earn your first Test Report." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold text-muted-foreground">
            {certs.length} certificate{certs.length === 1 ? "" : "s"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Certificate</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Band</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warm-gradient text-white">
                          <BadgeCheck className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{c.candidate}</div>
                          <div className="truncate text-xs text-muted-foreground">{c.verificationNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {c.type === "ielts-report" ? (
                        <span className="inline-flex items-center rounded-md bg-foreground px-2 py-1 text-xs font-bold text-background">IELTS Report</span>
                      ) : (
                        <span className="text-muted-foreground">Standard</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-bold tabular-nums">{formatBand(c.overall)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{prettyDate(new Date(c.issuedOn + "T00:00:00"))}</td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreVertical className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/certificate/${c.id}`)}><Eye className="size-4" /> View report</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/studio/certificate/${c.id}`)}><BadgeCheck className="size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(c.verificationNumber); toast.success("Verification number copied"); }}>
                            <Copy className="size-4" /> Copy verification #
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setToDelete(c)} className="text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete certificate?"
        description="This permanently removes this Test Report. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) {
            certStore.remove(toDelete.id);
            toast.success("Certificate deleted");
          }
        }}
      />
    </div>
  );
}
