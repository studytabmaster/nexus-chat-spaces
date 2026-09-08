import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="grid size-8 place-items-center rounded-xl bg-brand-gradient text-sm font-extrabold text-primary-foreground shadow-[0_0_24px_-6px_var(--color-glow)]">
        N
      </div>
      {!compact && <span className="text-lg font-extrabold tracking-tight">{APP_NAME}</span>}
    </div>
  );
}
