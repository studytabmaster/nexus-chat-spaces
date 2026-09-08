import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { dmListQuery } from "@/lib/queries";
import { ChatView } from "@/components/app/ChatView";
import { UserAvatar } from "@/components/app/UserAvatar";
import { LoadingState, ErrorState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_authenticated/dm/$dmId")({
  head: () => ({
    meta: [
      { title: "DM — Nexa" },
      { name: "description", content: "ダイレクトメッセージ。" },
      { property: "og:title", content: "DM — Nexa" },
      { property: "og:description", content: "ダイレクトメッセージ。" },
    ],
  }),
  component: DmPage,
});

function DmPage() {
  const { dmId } = Route.useParams();
  const me = useMe();
  const navigate = useNavigate();
  const dms = useQuery(dmListQuery(me.data?.id ?? ""));

  useEffect(() => {
    if (!me.data || !dmId) return;
    supabase.from("dm_members").upsert({ dm_id: dmId, user_id: me.data.id, last_read_at: new Date().toISOString() });
  }, [dmId, me.data]);

  if (!me.data) return <LoadingState />;
  if (dms.isLoading) return <LoadingState />;
  if (dms.isError) return <ErrorState message={dms.error.message} onRetry={() => dms.refetch()} />;

  const dm = dms.data?.find((d) => d.dm_id === dmId);
  if (!dm) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="font-semibold">DMが見つかりません</p>
        <p className="text-sm text-muted-foreground">一覧から会話を選んでください。</p>
      </div>
    );
  }

  const other = dm.other;
  if (!other) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="font-semibold">相手が見つかりません</p>
      </div>
    );
  }

  return (
    <ChatView
      source={{ kind: "dm", dmId }}
      title={other.display_name}
      subtitle={`@${other.username}`}
      members={[other]}
      headerExtra={
        <button
          onClick={() => navigate({ to: "/u/$userId", params: { userId: other.id } })}
          className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1 hover:bg-surface-hover"
        >
          <UserAvatar name={other.display_name} avatarUrl={other.avatar_url} size="sm" />
          <span className="text-sm font-medium">プロフィール</span>
        </button>
      }
    />
  );
}
