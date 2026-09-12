import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users as UsersIcon, Loader2, WifiOff, CheckCircle2, BadgeCheck, ShieldQuestion } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, ApiError, type AdminUserDto } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
type PlanFilter = "all" | "free" | "pro";
type VerFilter = "all" | "verified" | "unverified";

export function UsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [ver, setVer] = useState<VerFilter>("all");
  const [page, setPage] = useState(0);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, error, reload } = useAsync(
    () =>
      api.adminUsers.list({
        query: debounced || undefined,
        plan: plan === "all" ? undefined : plan,
        verified: ver === "all" ? undefined : ver === "verified",
        page,
        size: PAGE_SIZE,
      }),
    [debounced, plan, ver, page]
  );

  // Reset to page 0 together with the filter/search change itself (not via a separate
  // effect keyed on [debounced, plan, ver]) so a filter change while on page > 0 fires
  // exactly one request — with page already 0 — instead of one with the stale page
  // followed by a second once the reset commits.
  function onSearchChange(value: string) {
    setQuery(value);
    setPage(0);
  }
  function onPlanChange(p: PlanFilter) {
    setPlan(p);
    setPage(0);
  }
  function onVerChange(v: VerFilter) {
    setVer(v);
    setPage(0);
  }

  async function verify(u: AdminUserDto) {
    try {
      await api.adminUsers.setVerified(u.id, true);
      toast.success(`${u.name} marked verified`);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    }
  }

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = to < total;

  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
       active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted");

  return (
    <div>
      <PageHeader title="Users" subtitle="All registered accounts, their plan, and verification status." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search name or email…" className="h-10 max-w-xs" />
        <span className="mx-1 h-5 w-px bg-border" />
        {(["all", "free", "pro"] as PlanFilter[]).map((p) => (
          <button key={p} className={chip(plan === p)} onClick={() => onPlanChange(p)}>{p === "all" ? "All plans" : p === "pro" ? "Pro" : "Free"}</button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {(["all", "verified", "unverified"] as VerFilter[]).map((v) => (
          <button key={v} className={chip(ver === v)} onClick={() => onVerChange(v)}>{v === "all" ? "All" : v === "verified" ? "Verified" : "Unverified"}</button>
        ))}
      </div>

      {error ? (
        <Card className="p-10 text-center"><WifiOff className="mx-auto mb-2 size-6 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></Card>
      ) : loading ? (
        <Card className="p-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /></Card>
      ) : (data?.items.length ?? 0) === 0 ? (
        <Card className="p-10 text-center"><UsersIcon className="mx-auto mb-2 size-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">No users match this view.</p></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Full name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Bundle</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data!.items.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3"><Badge variant={u.plan === "pro" ? "success" : "muted"}>{u.planLabel}</Badge></td>
                    <td className="px-4 py-3">
                      {u.emailVerified ? (
                        <Badge variant="success"><BadgeCheck className="size-3" /> Verified</Badge>
                      ) : (
                        <Badge variant="secondary"><ShieldQuestion className="size-3" /> Unverified</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!u.emailVerified && (
                        <Button size="sm" variant="outline" onClick={() => verify(u)}><CheckCircle2 className="size-4" /> Mark verified</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{from}–{to} of {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!hasPrev} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
