import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer, ShieldCheck, BadgeCheck, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { TestReportForm } from "./TestReportForm";
import { useCerts } from "./store";

export function CertificateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const certs = useCerts();
  const cert = certs.find((c) => c.id === id);

  if (!cert) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState icon={BadgeCheck} title="Certificate not found" action={<Button onClick={() => navigate("/certificates")}>Back to certificates</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/certificates")}>
          <ArrowLeft className="size-4" /> Certificates
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/studio/certificate/${cert.id}`)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Verified", { description: "This is a genuine Yalla English Hub practice report." })}>
            <ShieldCheck className="size-4" /> Verify
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
          <Button size="sm" onClick={() => toast.success("Downloading…", { description: `${cert.title}.pdf` })}>
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-sm">
        <span className="font-bold">Practice Test Report.</span>{" "}
        <span className="text-muted-foreground">
          Not an official IELTS result. Band scores are AI-generated estimates for learning purposes only.
        </span>
      </div>

      <TestReportForm cert={cert} />
    </div>
  );
}
