import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, AtSign, Calendar, Users, UserPlus, Check, Clock, Flag } from "lucide-react";
import { ReportDialog } from "@/components/app/ReportDialog";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { profileQuery, myCommunitiesQuery } from "@/lib/queries";
import { UserAvatar } from "@/components/app/UserAvatar";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { shortDate } from "@/lib/format";
import { useFriends } from "@/lib/social";
import { userBadgesQuery } from "@/lib/community-extras";
import { Badge as UiBadge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCosmetics } from "@/lib/cosmetics";
import { CosmeticBanner, hasCosmeticBackground } from "@/components/app/CosmeticBanner";
import { NameDecorations } from "@/components/app/NameDecorations";

export const Route = createFileRoute("/_authenticated/u/$userId")({
  head: () => ({
    meta: [
      { title: "Profile — Nexa" },
      { name: "description", content: "ユーザープロフィール。" },
      { property: "og:title", content: "Profile — Nexa" },
      { property: "og:description", content: "ユーザープロフィール。" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const me = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery(profileQuery(userId));
  const myCommunities = useQuery(myCommunitiesQuery(me.data?.id ?? ""));
  const cosmetics = useCosmetics([userId]);
  const cosmetic = cosmetics[userId];
  const cosmeticBg = hasCosmeticBackground(cosmetic?.background, cosmetic?.background_image);

  const startDm = useMutation({
    mutationFn: async () => {
      if (!me.data?.id) throw new Error("ログインが必要です");
      if (me.data.id === userId) throw new Error("自分自身にはDMを送れません");
      const { data: dmId, error } = await supabase.rpc("start_dm", { _other: userId });
      if (error) throw error;
      if (!dmId) throw new Error("DMの作成に失敗しました");
      return dmId as string;
    },
    onSuccess: (dmId) => {
      qc.invalidateQueries({ queryKey: ["dms", me.data?.id] });
      navigate({ to: "/dm/$dmId", params: { dmId } });
    },
    onError: (e) => toast.error(e.message),
  });

  if (profile.isLoading) return <LoadingState />;
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={() => profile.refetch()} />;
  if (!profile.data) return <EmptyState icon={Users} title="ユーザーが見つかりません" body="存在しないか削除されたユーザーです。" />;

  const isMe = me.data?.id === userId;
  const common = myCommunities.data?.filter((c) => true) ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader
          title="Profile"
          actions={
            isMe ? (
              <Link to="/settings">
                <Button variant="secondary">プロフィール編集</Button>
              </Link>
            ) : (
              <div className="flex flex-wrap gap-2">
                <FriendButton userId={userId} />
                {profile.data.allow_dms && (
                  <Button onClick={() => startDm.mutate()} disabled={startDm.isPending}>
                    <MessageSquare className="mr-1 size-4" /> DMを送る
                  </Button>
                )}
                <ReportDialog
                  targetType="user"
                  targetId={userId}
                  link={`/u/${userId}`}
                  preview={profile.data.display_name}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="このユーザーを通報">
                      <Flag className="size-4" />
                    </Button>
                  }
                />
              </div>
            )
          }
        />

        <div className="overflow-hidden rounded-2xl border bg-card">
          <CosmeticBanner
            preset={cosmetic?.background}
            customImageUrl={cosmetic?.background_image}
            className="h-32 md:h-40"
          />
          <div className="relative px-6 pb-6">
            <div className="-mt-12 mb-4 flex items-end justify-between">
              <div className="rounded-full bg-card p-1.5 ring-4 ring-card">
                <UserAvatar
                  name={profile.data.display_name}
                  avatarUrl={profile.data.avatar_url}
                  size="xl"
                  showStatus={profile.data.show_online}
                  status={profile.data.status}
                  frame={cosmetic?.frame}
                  frameImage={cosmetic?.frame_image}
                />
              </div>
              <Badge variant="outline" className="text-xs">
                {STATUS_LABEL[profile.data.status] ?? profile.data.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{profile.data.display_name}</h2>
              <NameDecorations userId={userId} title={cosmetic?.title} />
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <AtSign className="size-3.5" />
              {profile.data.username}
            </p>

            {profile.data.custom_status && (
              <p className="mt-2 text-sm italic text-foreground/80">“{profile.data.custom_status}”</p>
            )}

            {profile.data.bio && <p className="mt-4 whitespace-pre-wrap text-sm">{profile.data.bio}</p>}

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {shortDate(profile.data.created_at)} に登録
              </span>
            </div>

            <UserBadgesSection userId={userId} />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            共通のコミュニティ ({common.length})
          </h3>
          {common.length === 0 ? (
            <p className="text-sm text-muted-foreground">共通のコミュニティはありません。</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {common.map((c) => (
                <Link
                  key={c.id}
                  to="/c/$communityId"
                  params={{ communityId: c.id }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
                >
                  <CommunityIcon id={c.id} name={c.name} iconUrl={c.icon_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.member_count} メンバー</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBadgesSection({ userId }: { userId: string }) {
  const badges = useQuery(userBadgesQuery(userId));
  if (!badges.data || badges.data.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-4">
      {badges.data.map((b) => (
        <UiBadge
          key={b.badge_id}
          variant="outline"
          className="gap-1 border-primary/40 bg-primary/10 text-xs"
          title={b.badge.description ?? undefined}
        >
          <span>{b.badge.icon}</span>
          <span>{b.badge.name}</span>
        </UiBadge>
      ))}
    </div>
  );
}

function FriendButton({ userId }: { userId: string }) {
  const { list, send, setStatus, remove } = useFriends();
  const friend = list.data?.find((f) => f.requester_id === userId || f.addressee_id === userId);

  if (!friend) {
    return (
      <Button onClick={() => send.mutate(userId)} disabled={send.isPending} size="sm">
        <UserPlus className="mr-1 size-4" /> フレンド申請
      </Button>
    );
  }

  if (friend.status === "accepted") {
    return (
      <Button variant="secondary" size="sm" onClick={() => remove.mutate(friend.id)}>
        <Check className="mr-1 size-4" /> フレンド
      </Button>
    );
  }

  if (friend.status === "pending") {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Clock className="mr-1 size-4" /> 申請中
      </Button>
    );
  }

  return null;
}
