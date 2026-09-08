import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles, Flame, TrendingUp, Clock, Compass } from "lucide-react";
import { publicCommunitiesQuery, type CommunityCardData } from "@/lib/queries";
import { CATEGORIES } from "@/lib/constants";
import { CommunityCard } from "@/components/app/CommunityCard";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateCommunityDialog } from "@/components/app/CreateCommunityDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Nexa" },
      { name: "description", content: "カテゴリーやタグで公開コミュニティを検索。おすすめ・人気・急上昇・新着。" },
      { property: "og:title", content: "Discover — Nexa" },
      { property: "og:description", content: "公開コミュニティを探す。" },
    ],
  }),
  component: DiscoverPage,
});

type Sort = "popular" | "members" | "active" | "trending" | "newest";

function DiscoverPage() {
  const all = useQuery(publicCommunitiesQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("すべて");
  const [sort, setSort] = useState<Sort>("popular");

  const filtered = useMemo(() => {
    let list = all.data ?? [];
    if (cat !== "すべて") list = list.filter((c) => c.category === cat);
    const s = q.trim().toLowerCase();
    if (s)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.description.toLowerCase().includes(s) ||
          c.category.toLowerCase().includes(s) ||
          c.tags.some((t) => t.includes(s)),
      );
    const week = Date.now() - 7 * 86400000;
    const sorters: Record<Sort, (a: CommunityCardData, b: CommunityCardData) => number> = {
      popular: (a, b) => b.member_count + b.online_count * 2 - (a.member_count + a.online_count * 2),
      members: (a, b) => b.member_count - a.member_count,
      active: (a, b) => b.online_count - a.online_count,
      trending: (a, b) => (new Date(b.created_at).getTime() > week ? 1 : 0) - (new Date(a.created_at).getTime() > week ? 1 : 0) || b.online_count - a.online_count,
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
    };
    return [...list].sort(sorters[sort]);
  }, [all.data, cat, q, sort]);

  const searching = q.trim() || cat !== "すべて" || sort !== "popular";
  const base = all.data ?? [];
  const sections = [
    { key: "rec", icon: Sparkles, title: "おすすめ", list: [...base].filter((c) => c.is_verified).slice(0, 4) },
    { key: "pop", icon: Flame, title: "人気", list: [...base].sort((a, b) => b.member_count - a.member_count).slice(0, 4) },
    { key: "trend", icon: TrendingUp, title: "急上昇", list: [...base].sort((a, b) => b.online_count - a.online_count).slice(0, 4) },
    { key: "new", icon: Clock, title: "新着", list: [...base].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4) },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <PageHeader
          title="Discover"
          subtitle="興味のあるコミュニティを見つけよう。"
          actions={<CreateCommunityDialog trigger={<Button variant="secondary">コミュニティを作成</Button>} />}
        />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="コミュニティを検索…" className="h-11 rounded-xl pl-9 text-base" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                  cat === c ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">人気順</SelectItem>
              <SelectItem value="members">メンバー数</SelectItem>
              <SelectItem value="active">アクティブ</SelectItem>
              <SelectItem value="trending">急上昇</SelectItem>
              <SelectItem value="newest">新着</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8">
          {all.isLoading && <LoadingState />}
          {all.isError && <ErrorState message={all.error.message} onRetry={() => all.refetch()} />}
          {all.data && searching && (
            filtered.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <CommunityCard key={c.id} c={c} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Compass} title="見つかりませんでした" body="別のキーワードやカテゴリーで試してみてください。" />
            )
          )}
          {all.data && !searching && (
            <div className="space-y-10">
              {sections.map((s) =>
                s.list.length ? (
                  <section key={s.key}>
                    <h2 className="mb-3 flex items-center gap-2 font-bold">
                      <s.icon className="size-4 text-primary" /> {s.title}
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {s.list.map((c) => (
                        <CommunityCard key={c.id} c={c} />
                      ))}
                    </div>
                  </section>
                ) : null,
              )}
              {base.length === 0 && (
                <EmptyState icon={Compass} title="公開コミュニティはまだありません" body="最初のコミュニティを作ってみましょう。" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
