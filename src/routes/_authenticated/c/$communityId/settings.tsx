import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Check, X, UserPlus, Shield, Hash, Copy, Link2, Sparkles, Smile, Ban, Flag, ScrollText, ImageIcon, AlertTriangle, Crown, LogOut, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { communityQuery, channelsQuery, membersQuery } from "@/lib/queries";
import { useMembership } from "@/components/app/JoinButton";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { CATEGORIES } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import { welcomeQuery, invitesQuery, emojisQuery, inviteCode, inviteUrl } from "@/lib/community-extras";
import { EmojiImage } from "@/components/app/CustomEmoji";
import { uploadFile } from "@/lib/storage";
import { useMe } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { MemberManagePanel } from "@/components/app/MemberManagePanel";
import {
  bansQuery,
  auditLogsQuery,
  reportsQuery,
  moderateMember,
  setReportStatus,
  MOD_ACTION_LABEL,
  REPORT_REASONS,
  transferOwnership,
  deleteCommunity,
} from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/c/$communityId/settings")({
  head: () => ({
    meta: [
      { title: "Community Settings — Nexa" },
      { name: "description", content: "コミュニティの設定と管理。" },
      { property: "og:title", content: "Community Settings — Nexa" },
      { property: "og:description", content: "コミュニティの設定と管理。" },
    ],
  }),
  component: CommunitySettingsPage,
});

function CommunitySettingsPage() {
  const { communityId } = Route.useParams();
  const membership = useMembership(communityId);
  const role = membership.data?.role;
  const canManage = role === "owner" || role === "admin";

  if (membership.isLoading) return <LoadingState />;
  if (!canManage) {
    return (
      <div className="p-8">
        <EmptyState icon={Shield} title="権限がありません" body="コミュニティの設定は owner / admin のみ変更できます。" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <PageHeader title="Community Settings" subtitle="コミュニティの管理" />
        <Tabs defaultValue="general">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="general">基本設定</TabsTrigger>
            <TabsTrigger value="channels">チャンネル</TabsTrigger>
            <TabsTrigger value="requests">参加申請</TabsTrigger>
            <TabsTrigger value="members">メンバー</TabsTrigger>
            <TabsTrigger value="welcome">ウェルカム</TabsTrigger>
            <TabsTrigger value="invites">招待リンク</TabsTrigger>
            <TabsTrigger value="emojis">絵文字</TabsTrigger>
            <TabsTrigger value="reports">通報</TabsTrigger>
            <TabsTrigger value="bans">BANユーザー</TabsTrigger>
            <TabsTrigger value="audit">監査ログ</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <GeneralSettings communityId={communityId} myRole={role} />
          </TabsContent>
          <TabsContent value="channels">
            <ChannelManager communityId={communityId} />
          </TabsContent>
          <TabsContent value="requests">
            <JoinRequests communityId={communityId} />
          </TabsContent>
          <TabsContent value="members">
            <MemberManager communityId={communityId} myRole={role as "owner" | "admin"} />
          </TabsContent>
          <TabsContent value="welcome">
            <WelcomeSettings communityId={communityId} />
          </TabsContent>
          <TabsContent value="invites">
            <InviteManager communityId={communityId} />
          </TabsContent>
          <TabsContent value="emojis">
            <EmojiManager communityId={communityId} />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsManager communityId={communityId} />
          </TabsContent>
          <TabsContent value="bans">
            <BanManager communityId={communityId} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditLog communityId={communityId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function GeneralSettings({ communityId, myRole }: { communityId: string; myRole: "owner" | "admin" | "moderator" | "member" | undefined }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const community = useQuery(communityQuery(communityId));
  const members = useQuery(membersQuery(communityId));
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [transferTarget, setTransferTarget] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    category: string;
    visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
    join_policy: "open" | "request";
    tags: string;
  }>({
    name: community.data?.name ?? "",
    description: community.data?.description ?? "",
    category: community.data?.category ?? CATEGORIES[1],
    visibility: community.data?.visibility ?? "PUBLIC",
    join_policy: community.data?.join_policy ?? "open",
    tags: (community.data?.tags ?? []).join(", "),
  });

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("communities")
        .update({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          visibility: form.visibility,
          join_policy: form.join_policy,
        })
        .eq("id", communityId);
      if (error) throw error;

      const tags = Array.from(
        new Set(
          form.tags
            .split(/[,、\s]+/)
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean),
        ),
      );
      const { error: delError } = await supabase.from("community_tags").delete().eq("community_id", communityId);
      if (delError) throw delError;
      if (tags.length) {
        const { error: insError } = await supabase
          .from("community_tags")
          .insert(tags.map((tag) => ({ community_id: communityId, tag })));
        if (insError) throw insError;
      }

      await supabase.from("audit_logs").insert({
        community_id: communityId,
        actor_id: me.data?.id ?? null,
        action: "community_settings",
        target: communityId,
        detail: "基本設定を変更",
      });
    },
    onSuccess: () => {
      toast.success("変更を保存しました");
      qc.invalidateQueries({ queryKey: ["community", communityId] });
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["audit-logs", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadImage = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: "icon_url" | "banner_url" }) => {
      const path = await uploadFile(me.data!.id, file);
      const patch = kind === "icon_url" ? { icon_url: path } : { banner_url: path };
      const { error } = await supabase.from("communities").update(patch).eq("id", communityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("画像を更新しました");
      qc.invalidateQueries({ queryKey: ["community", communityId] });
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: (newOwner: string) => transferOwnership(communityId, newOwner),
    onSuccess: () => {
      toast.success("オーナーを移譲しました");
      setTransferOpen(false);
      setTransferTarget(null);
      qc.invalidateQueries({ queryKey: ["community", communityId] });
      qc.invalidateQueries({ queryKey: ["members", communityId] });
      qc.invalidateQueries({ queryKey: ["audit-logs", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteCommunity(communityId),
    onSuccess: () => {
      toast.success("コミュニティを削除しました");
      qc.invalidateQueries({ queryKey: ["communities"] });
      navigate({ to: "/home" });
    },
    onError: (e) => toast.error(e.message),
  });

  if (community.isLoading) return <LoadingState />;
  if (community.isError) return <ErrorState message={community.error.message} onRetry={() => community.refetch()} />;
  if (!community.data) return <EmptyState icon={Settings} title="コミュニティが見つかりません" />;

  const isOwner = myRole === "owner";
  const transferCandidates = members.data?.filter((m) => m.user_id !== me.data?.id && m.role !== "owner") ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <CommunityIcon id={community.data.id} name={community.data.name} iconUrl={community.data.icon_url} className="size-16 text-xl" />
          <div>
            <p className="font-semibold">{community.data.name}</p>
            <p className="text-sm text-muted-foreground">{community.data.member_count} メンバー</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="size-4" /> アイコン
            </Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploadImage.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage.mutate({ file: f, kind: "icon_url" });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="size-4" /> バナー
            </Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploadImage.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage.mutate({ file: f, kind: "banner_url" });
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>名前</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>説明</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>タグ（カンマ区切り）</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ゲーム, 雑談, 初心者歓迎" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>カテゴリー</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c !== "すべて").map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>公開範囲</Label>
            <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as "PUBLIC" | "UNLISTED" | "PRIVATE" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">公開（検索に表示）</SelectItem>
                <SelectItem value="UNLISTED">限定公開（検索に非表示）</SelectItem>
                <SelectItem value="PRIVATE">非公開（メンバーのみ）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>参加方法</Label>
            <Select value={form.join_policy} onValueChange={(v) => setForm({ ...form, join_policy: v as "open" | "request" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">誰でも参加できる</SelectItem>
                <SelectItem value="request">参加申請制</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => update.mutate()} disabled={update.isPending}>
          保存
        </Button>
      </div>

      {isOwner && (
        <div className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <h3 className="font-semibold">危険な操作</h3>
          </div>
          <p className="text-sm text-muted-foreground">これらの操作は取り消せません。慎重に行ってください。</p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-4">
            <div>
              <p className="font-medium">オーナーを移譲</p>
              <p className="text-sm text-muted-foreground">別のメンバーにオーナー権限を渡します。あなたは管理者になります。</p>
            </div>
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <Crown className="mr-1.5 size-4" /> オーナーを移譲
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>オーナーを移譲するメンバーを選択</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {transferCandidates.length === 0 && (
                    <EmptyState icon={UserPlus} title="移譲できるメンバーがいません" body="オーナー以外のメンバーが必要です。" />
                  )}
                  {transferCandidates.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => setTransferTarget(m.user_id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                        transferTarget === m.user_id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={m.profile.display_name} avatarUrl={m.profile.avatar_url} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{m.profile.display_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">@{m.profile.username}</span>
                        </span>
                      </span>
                      {transferTarget === m.user_id && <Check className="size-4 text-primary" />}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => { setTransferOpen(false); setTransferTarget(null); }}>
                    キャンセル
                  </Button>
                  <Button
                    variant="default"
                    disabled={!transferTarget || transfer.isPending}
                    onClick={() => transferTarget && transfer.mutate(transferTarget)}
                  >
                    移譲する
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-destructive/30 p-4">
            <div>
              <p className="font-medium text-destructive">コミュニティを削除</p>
              <p className="text-sm text-muted-foreground">すべてのデータ（チャンネル、メッセージ、メンバー、イベントなど）が完全に削除されます。</p>
            </div>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash className="mr-1.5 size-4" /> 削除
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-destructive">コミュニティを削除しますか？</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    この操作は取り消せません。すべてのチャンネル、メッセージ、メンバー、イベントが削除されます。
                  </p>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    確認のため「<span className="font-semibold">{community.data.name}</span>」と入力してください。
                  </div>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={community.data.name}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}>
                      キャンセル
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={deleteConfirm !== community.data.name || remove.isPending}
                      onClick={() => remove.mutate()}
                    >
                      削除する
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelManager({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const channels = useQuery(channelsQuery(communityId));
  const [newChan, setNewChan] = useState("");
  const [newType, setNewType] = useState<ChannelType>("text");
  const [newCatId, setNewCatId] = useState<string>("none");
  const [newCat, setNewCat] = useState("");
  const [editing, setEditing] = useState<Channel | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["channels", communityId] });

  const createChannel = useMutation({
    mutationFn: async () => {
      const pos = (channels.data?.channels.length ?? 0) + 1;
      const { error } = await supabase.from("channels").insert({
        community_id: communityId,
        name: newChan.trim(),
        type: newType,
        category_id: newCatId === "none" ? null : newCatId,
        position: pos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("チャンネルを作成しました");
      setNewChan("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const pos = (channels.data?.categories.length ?? 0) + 1;
      const { error } = await supabase.from("categories").insert({ community_id: communityId, name: newCat.trim(), position: pos });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("カテゴリーを作成しました");
      setNewCat("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateChannel = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Channel, "name" | "topic" | "type" | "category_id" | "locked" | "archived">> }) => {
      const { error } = await supabase.from("channels").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("チャンネルを更新しました");
      setEditing(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  if (channels.isLoading) return <LoadingState />;
  if (channels.isError) return <ErrorState message={channels.error.message} onRetry={() => channels.refetch()} />;

  const cats = channels.data?.categories ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="mb-3 font-semibold">新しいチャンネル</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <Input value={newChan} onChange={(e) => setNewChan(e.target.value)} placeholder="チャンネル名" />
          <Select value={newType} onValueChange={(v) => setNewType(v as ChannelType)}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newCatId} onValueChange={setNewCatId}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="カテゴリーなし" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">カテゴリーなし</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => createChannel.mutate()} disabled={!newChan.trim() || createChannel.isPending}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h3 className="mb-3 font-semibold">新しいカテゴリー</h3>
        <div className="flex gap-2">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="カテゴリー名" />
          <Button onClick={() => createCategory.mutate()} disabled={!newCat.trim() || createCategory.isPending}>
            <Plus className="size-4" />
          </Button>
        </div>
        {cats.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {cats.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
                {c.name}
                <button onClick={() => removeCategory.mutate(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="カテゴリーを削除">
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {channels.data?.channels.map((ch) => {
          const meta = channelTypeMeta(ch.type);
          const Icon = meta.icon;
          return (
            <div key={ch.id} className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{ch.name}</span>
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{meta.label}</span>
                {ch.locked && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="size-3" /> 閲覧のみ
                  </span>
                )}
                {ch.archived && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Archive className="size-3" /> アーカイブ
                  </span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    ロック
                    <Switch checked={ch.locked} onCheckedChange={(v) => updateChannel.mutate({ id: ch.id, patch: { locked: v } })} />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    アーカイブ
                    <Switch checked={ch.archived} onCheckedChange={(v) => updateChannel.mutate({ id: ch.id, patch: { archived: v } })} />
                  </label>
                  <button onClick={() => setEditing(ch)} className="text-muted-foreground hover:text-foreground" aria-label="編集">
                    <Settings className="size-4" />
                  </button>
                  <button onClick={() => removeChannel.mutate(ch.id)} className="text-muted-foreground hover:text-destructive" aria-label="削除">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {ch.topic && <p className="mt-1 truncate text-xs text-muted-foreground">{ch.topic}</p>}
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>チャンネルを編集</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>チャンネル名</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>説明（トピック）</Label>
                <Textarea value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} rows={2} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>種別</Label>
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>カテゴリー</Label>
                  <Select
                    value={editing.category_id ?? "none"}
                    onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">カテゴリーなし</SelectItem>
                      {cats.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!editing.name.trim() || updateChannel.isPending}
                onClick={() =>
                  updateChannel.mutate({
                    id: editing.id,
                    patch: {
                      name: editing.name.trim(),
                      topic: editing.topic,
                      type: editing.type,
                      category_id: editing.category_id,
                    },
                  })
                }
              >
                保存
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JoinRequests({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: ["join-requests", communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("join_requests")
        .select("*, profile:profiles(*)")
        .eq("community_id", communityId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.from("join_requests").update({ status: approve ? "APPROVED" : "REJECTED" }).eq("id", id);
      if (error) throw error;
      if (approve) {
        const req = requests.data?.find((r) => r.id === id);
        if (req) {
          const { error: addError } = await supabase
            .from("community_members")
            .insert({ community_id: communityId, user_id: req.user_id, role: "member" });
          if (addError) throw addError;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests", communityId] });
      qc.invalidateQueries({ queryKey: ["members", communityId] });
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (requests.isLoading) return <LoadingState />;
  if (requests.isError) return <ErrorState message={requests.error.message} onRetry={() => requests.refetch()} />;

  return (
    <div className="space-y-2">
      {requests.data?.length === 0 && (
        <EmptyState icon={UserPlus} title="参加申請はありません" body="新しい申請が届くとここに表示されます。" />
      )}
      {requests.data?.map((r) => (
        <div key={r.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <UserAvatar name={r.profile.display_name} avatarUrl={r.profile.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.profile.display_name}</p>
              <p className="text-sm text-muted-foreground">{r.message || "メッセージはありません"}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => decide.mutate({ id: r.id, approve: false })}>
              <X className="mr-1 size-3.5" /> 拒否
            </Button>
            <Button size="sm" onClick={() => decide.mutate({ id: r.id, approve: true })}>
              <Check className="mr-1 size-3.5" /> 承認
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const ROLE_JA: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

function MemberManager({ communityId, myRole }: { communityId: string; myRole: "owner" | "admin" }) {
  const members = useQuery(membersQuery(communityId));
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  if (members.isLoading) return <LoadingState />;
  if (members.isError) return <ErrorState message={members.error.message} onRetry={() => members.refetch()} />;

  const list = (members.data ?? []).filter(
    (m) =>
      !q.trim() ||
      m.profile.display_name.toLowerCase().includes(q.toLowerCase()) ||
      m.profile.username.toLowerCase().includes(q.toLowerCase()),
  );
  const selected = list.find((m) => m.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="メンバーを検索" />
      <div className="space-y-2">
        {list.map((m) => {
          const muted =
            (m as { muted_until?: string | null }).muted_until &&
            new Date((m as { muted_until?: string | null }).muted_until!) > new Date();
          return (
            <button
              key={m.id}
              onClick={() => setOpenId(m.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-3 text-left hover:bg-surface-hover"
            >
              <span className="flex min-w-0 items-center gap-3">
                <UserAvatar name={m.profile.display_name} avatarUrl={m.profile.avatar_url} status={m.profile.status} showStatus />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.profile.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{m.profile.username} ・ {shortDate(m.joined_at)} 参加
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                <span className="block">{ROLE_JA[m.role] ?? m.role}</span>
                {muted && <span className="block text-destructive">タイムアウト中</span>}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>メンバー管理</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <MemberManagePanel communityId={communityId} member={selected} myRole={myRole} />
              <Link
                to="/u/$userId"
                params={{ userId: selected.user_id }}
                className="text-sm text-primary hover:underline"
                onClick={() => setOpenId(null)}
              >
                プロフィールを見る
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WelcomeSettings({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const welcome = useQuery(welcomeQuery(communityId));
  const [form, setForm] = useState<{ enabled: boolean; title: string; body: string; rules: string } | null>(null);
  const value =
    form ?? {
      enabled: welcome.data?.enabled ?? true,
      title: welcome.data?.title ?? "",
      body: welcome.data?.body ?? "",
      rules: (welcome.data?.rules ?? []).join("\n"),
    };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_welcome").upsert(
        {
          community_id: communityId,
          enabled: value.enabled,
          title: value.title.trim(),
          body: value.body.trim(),
          rules: value.rules
            .split("\n")
            .map((r) => r.trim())
            .filter(Boolean),
        },
        { onConflict: "community_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ウェルカム画面を保存しました");
      qc.invalidateQueries({ queryKey: ["welcome", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (welcome.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-primary" /> ウェルカム画面を表示
          </p>
          <p className="text-sm text-muted-foreground">初めてコミュニティを開いたメンバーに表示されます。</p>
        </div>
        <Switch checked={value.enabled} onCheckedChange={(v) => setForm({ ...value, enabled: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>見出し</Label>
        <Input value={value.title} onChange={(e) => setForm({ ...value, title: e.target.value })} placeholder="ようこそ！" />
      </div>
      <div className="space-y-1.5">
        <Label>案内文</Label>
        <Textarea value={value.body} onChange={(e) => setForm({ ...value, body: e.target.value })} rows={4} />
      </div>
      <div className="space-y-1.5">
        <Label>ルール（1行に1つ）</Label>
        <Textarea value={value.rules} onChange={(e) => setForm({ ...value, rules: e.target.value })} rows={4} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        保存
      </Button>
    </div>
  );
}

function InviteManager({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const me = useMe();
  const invites = useQuery(invitesQuery(communityId));
  const [maxUses, setMaxUses] = useState("");
  const [days, setDays] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const expires = days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null;
      const { error } = await supabase.from("invites").insert({
        community_id: communityId,
        code: inviteCode(),
        created_by: me.data!.id,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expires,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("招待リンクを作成しました");
      setMaxUses("");
      setDays("");
      qc.invalidateQueries({ queryKey: ["invites", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").update({ revoked: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites", communityId] }),
    onError: (e) => toast.error(e.message),
  });

  if (invites.isLoading) return <LoadingState />;
  if (invites.isError) return <ErrorState message={invites.error.message} onRetry={() => invites.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="mb-3 font-semibold">新しい招待リンク</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>使用回数の上限（空欄=無制限）</Label>
            <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="無制限" />
          </div>
          <div className="space-y-1.5">
            <Label>有効期限（日数・空欄=無期限）</Label>
            <Input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="無期限" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
              <Plus className="mr-1 size-4" /> 作成
            </Button>
          </div>
        </div>
      </div>
      {invites.data?.length === 0 && <EmptyState icon={Link2} title="招待リンクはありません" body="リンクを作ってメンバーを招待しましょう。" />}
      <div className="space-y-2">
        {invites.data?.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
            <code className="rounded bg-muted px-2 py-1 text-sm">{inviteUrl(i.code)}</code>
            <span className="text-xs text-muted-foreground">
              {i.uses} 回使用{i.max_uses ? ` / 上限 ${i.max_uses}` : ""}
              {i.expires_at ? ` ・ ${shortDate(i.expires_at)} まで` : ""}
              {i.revoked ? " ・ 無効" : ""}
            </span>
            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl(i.code));
                  toast.success("リンクをコピーしました");
                }}
              >
                <Copy className="mr-1 size-3.5" /> コピー
              </Button>
              {!i.revoked && (
                <Button size="sm" variant="ghost" onClick={() => revoke.mutate(i.id)}>
                  無効化
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmojiManager({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const me = useMe();
  const emojis = useQuery(emojisQuery(communityId));
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("画像を選択してください");
      const path = await uploadFile(me.data!.id, file);
      const { error } = await supabase.from("custom_emojis").insert({
        community_id: communityId,
        name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        image_url: path,
        created_by: me.data!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("絵文字を追加しました");
      setName("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["custom-emojis", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_emojis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-emojis", communityId] }),
    onError: (e) => toast.error(e.message),
  });

  if (emojis.isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="mb-3 font-semibold">カスタム絵文字を追加</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>名前（半角英数字）</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="party" />
          </div>
          <div className="space-y-1.5">
            <Label>画像</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => add.mutate()} disabled={!name.trim() || !file || add.isPending}>
              <Plus className="mr-1 size-4" /> 追加
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">チャットで :名前: と入力すると絵文字として表示されます。</p>
      </div>
      {emojis.data?.length === 0 ? (
        <EmptyState icon={Smile} title="カスタム絵文字はありません" body="コミュニティ独自の絵文字を追加できます。" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {emojis.data?.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <EmojiImage emoji={e} className="size-6" />
              <span className="text-sm">:{e.name}:</span>
              <button onClick={() => remove.mutate(e.id)} className="text-muted-foreground hover:text-destructive" aria-label="削除">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsManager({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const reports = useQuery(reportsQuery(communityId));

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "RESOLVED" | "DISMISSED" }) => setReportStatus(id, status),
    onSuccess: () => {
      toast.success("変更を保存しました");
      qc.invalidateQueries({ queryKey: ["reports", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (reports.isLoading) return <LoadingState />;
  if (reports.isError) return <ErrorState message={reports.error.message} onRetry={() => reports.refetch()} />;
  if (!reports.data?.length)
    return <EmptyState icon={Flag} title="通報はありません" body="新しい通報が届くとここに表示されます。" />;

  const label = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;
  const targetLabel: Record<string, string> = { message: "メッセージ", user: "ユーザー", community: "コミュニティ" };

  return (
    <div className="space-y-2">
      {reports.data.map((r) => (
        <div key={r.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{targetLabel[r.target_type] ?? r.target_type}</span>
            <span className="font-medium">{label(r.reason)}</span>
            <span className="text-xs text-muted-foreground">{shortDate(r.created_at)}</span>
            {r.status !== "OPEN" && (
              <span className="text-xs text-muted-foreground">
                {r.status === "RESOLVED" ? "対応済み" : "却下"}
              </span>
            )}
          </div>
          {r.preview && <p className="mt-2 line-clamp-3 rounded-lg bg-muted/50 p-2 text-sm">{r.preview}</p>}
          {r.detail && <p className="mt-2 text-sm text-muted-foreground">{r.detail}</p>}
          <p className="mt-2 text-xs text-muted-foreground">通報者：{r.reporter?.display_name ?? "不明"}</p>
          {r.status === "OPEN" && (
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => decide.mutate({ id: r.id, status: "DISMISSED" })}>
                <X className="mr-1 size-3.5" /> 却下
              </Button>
              <Button size="sm" onClick={() => decide.mutate({ id: r.id, status: "RESOLVED" })}>
                <Check className="mr-1 size-3.5" /> 対応済みにする
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BanManager({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const bans = useQuery(bansQuery(communityId));

  const unban = useMutation({
    mutationFn: (userId: string) => moderateMember({ communityId, userId, action: "unban" }),
    onSuccess: () => {
      toast.success("BANを解除しました");
      qc.invalidateQueries({ queryKey: ["bans", communityId] });
      qc.invalidateQueries({ queryKey: ["audit-logs", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (bans.isLoading) return <LoadingState />;
  if (bans.isError) return <ErrorState message={bans.error.message} onRetry={() => bans.refetch()} />;
  if (!bans.data?.length) return <EmptyState icon={Ban} title="BANされたユーザーはいません" body="BANすると再参加できなくなります。" />;

  return (
    <div className="space-y-2">
      {bans.data.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
          <span className="flex min-w-0 items-center gap-3">
            <UserAvatar name={b.profile?.display_name ?? "?"} avatarUrl={b.profile?.avatar_url ?? null} />
            <span className="min-w-0">
              <span className="block truncate font-medium">{b.profile?.display_name ?? "不明なユーザー"}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {shortDate(b.created_at)}
                {b.reason ? ` ・ ${b.reason}` : ""}
              </span>
            </span>
          </span>
          <Button size="sm" variant="secondary" onClick={() => unban.mutate(b.user_id)} disabled={unban.isPending}>
            BAN解除
          </Button>
        </div>
      ))}
    </div>
  );
}

function AuditLog({ communityId }: { communityId: string }) {
  const logs = useQuery(auditLogsQuery(communityId));

  if (logs.isLoading) return <LoadingState />;
  if (logs.isError) return <ErrorState message={logs.error.message} onRetry={() => logs.refetch()} />;
  if (!logs.data?.length) return <EmptyState icon={ScrollText} title="監査ログはありません" body="管理操作を行うとここに記録されます。" />;

  return (
    <div className="space-y-2">
      {logs.data.map((l) => (
        <div key={l.id} className="rounded-xl border bg-card p-3 text-sm">
          <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ja-JP")}</p>
          <p className="mt-0.5">
            <span className="font-medium">{l.actor?.display_name ?? "不明"}</span>
            {" が "}
            {MOD_ACTION_LABEL[l.action] ?? l.action}
            {l.detail ? ` を実行（${l.detail}）` : " を実行"}
          </p>
        </div>
      ))}
    </div>
  );
}
