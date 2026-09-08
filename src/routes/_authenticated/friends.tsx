import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Check, X, Ban, UserMinus } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useFriends, otherSide, type Friendship } from "@/lib/social";
import { STATUS_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "フレンド — Nexa" },
      { name: "description", content: "フレンドの一覧・申請の確認・オンライン状況をチェックできます。" },
      { property: "og:title", content: "フレンド — Nexa" },
      { property: "og:description", content: "フレンドの一覧と申請の管理。" },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const { userId, list, setStatus, remove } = useFriends();
  const [tab, setTab] = useState("online");

  const all = list.data ?? [];
  const accepted = all.filter((f) => f.status === "accepted");
  const pending = all.filter((f) => f.status === "pending");
  const blocked = all.filter((f) => f.status === "blocked");

  const shown: Friendship[] =
    tab === "online"
      ? accepted.filter((f) => {
          const p = otherSide(f, userId);
          return p?.show_online && p.status !== "offline";
        })
      : tab === "all"
        ? accepted
        : tab === "pending"
          ? pending
          : blocked;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader title="フレンド" subtitle="つながっている人と、申請の状況" />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="online">オンライン</TabsTrigger>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="pending">申請中{pending.length ? `（${pending.length}）` : ""}</TabsTrigger>
            <TabsTrigger value="blocked">ブロック</TabsTrigger>
          </TabsList>
        </Tabs>

        {list.isLoading && <LoadingState />}
        {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
        {list.data && shown.length === 0 && (
          <EmptyState icon={Users} title="表示できるフレンドがいません" body="プロフィールからフレンド申請を送れます。" />
        )}

        <div className="grid gap-2">
          {shown.map((f) => {
            const p = otherSide(f, userId);
            if (!p) return null;
            const incoming = f.status === "pending" && f.addressee_id === userId;
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <Link to="/u/$userId" params={{ userId: p.id }}>
                  <UserAvatar name={p.display_name} avatarUrl={p.avatar_url} showStatus={p.show_online} status={p.status} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.display_name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{p.username}
                    {p.show_online ? ` ・ ${STATUS_LABEL[p.status] ?? p.status}` : ""}
                    {p.custom_status ? ` ・ ${p.custom_status}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {incoming && (
                    <>
                      <Button size="sm" onClick={() => setStatus.mutate({ id: f.id, status: "accepted" })}>
                        <Check className="mr-1 size-4" /> 承認
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => remove.mutate(f.id)}>
                        <X className="size-4" />
                      </Button>
                    </>
                  )}
                  {f.status === "pending" && !incoming && (
                    <Button size="sm" variant="secondary" onClick={() => remove.mutate(f.id)}>
                      申請を取り消す
                    </Button>
                  )}
                  {f.status === "accepted" && (
                    <>
                      <Button size="sm" variant="ghost" aria-label="ブロック" onClick={() => setStatus.mutate({ id: f.id, status: "blocked" })}>
                        <Ban className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="フレンド解除" onClick={() => remove.mutate(f.id)}>
                        <UserMinus className="size-4" />
                      </Button>
                    </>
                  )}
                  {f.status === "blocked" && (
                    <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: f.id, status: "accepted" })}>
                      ブロック解除
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
