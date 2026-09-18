import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Hash, Users, Paperclip, AtSign, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { publicCommunitiesQuery, type CommunityCardData, type Profile } from "@/lib/queries";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { chatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "検索 — Nexa" },
      { name: "description", content: "コミュニティ・ユーザー・メッセージ・投稿を条件を絞って検索。" },
      { property: "og:title", content: "検索 — Nexa" },
      { property: "og:description", content: "キーワード、ユーザー、チャンネル、日付、添付で絞り込み検索。" },
    ],
  }),
  component: SearchPage,
});

function useProfileSearch(q: string) {
  return useQuery({
    queryKey: ["profile-search", q],
    enabled: q.length >= 1,
    queryFn: async () => {
      // 公開してよい項目のみを返す検索を利用する
      const { data, error } = await supabase.rpc("search_profiles", { _q: q, _limit: 20 });
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
  });
}

type MessageFilters = {
  q: string;
  user: string;
  channel: string;
  from: string;
  to: string;
  hasAttachment: boolean;
  mentionsMe: boolean;
};

type MessageHit = {
  id: string;
  content: string;
  created_at: string;
  community_id: string;
  channel_id: string;
  attachment_url: string | null;
  author: Profile | null;
  channel: { name: string } | null;
};

function useMessageSearch(f: MessageFilters, meUsername: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["message-search", f, meUsername],
    enabled,
    queryFn: async (): Promise<MessageHit[]> => {
      let query = supabase
        .from("messages")
        .select("id, content, created_at, community_id, channel_id, attachment_url, author:profiles!messages_user_id_fkey(*), channel:channels(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (f.q.trim()) query = query.ilike("content", `%${f.q.trim()}%`);
      if (f.mentionsMe && meUsername) query = query.ilike("content", `%@${meUsername}%`);
      if (f.hasAttachment) query = query.not("attachment_url", "is", null);
      if (f.from) query = query.gte("created_at", new Date(f.from).toISOString());
      if (f.to) query = query.lte("created_at", new Date(`${f.to}T23:59:59`).toISOString());
      const { data, error } = await query;
      if (error) throw error;
      let hits = data as unknown as MessageHit[];
      if (f.user.trim()) {
        const u = f.user.trim().replace(/^@/, "").toLowerCase();
        hits = hits.filter(
          (h) => h.author?.username.toLowerCase().includes(u) || h.author?.display_name.toLowerCase().includes(u),
        );
      }
      if (f.channel.trim()) {
        const c = f.channel.trim().replace(/^#/, "").toLowerCase();
        hits = hits.filter((h) => h.channel?.name.toLowerCase().includes(c));
      }
      return hits;
    },
  });
}

function usePostSearch(q: string) {
  return useQuery({
    queryKey: ["post-search", q],
    enabled: q.trim().length >= 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, content, community_id, created_at, author:profiles!posts_user_id_fkey(*)")
        .or(`title.ilike.%${q.trim()}%,content.ilike.%${q.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as {
        id: string;
        title: string;
        content: string;
        community_id: string;
        created_at: string;
        author: Profile | null;
      }[];
    },
  });
}

function SearchPage() {
  const me = useMe();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Omit<MessageFilters, "q">>({
    user: "",
    channel: "",
    from: "",
    to: "",
    hasAttachment: false,
    mentionsMe: false,
  });
  const communities = useQuery(publicCommunitiesQuery);
  const profiles = useProfileSearch(q);
  const messageFilters: MessageFilters = { q, ...filters };
  const hasMessageCriteria =
    !!q.trim() || !!filters.user || !!filters.channel || !!filters.from || !!filters.to || filters.hasAttachment || filters.mentionsMe;
  const messages = useMessageSearch(messageFilters, me.data?.username, hasMessageCriteria);
  const posts = usePostSearch(q);

  const filteredCommunities = useMemo(() => {
    if (!communities.data) return [];
    if (!q.trim()) return communities.data;
    const term = q.toLowerCase();
    return communities.data.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term) ||
        c.tags.some((t) => t.toLowerCase().includes(term)),
    );
  }, [communities.data, q]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <PageHeader title="検索" subtitle="コミュニティ・ユーザー・メッセージ・投稿を探す" />
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="キーワード、名前、カテゴリー、タグで検索"
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="communities">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="communities">コミュニティ</TabsTrigger>
            <TabsTrigger value="users">ユーザー</TabsTrigger>
            <TabsTrigger value="messages">メッセージ</TabsTrigger>
            <TabsTrigger value="posts">投稿</TabsTrigger>
          </TabsList>

          <TabsContent value="communities">
            {communities.isLoading && <LoadingState />}
            {communities.isError && <ErrorState message={communities.error.message} onRetry={() => communities.refetch()} />}
            {communities.data && filteredCommunities.length === 0 && (
              <EmptyState icon={Hash} title="該当するコミュニティがありません" body="別のキーワードで試してください。" />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCommunities.map((c) => (
                <CommunityResult key={c.id} community={c} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users">
            {q.length === 0 && <EmptyState icon={Search} title="ユーザーを検索" body="名前またはユーザー名を入力してください。" />}
            {profiles.isLoading && <LoadingState />}
            {profiles.isError && <ErrorState message={profiles.error.message} onRetry={() => profiles.refetch()} />}
            {profiles.data && profiles.data.length === 0 && (
              <EmptyState icon={Search} title="ユーザーが見つかりません" body="別の名前で試してください。" />
            )}
            <div className="grid gap-2">
              {profiles.data?.map((p) => (
                <Link
                  key={p.id}
                  to="/u/$userId"
                  params={{ userId: p.id }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
                >
                  <UserAvatar name={p.display_name} avatarUrl={p.avatar_url} showStatus={p.show_online} status={p.status} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{p.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <div className="mb-4 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>ユーザー</Label>
                <Input
                  value={filters.user}
                  onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                  placeholder="@ユーザー名 または 表示名"
                />
              </div>
              <div className="space-y-1.5">
                <Label>チャンネル</Label>
                <Input
                  value={filters.channel}
                  onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
                  placeholder="#チャンネル名"
                />
              </div>
              <div className="space-y-1.5">
                <Label>開始日</Label>
                <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>終了日</Label>
                <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <span className="flex items-center gap-2 text-sm">
                  <Paperclip className="size-4" /> 添付ファイルあり
                </span>
                <Switch
                  checked={filters.hasAttachment}
                  onCheckedChange={(v) => setFilters({ ...filters, hasAttachment: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <span className="flex items-center gap-2 text-sm">
                  <AtSign className="size-4" /> 自分へのメンション
                </span>
                <Switch checked={filters.mentionsMe} onCheckedChange={(v) => setFilters({ ...filters, mentionsMe: v })} />
              </div>
            </div>

            {!hasMessageCriteria && (
              <EmptyState icon={Search} title="メッセージを検索" body="キーワードまたは条件を指定してください。" />
            )}
            {messages.isLoading && hasMessageCriteria && <LoadingState />}
            {messages.isError && <ErrorState message={messages.error.message} onRetry={() => messages.refetch()} />}
            {messages.data && messages.data.length === 0 && (
              <EmptyState icon={Search} title="メッセージが見つかりません" body="条件を変えて試してください。" />
            )}
            <div className="grid gap-2">
              {messages.data?.map((m) => (
                <Link
                  key={m.id}
                  to="/c/$communityId/ch/$channelId"
                  params={{ communityId: m.community_id, channelId: m.channel_id }}
                  className="flex items-start gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
                >
                  <UserAvatar name={m.author?.display_name ?? ""} avatarUrl={m.author?.avatar_url ?? null} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {m.author?.display_name} ・ #{m.channel?.name} ・ {chatTime(m.created_at)}
                      {m.attachment_url ? " ・ 添付あり" : ""}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm">{m.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="posts">
            {q.trim().length === 0 && <EmptyState icon={FileText} title="投稿を検索" body="キーワードを入力してください。" />}
            {posts.isLoading && <LoadingState />}
            {posts.isError && <ErrorState message={posts.error.message} onRetry={() => posts.refetch()} />}
            {posts.data && posts.data.length === 0 && (
              <EmptyState icon={FileText} title="投稿が見つかりません" body="別のキーワードで試してください。" />
            )}
            <div className="grid gap-2">
              {posts.data?.map((p) => (
                <Link
                  key={p.id}
                  to="/c/$communityId/posts"
                  params={{ communityId: p.community_id }}
                  className="rounded-xl border bg-card p-3 hover:bg-surface-hover"
                >
                  <p className="font-semibold">{p.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.author?.display_name} ・ {chatTime(p.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CommunityResult({ community }: { community: CommunityCardData }) {
  return (
    <Link
      to="/c/$communityId"
      params={{ communityId: community.id }}
      className="flex items-start gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
    >
      <CommunityIcon id={community.id} name={community.name} iconUrl={community.icon_url} className="size-12 text-lg" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{community.name}</p>
        <p className="line-clamp-1 text-sm text-muted-foreground">{community.description}</p>
        <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" /> {community.member_count}
          </span>
          <span>{community.category}</span>
        </p>
      </div>
    </Link>
  );
}
