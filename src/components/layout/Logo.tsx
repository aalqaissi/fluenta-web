import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function Logo({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warm-gradient font-extrabold text-white shadow-glow">
        {brand.shortName?.[0] ?? brand.name[0]}
      </span>
      {!collapsed && (
        <span className="text-lg font-extrabold tracking-tight">{brand.name}</span>
      )}
    </div>
  );
}
