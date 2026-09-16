import type { CommunityRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

/** 名前の横に表示する称号とロール */
export function NameDecorations({
  title,
  roles,
  className,
  max = 2,
}: {
  title?: string | null | undefined;
  roles?: CommunityRole[] | undefined;
  className?: string;
  max?: number;
}) {
  const shown = (roles ?? []).slice(0, max);
  if (!title && shown.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 align-middle", className)}>
      {title && (
        <span
          className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-[1px] text-[10px] font-medium text-primary"
          title="称号"
        >
          {title}
        </span>
      )}
      {shown.map((r) => (
        <span
          key={r.id}
          className="rounded-md px-1.5 py-[1px] text-[10px] font-medium"
          style={{ color: r.color, backgroundColor: `${r.color}1f`, border: `1px solid ${r.color}55` }}
          title={r.name}
        >
          {r.icon ? `${r.icon} ` : ""}
          {r.name}
        </span>
      ))}
    </span>
  );
}
