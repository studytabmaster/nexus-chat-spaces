import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, MessageSquare, CheckSquare, FileText, Users, ArrowRight, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { myCommunitiesQuery, notificationsQuery, dmListQuery } from "@/lib/queries";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Nexa" },
      { name: "description", content: "参加中のコミュニティ、未読、タスク、最近の投稿をひと目で。" },
      { property: "og:title", content: "Home — Nexa" },
      { property: "og:description", content: "あなたのコミュニティダッシュボード。" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const me = useMe();
  const uid = me.data!.id;
  const mine = useQuery(myCommunitiesQuery(uid));
  const notifs = useQuery(notificationsQuery(uid));
  const dms = useQuery(dmListQuery(uid));
  const ids = mine.data?.map((c) => c.id) ?? [];

  const tasks = useQuery({
    queryKey: ["my-tasks", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, community:communities(name)")
        .eq("assigned_to", uid)
        .neq("status", "DONE")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const posts = useQuery({
    queryKey: ["recent-posts", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, author:profiles!posts_user_id_fkey(display_name, avatar_url), community:communities(name)")
        .in("community_id", ids)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const online = useQuery({
    queryKey: ["online-members", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("user_id, profile:profiles(*)")
        .in("community_id", ids)
        .neq("user_id", uid)
        .limit(60);
      if (error) throw error;
      const seen = new Set<string>();
      return data
        .map((r) => r.profile)
        .filter((p) => p && p.show_online && p.status !== "offline" && !seen.has(p.id) && seen.add(p.id))
        .slice(0, 8);
    },
  });

  const unreadNotifs = notifs.data?.filter((n) => !n.read) ?? [];
  const unreadDms = dms.data?.filter((d) => d.unread > 0) ?? [];

  if (mine.isLoading) return <LoadingState />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <PageHeader
          title={`こんにちは、${me.data!.display_name}`}
          subtitle="今日のコミュニティの動きをチェックしましょう。"
          actions={
            <Button asChild variant="secondary">
              <Link to="/discover">
                <Compass className="size-4" /> コミュニティを探す
              </Link>
            </Button>
          }
        />

        {mine.data?.length === 0 && (
          <div className="mb-8">
            <EmptyState
              icon={Compass}
              title="まだコミュニティに参加していません"
              body="Discoverで興味のあるコミュニティを見つけて、チャットを始めましょう。"
              action={
                <Button asChild>
                  <Link to="/discover">Discoverへ</Link>
                </Button>
              }
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section title="参加中のコミュニティ" icon={Users}>
              <div className="grid gap-2 sm:grid-cols-2">
                {mine.data?.map((c) => (
                  <Link
                    key={c.id}
                    to="/c/$communityId"
                    params={{ communityId: c.id }}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-surface-hover"
                  >
                    <CommunityIcon id={c.id} name={c.name} iconUrl={c.icon_url} className="size-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.member_count} メンバー · <span className="text-online">{c.online_count} オンライン</span>
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Section>

            <Section title="最近の投稿" icon={FileText}>
              {posts.data?.length ? (
                <ul className="divide-y rounded-xl border bg-card">
                  {posts.data.map((p) => (
                    <li key={p.id}>
                      <Link
                        to="/c/$communityId/posts"
                        params={{ communityId: p.community_id }}
                        className="flex items-start gap-3 p-3 hover:bg-surface-hover"
                      >
                        <UserAvatar name={p.author?.display_name ?? "?"} avatarUrl={p.author?.avatar_url} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.community?.name} · {p.author?.display_name} · {timeAgo(p.created_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">まだ投稿はありません。</p>
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="未読" icon={MessageSquare}>
              {unreadDms.length === 0 && unreadNotifs.length === 0 ? (
                <p className="text-sm text-muted-foreground">未読はありません 🎉</p>
              ) : (
                <ul className="space-y-1">
                  {unreadDms.map((d) => (
                    <li key={d.dm_id}>
                      <Link to="/dm/$dmId" params={{ dmId: d.dm_id }} className="flex items-center gap-2 rounded-lg p-2 hover:bg-surface-hover">
                        <UserAvatar name={d.other!.display_name} avatarUrl={d.other!.avatar_url} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm">{d.other!.display_name}</span>
                        <Badge>{d.unread}</Badge>
                      </Link>
                    </li>
                  ))}
                  {unreadNotifs.slice(0, 4).map((n) => (
                    <li key={n.id}>
                      <Link to="/notifications" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-surface-hover">
                        <Bell className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{n.content}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="自分のタスク" icon={CheckSquare}>
              {tasks.data?.length ? (
                <ul className="space-y-1">
                  {tasks.data.map((t) => (
                    <li key={t.id}>
                      <Link
                        to="/c/$communityId/tasks"
                        params={{ communityId: t.community_id }}
                        className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-surface-hover"
                      >
                        <span
                          className={
                            t.priority === "high" ? "size-2 rounded-full bg-dnd" : t.priority === "medium" ? "size-2 rounded-full bg-idle" : "size-2 rounded-full bg-offline"
                          }
                        />
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="text-xs text-muted-foreground">{t.due_date ?? ""}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">割り当てられたタスクはありません。</p>
              )}
            </Section>

            <Section title="オンラインメンバー" icon={Users}>
              {online.data?.length ? (
                <div className="flex flex-wrap gap-2">
                  {online.data.map((p) => (
                    <Link key={p!.id} to="/u/$userId" params={{ userId: p!.id }} title={p!.display_name}>
                      <UserAvatar name={p!.display_name} avatarUrl={p!.avatar_url} status={p!.status} showStatus size="md" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">今はだれもオンラインではありません。</p>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" /> {title}
      </h2>
      {children}
    </section>
  );
}
