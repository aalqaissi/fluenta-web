import { useApp } from "@/store/app-context";
import { cn } from "@/lib/utils";

/** Academic vs General Training switch (affects Reading & Writing content). */
export function ModuleToggle() {
  const { module, setModule } = useApp();
  const opts: { key: "academic" | "general"; label: string }[] = [
    { key: "academic", label: "Academic" },
    { key: "general", label: "General Training" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setModule(o.key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            module === o.key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
