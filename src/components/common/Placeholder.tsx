import { Hammer } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "./EmptyState";

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState icon={Hammer} title="This screen is being built" description="Coming together in this prototype round." />
    </div>
  );
}
