import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, MessageCircle } from "lucide-react";
import { useMe } from "@/lib/auth";
import { dmListQuery } from "@/lib/queries";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { chatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dm")({
  head: () => ({
    meta: [
      { title: "DM — Nexa" },
      { name: "description", content: "ダイレクトメッセージ一覧。" },
      { property: "og:title", content: "DM — Nexa" },
      { property: "og:description", content: "ダイレクトメッセージ一覧。" },
    ],
  }),
  component: DmListPage,
});

function DmListPage() {
  const me = useMe();
  const dms = useQuery(dmListQuery(me.data?.id ?? ""));

  if (!me.data) return <LoadingState />;
  if (dms.isLoading) return <LoadingState />;
  if (dms.isError) return <ErrorState message={dms.error.message} onRetry={() => dms.refetch()} />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader
          title="Direct Messages"
          subtitle="友達とのプライベートチャット"
          actions={
            <Link to="/search" search={{ tab: "users" } as any}>
              <Button>
                <MessageSquarePlus className="mr-1 size-4" /> 新規DM
              </Button>
            </Link>
          }
        />

        {dms.data?.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="DMはまだありません"
            body="ユーザーを検索して、プライベートな会話を始めましょう。"
            action={
              <Link to="/search">
                <Button>ユーザーを探す</Button>
              </Link>
            }
          />
        )}

        <div className="space-y-2">
          {dms.data?.map((d) => (
            <Link
              key={d.dm_id}
              to="/dm/$dmId"
              params={{ dmId: d.dm_id }}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
            >
              <UserAvatar
                name={d.other?.display_name ?? "?"}
                avatarUrl={d.other?.avatar_url}
                showStatus={d.other?.show_online}
                status={d.other?.status}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{d.other?.display_name}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">
                  {d.last?.content ?? "まだメッセージがありません"}
                </p>
              </div>
              <div className="text-right">
                {d.last && <p className="text-xs text-muted-foreground">{chatTime(d.last.created_at)}</p>}
                {d.unread > 0 && (
                  <span className="mt-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {d.unread}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
