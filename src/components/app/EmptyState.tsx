import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-accent">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <p className="font-medium">読み込みに失敗しました</p>
      {message && <p className="mt-1 text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-sm font-medium text-primary hover:underline">
          再試行
        </button>
      )}
    </div>
  );
}
