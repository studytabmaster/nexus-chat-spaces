import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { communityTasksQuery, eventsQuery } from "@/lib/events";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/c/$communityId/calendar")({
  head: () => ({
    meta: [
      { title: "カレンダー — Nexa" },
      { name: "description", content: "コミュニティの予定とタスク期限をカレンダーで確認。" },
      { property: "og:title", content: "カレンダー — Nexa" },
      { property: "og:description", content: "予定と期限を月表示・週表示で確認できます。" },
    ],
  }),
  component: CalendarPage,
});

type Entry = { id: string; kind: "event" | "task"; title: string; date: Date };

function CalendarPage() {
  const { communityId } = Route.useParams();
  const navigate = useNavigate();
  const events = useQuery(eventsQuery(communityId));
  const tasks = useQuery(communityTasksQuery(communityId));
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selected, setSelected] = useState<Date | null>(null);

  const entries: Entry[] = useMemo(() => {
    const e: Entry[] = (events.data ?? []).map((x) => ({
      id: x.id,
      kind: "event",
      title: x.title,
      date: new Date(x.starts_at),
    }));
    const t: Entry[] = (tasks.data ?? [])
      .filter((x) => x.due_date)
      .map((x) => ({ id: x.id, kind: "task", title: x.title, date: new Date(`${x.due_date}T00:00:00`) }));
    return [...e, ...t];
  }, [events.data, tasks.data]);

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor, view]);

  const move = (dir: -1 | 1) => setCursor((c) => (view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));
  const selectedEntries = selected ? entries.filter((e) => isSameDay(e.date, selected)) : [];

  if (events.isLoading || tasks.isLoading) return <LoadingState />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <PageHeader title="カレンダー" subtitle="予定とタスクの期限" />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => move(-1)} aria-label={view === "week" ? "前の週" : "前の月"}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center font-bold">
            {format(cursor, view === "week" ? "yyyy年M月 w週目" : "yyyy年M月", { locale: ja })}
          </span>
          <Button variant="secondary" size="sm" onClick={() => move(1)} aria-label={view === "week" ? "次の週" : "次の月"}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            今日
          </Button>
          <div className="flex-1" />
          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
            <TabsList>
              <TabsTrigger value="month">月表示</TabsTrigger>
              <TabsTrigger value="week">週表示</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border bg-border text-xs">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <div key={d} className="bg-card px-1 py-2 text-center font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const dayEntries = entries.filter((e) => isSameDay(e.date, d));
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={cn(
                  "min-h-20 bg-card p-1 text-left align-top transition-colors hover:bg-surface-hover",
                  !isSameMonth(d, cursor) && view === "month" && "opacity-45",
                  selected && isSameDay(d, selected) && "ring-1 ring-inset ring-primary",
                )}
              >
                <span
                  className={cn(
                    "inline-grid size-6 place-items-center rounded-full text-[11px]",
                    isSameDay(d, new Date()) && "bg-primary font-bold text-primary-foreground",
                  )}
                >
                  {format(d, "d")}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEntries.slice(0, 3).map((e) => (
                    <p
                      key={`${e.kind}-${e.id}`}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px]",
                        e.kind === "event" ? "bg-primary/15 text-primary" : "bg-accent text-muted-foreground",
                      )}
                    >
                      {e.kind === "event" ? "予定" : "期限"}・{e.title}
                    </p>
                  ))}
                  {dayEntries.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">＋{dayEntries.length - 3}</p>}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold">{format(selected, "M月d日(E)", { locale: ja })} の予定</h2>
            {selectedEntries.length === 0 && <p className="text-sm text-muted-foreground">予定はありません。</p>}
            <div className="grid gap-2">
              {selectedEntries.map((e) => (
                <button
                  key={`${e.kind}-${e.id}`}
                  onClick={() =>
                    navigate({
                      to: e.kind === "event" ? "/c/$communityId/events" : "/c/$communityId/tasks",
                      params: { communityId },
                    })
                  }
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-surface-hover"
                >
                  <CalendarDays className="size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.kind === "event" ? `予定 ・ ${format(e.date, "HH:mm")}` : "タスクの期限"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
