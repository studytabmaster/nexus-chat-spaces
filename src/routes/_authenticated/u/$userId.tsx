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
      const { data: myDms, error: myError } = await supabase.from("dm_members").select("dm_id").eq("user_id", me.data!.id);
      if (myError) throw myError;
      const myIds = myDms.map((d) => d.dm_id);
      if (myIds.length) {
        const { data: common, error: commonError } = await supabase
          .from("dm_members")
          .select("dm_id")
          .eq("user_id", userId)
          .in("dm_id", myIds);
        if (commonError) throw commonError;
        if (common?.length && common[0]?.dm_id) return common[0].dm_id;
      }
      const { data: dm, error: createError } = await supabase.from("dms").insert({}).select("id").single();
      if (!dm?.id) throw new Error("DMの作成に失敗しました");
      if (createError) throw createError;
      const { error: memberError } = await supabase.from("dm_members").insert([
        { dm_id: dm.id, user_id: me.data!.id },
        { dm_id: dm.id, user_id: userId },
      ]);
      if (memberError) throw memberError;
      return dm.id;
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
            background={cosmetic?.background}
            backgroundImage={cosmetic?.background_image}
            className="h-24"
          />
          <div className={cn("flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start", cosmeticBg && "-mt-10")}>
            <UserAvatar
              name={profile.data.display_name}
              avatarUrl={profile.data.avatar_url}
              showStatus={profile.data.show_online}
              status={profile.data.status}
              size="xl"
              frame={cosmetic?.frame}
              frameImage={cosmetic?.frame_image}
            />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start">
                {profile.data.display_name}
                <NameDecorations title={cosmetic?.title} />
              </h1>
              <p className="flex items-center justify-center gap-2 text-muted-foreground sm:justify-start">
                <AtSign className="size-3.5" /> {profile.data.username}
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start">
                <Calendar className="size-3" /> 登録日 {shortDate(profile.data.created_at)}
              </p>
              <UserBadges userId={userId} />
              {profile.data.show_online && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {STATUS_LABEL[profile.data.status] ?? profile.data.status}
                  {profile.data.custom_status ? ` ・ ${profile.data.custom_status}` : ""}
                </p>
              )}
              {profile.data.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{profile.data.bio}</p>}
            </div>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">参加中のコミュニティ</h2>
          {common.length === 0 && <p className="text-sm text-muted-foreground">共通のコミュニティはありません</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {common.map((c) => (
              <Link
                key={c.id}
                to="/c/$communityId"
                params={{ communityId: c.id }}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
              >
                <CommunityIcon id={c.id} name={c.name} iconUrl={c.icon_url} className="size-10 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {c.role}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FriendButton({ userId }: { userId: string }) {
  const { relationWith, request, setStatus, remove } = useFriends();
  const rel = relationWith(userId);

  if (!rel)
    return (
      <Button variant="secondary" onClick={() => request.mutate(userId)} disabled={request.isPending}>
        <UserPlus className="mr-1 size-4" /> フレンド申請を送る
      </Button>
    );
  if (rel.status === "accepted")
    return (
      <Button variant="secondary" onClick={() => remove.mutate(rel.id)}>
        <Check className="mr-1 size-4" /> フレンド
      </Button>
    );
  if (rel.status === "blocked")
    return (
      <Button variant="secondary" onClick={() => setStatus.mutate({ id: rel.id, status: "accepted" })}>
        ブロック解除
      </Button>
    );
  const incoming = rel.addressee_id !== rel.requester_id && rel.requester_id === userId;
  return incoming ? (
    <Button onClick={() => setStatus.mutate({ id: rel.id, status: "accepted" })}>
      <Check className="mr-1 size-4" /> 申請を承認
    </Button>
  ) : (
    <Button variant="secondary" disabled>
      <Clock className="mr-1 size-4" /> 申請中
    </Button>
  );
}

function UserBadges({ userId }: { userId: string }) {
  const badges = useQuery(userBadgesQuery(userId));
  if (!badges.data?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {badges.data.map((b) => (
        <UiBadge key={b.id} variant="secondary" className="rounded-md font-normal" title={b.description}>
          {b.name}
        </UiBadge>
      ))}
    </div>
  );
}
