import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Trophy, Sparkles, Gift, UserPlus, ShoppingBag } from "lucide-react";
import { useMe } from "@/lib/auth";
import {
  walletQuery,
  pointHistoryQuery,
  missionsQuery,
  achievementsQuery,
  leaderboardQuery,
  referralsQuery,
  claimMission,
  levelInfo,
  REFERRAL_STATUS_LABEL,
} from "@/lib/points";
import { PageHeader } from "@/components/app/PageHeader";
import { UserAvatar } from "@/components/app/UserAvatar";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chatTime, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/points")({
  head: () => ({
    meta: [
      { title: "ポイント — Nexa" },
      { name: "description", content: "活動でポイントを集めて、レベル・実績・ランキングを伸ばそう。" },
      { property: "og:title", content: "ポイント — Nexa" },
      { property: "og:description", content: "活動でポイントを集めて、レベル・実績・ランキングを伸ばそう。" },
    ],
  }),
  component: PointsPage,
});

function PointsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const uid = me.data?.id;
  const wallet = useQuery(walletQuery(uid));
  const missions = useQuery(missionsQuery(uid));
  const history = useQuery(pointHistoryQuery(uid));
  const achievements = useQuery(achievementsQuery(uid));
  const leaders = useQuery(leaderboardQuery());
  const referrals = useQuery(referralsQuery(uid));

  const claim = useMutation({
    mutationFn: claimMission,
    onSuccess: (pts) => {
      toast.success(pts > 0 ? `${pts} ポイントを獲得しました` : "受け取りました");
      qc.invalidateQueries({ queryKey: ["missions", uid] });
      qc.invalidateQueries({ queryKey: ["wallet", uid] });
      qc.invalidateQueries({ queryKey: ["point-history", uid] });
      qc.invalidateQueries({ queryKey: ["achievements", uid] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lifetime = wallet.data?.lifetime ?? 0;
  const lv = levelInfo(lifetime);
  const confirmed = referrals.data?.filter((r) => r.status === "confirmed").length ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <PageHeader
          title="ポイント"
          subtitle="活動するとポイントがたまります。付与はすべてサーバー側で判定されます。"
          actions={
            <Button asChild variant="outline">
              <Link to="/shop">
                <ShoppingBag className="mr-2 size-4" />
                公式Shop
              </Link>
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">保有ポイント</p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
              <Coins className="size-6 text-primary" />
              {(wallet.data?.balance ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">レベル</p>
            <p className="mt-1 text-3xl font-extrabold">Lv.{lv.level}</p>
            <Progress value={lv.percent} className="mt-2 h-2" />
            <p className="mt-1 text-xs text-muted-foreground">次のレベルまで {lv.remaining.toLocaleString()} pt</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">累計獲得</p>
            <p className="mt-1 text-3xl font-extrabold">{lifetime.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">招待成立 {confirmed} 人</p>
          </div>
        </div>

        <Tabs defaultValue="missions" className="mt-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="missions">ミッション</TabsTrigger>
            <TabsTrigger value="achievements">実績</TabsTrigger>
            <TabsTrigger value="history">履歴</TabsTrigger>
            <TabsTrigger value="ranking">ランキング</TabsTrigger>
            <TabsTrigger value="invites">招待</TabsTrigger>
          </TabsList>

          <TabsContent value="missions" className="mt-4 space-y-2">
            {missions.isLoading && <LoadingState />}
            {missions.data?.map((m) => {
              const done = m.progress >= m.target;
              return (
                <div key={m.key} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent">
                    <Gift className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.description}</p>
                    <Progress value={Math.min(100, (m.progress / m.target) * 100)} className="mt-2 h-1.5" />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {Math.min(m.progress, m.target)}/{m.target}
                    </p>
                    <p className="text-sm font-bold text-primary">+{m.points}</p>
                    <Button
                      size="sm"
                      className="mt-1"
                      disabled={!done || m.claimed || claim.isPending}
                      onClick={() => claim.mutate(m.key)}
                    >
                      {m.claimed ? "受取済み" : done ? "受け取る" : "未達成"}
                    </Button>
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-muted-foreground">
              ミッションは毎日 0:00（日本時間）にリセットされます。1日に受け取れるポイントには上限があります。
            </p>
          </TabsContent>

          <TabsContent value="achievements" className="mt-4 grid gap-2 sm:grid-cols-2">
            {achievements.data?.map((a) => (
              <div
                key={a.key}
                className={`rounded-xl border p-3 ${a.unlocked_at ? "bg-card" : "bg-muted/30 opacity-70"}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`size-4 ${a.unlocked_at ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium">{a.name}</p>
                  {a.points > 0 && <Badge variant="secondary">+{a.points}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.unlocked_at ? `${shortDate(a.unlocked_at)} に解除` : "未解除"}
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-1">
            {history.data?.length === 0 && (
              <EmptyState icon={Coins} title="まだ履歴がありません" body="発言や投稿でポイントがたまります。" />
            )}
            {history.data?.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{h.label || h.reason}</p>
                  <p className="text-xs text-muted-foreground">{chatTime(h.created_at)}</p>
                </div>
                <p className={`shrink-0 font-bold ${h.delta >= 0 ? "text-primary" : "text-destructive"}`}>
                  {h.delta >= 0 ? "+" : ""}
                  {h.delta}
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="ranking" className="mt-4 space-y-1">
            {leaders.isLoading && <LoadingState />}
            {leaders.data?.map((r, i) => (
              <Link
                key={r.user_id}
                to="/u/$userId"
                params={{ userId: r.user_id }}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent"
              >
                <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                <UserAvatar name={r.display_name} avatarUrl={r.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{r.username}</p>
                </div>
                <Badge variant="secondary">Lv.{r.level}</Badge>
                <span className="w-20 text-right font-bold">{r.lifetime.toLocaleString()}</span>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="invites" className="mt-4 space-y-2">
            <div className="rounded-xl border bg-card p-4 text-sm">
              <p className="font-medium">招待報酬のしくみ</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>コミュニティの招待リンクから参加した人が記録されます。</li>
                <li>招待した人が累計50ポイント分の活動をすると成立し、100ポイントが入ります。</li>
                <li>自分自身の招待や、短時間の大量招待は無効となり運営に記録されます。</li>
              </ul>
            </div>
            {referrals.data?.length === 0 && (
              <EmptyState icon={UserPlus} title="招待の記録がありません" body="コミュニティ設定から招待リンクを作成できます。" />
            )}
            {referrals.data?.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                <UserAvatar name={r.invitee?.display_name ?? "?"} avatarUrl={r.invitee?.avatar_url ?? null} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.invitee?.display_name ?? "不明なユーザー"}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(r.created_at)}</p>
                </div>
                <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
                  {REFERRAL_STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="size-4" />
          ポイントの計算・上限・不正判定はすべてサーバー側で行われます。
        </div>
      </div>
    </div>
  );
}
