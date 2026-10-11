import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { dmListQuery } from "@/lib/queries";
import { ChatView } from "@/components/app/ChatView";
import { UserAvatar } from "@/components/app/UserAvatar";
import { LoadingState, ErrorState } from "@/components/app/EmptyState";
import type { Profile } from "@/types";

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

  // 一覧にまだ含まれていない場合の個別相手取得クエリ
  const singleDm = useQuery({
    queryKey: ["dm-single", dmId, me.data?.id],
    enabled: !!me.data?.id && !!dmId && !dms.data?.some((d) => d.dm_id === dmId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_members")
        .select("user_id, profile:profiles(*)")
        .eq("dm_id", dmId)
        .neq("user_id", me.data!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.profile as Profile | null) ?? null;
    },
  });

  useEffect(() => {
    if (!me.data?.id || !dmId) return;
    // upsertではなくupdateを使用（dm_membersはupdateポリシーのみ許可されているため）
    supabase
      .from("dm_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("dm_id", dmId)
      .eq("user_id", me.data.id)
      .then();
  }, [dmId, me.data?.id]);

  if (!me.data) return <LoadingState />;
  if (dms.isLoading && singleDm.isLoading) return <LoadingState />;
  if (dms.isError) return <ErrorState message={dms.error.message} onRetry={() => dms.refetch()} />;

  const dm = dms.data?.find((d) => d.dm_id === dmId);
  const other = dm?.other ?? singleDm.data;

  if (!other) {
    if (singleDm.isLoading) return <LoadingState />;
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="font-semibold">DMが見つかりません</p>
        <p className="text-sm text-muted-foreground">一覧から会話を選んでください。</p>
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
