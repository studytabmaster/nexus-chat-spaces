import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, BookmarkX } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSaved, SAVED_KIND_LABEL, type SavedKind } from "@/lib/social";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "保存済み — Nexa" },
      { name: "description", content: "保存したメッセージ・投稿・ファイルをまとめて確認できます。" },
      { property: "og:title", content: "保存済み — Nexa" },
      { property: "og:description", content: "保存したメッセージ・投稿・ファイルの一覧。" },
    ],
  }),
  component: SavedPage,
});

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "message", label: "メッセージ" },
  { value: "post", label: "投稿" },
  { value: "file", label: "ファイル" },
];

function SavedPage() {
  const { list, toggle } = useSaved();
  const [tab, setTab] = useState("all");

  const items = (list.data ?? []).filter((s) => (tab === "all" ? true : s.kind === tab || (tab === "message" && s.kind === "dm_message")));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader title="保存済み" subtitle="あとで見返したいものをここに集めています" />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {list.isLoading && <LoadingState />}
        {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
        {list.data && items.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title="保存済みはまだありません"
            body="メッセージや投稿の「保存」から追加できます。"
          />
        )}

        <div className="grid gap-2">
          {items.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {SAVED_KIND_LABEL[s.kind as SavedKind]} ・ {shortDate(s.created_at)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm">{s.preview || "（本文なし）"}</p>
                <Link to={s.link as "/"} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  元のメッセージへ移動
                </Link>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="保存を解除"
                onClick={() => toggle.mutate({ kind: s.kind, refId: s.ref_id, link: s.link, preview: s.preview })}
              >
                <BookmarkX className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
