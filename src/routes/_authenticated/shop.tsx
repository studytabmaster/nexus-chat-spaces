import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coins, ShoppingBag, Package, Timer, ShieldCheck } from "lucide-react";
import { useMe } from "@/lib/auth";
import { walletQuery } from "@/lib/points";
import {
  shopItemsQuery,
  myPurchasesQuery,
  purchaseItem,
  equipItem,
  saleState,
  countdownText,
  shopKindLabel,
  SHOP_KINDS,
  isAdminQuery,
  displayableImage,
  type ShopItem,
} from "@/lib/shop";
import { useSignedUrl } from "@/lib/storage";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "公式Shop — Nexa" },
      { name: "description", content: "ためたポイントでフレーム・背景・称号・限定アイテムと交換。" },
      { property: "og:title", content: "公式Shop — Nexa" },
      { property: "og:description", content: "ためたポイントでフレーム・背景・称号・限定アイテムと交換。" },
    ],
  }),
  component: ShopPage,
});

function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function ShopPage() {
  const me = useMe();
  const qc = useQueryClient();
  const uid = me.data?.id;
  useTick();
  const wallet = useQuery(walletQuery(uid));
  const items = useQuery(shopItemsQuery());
  const purchases = useQuery(myPurchasesQuery(uid));
  const admin = useQuery(isAdminQuery(uid));
  const [kind, setKind] = useState<string>("all");

  const buy = useMutation({
    mutationFn: purchaseItem,
    onSuccess: () => {
      toast.success("交換しました");
      qc.invalidateQueries({ queryKey: ["wallet", uid] });
      qc.invalidateQueries({ queryKey: ["shop-items", "public"] });
      qc.invalidateQueries({ queryKey: ["shop-purchases", uid] });
      qc.invalidateQueries({ queryKey: ["point-history", uid] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const equip = useMutation({
    mutationFn: ({ itemId, on }: { itemId: string; on: boolean }) => equipItem(itemId, on),
    onSuccess: (_d, v) => {
      toast.success(v.on ? "装備しました" : "外しました");
      qc.invalidateQueries({ queryKey: ["shop-purchases", uid] });
      invalidateCosmetics(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const owned = new Set(purchases.data?.map((p) => p.item_id));
  const visible = (items.data ?? []).filter((i) => kind === "all" || i.kind === kind);
  const balance = wallet.data?.balance ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <PageHeader
          title="公式Shop"
          subtitle="ポイントでアイテムと交換できます。交換は運営が用意した商品のみです。"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                <Coins className="mr-1 size-3.5" />
                {balance.toLocaleString()} pt
              </Badge>
              {admin.data && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin">Shop運営</Link>
                </Button>
              )}
            </div>
          }
        />

        <Tabs defaultValue="shop">
          <TabsList>
            <TabsTrigger value="shop">商品</TabsTrigger>
            <TabsTrigger value="inventory">インベントリ</TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-4">
            <div className="mb-4 flex flex-wrap gap-1.5">
              <FilterChip active={kind === "all"} onClick={() => setKind("all")} label="すべて" />
              {SHOP_KINDS.map((k) => (
                <FilterChip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)} label={k.label} />
              ))}
            </div>
            {items.isLoading && <LoadingState />}
            {!items.isLoading && visible.length === 0 && (
              <EmptyState icon={ShoppingBag} title="商品がありません" body="新しい商品が追加されるまでお待ちください。" />
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={owned.has(item.id)}
                  balance={balance}
                  pending={buy.isPending}
                  onBuy={() => buy.mutate(item.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            {purchases.data?.length === 0 && (
              <EmptyState icon={Package} title="まだ何も持っていません" body="ポイントをためて交換しましょう。" />
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {purchases.data?.map((p) => (
                <div key={p.id} className="rounded-2xl border bg-card p-4">
                  <Badge variant="secondary">{shopKindLabel(p.item?.kind ?? "")}</Badge>
                  <p className="mt-2 font-semibold">{p.item?.name ?? "不明なアイテム"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.item?.description}</p>
                  <Button
                    variant={p.equipped ? "secondary" : "default"}
                    size="sm"
                    className="mt-3 w-full"
                    disabled={equip.isPending}
                    onClick={() => equip.mutate({ itemId: p.item_id, on: !p.equipped })}
                  >
                    {p.equipped ? "使用中（外す）" : "使う"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          残高の計算と在庫の確認はサーバー側で行われ、同じ商品の二重交換はできません。
        </p>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}

function ItemCard({
  item,
  owned,
  balance,
  pending,
  onBuy,
}: {
  item: ShopItem;
  owned: boolean;
  balance: number;
  pending: boolean;
  onBuy: () => void;
}) {
  const s = saleState(item);
  const remaining = item.stock != null ? Math.max(item.stock - item.sold, 0) : null;
  const canBuy = s.state === "onsale" && !owned && balance >= item.price;
  const { data: imageUrl } = useSignedUrl(displayableImage(item.image_url));
  const isColor = item.payload.startsWith("#") || item.payload.startsWith("linear-gradient");

  return (
    <div className="flex flex-col rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="secondary">{shopKindLabel(item.kind)}</Badge>
        <Badge variant={s.state === "onsale" ? "default" : "outline"}>{s.label}</Badge>
      </div>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          className="mt-3 aspect-video w-full rounded-xl border object-cover"
        />
      ) : (
        <div
          className="mt-3 flex aspect-video w-full items-center justify-center rounded-xl border text-2xl"
          style={isColor ? { background: item.payload } : undefined}
        >
          {!isColor && <span>{item.payload || "🎁"}</span>}
        </div>
      )}
      <p className="mt-3 font-semibold">{item.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {item.season && <p>シーズン：{item.season}</p>}
        {remaining != null && <p>残り {remaining} 個 / {item.stock} 個限定</p>}
        {s.state === "upcoming" && s.startsAt && (
          <p className="flex items-center gap-1">
            <Timer className="size-3" />
            公開まで {countdownText(s.startsAt)}
          </p>
        )}
        {s.state === "onsale" && s.endsAt && (
          <p className="flex items-center gap-1">
            <Timer className="size-3" />
            終了まで {countdownText(s.endsAt)}
          </p>
        )}
        {item.restock_count > 0 && <p>再販売 {item.restock_count} 回目</p>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="flex items-center gap-1 font-bold">
          <Coins className="size-4 text-primary" />
          {item.price.toLocaleString()}
        </span>
        <Button size="sm" disabled={!canBuy || pending} onClick={onBuy}>
          {owned
            ? "交換済み"
            : s.state === "soldout"
              ? "完売"
              : s.state === "ended"
                ? "終了"
                : s.state === "upcoming"
                  ? "公開前"
                  : balance < item.price
                    ? "ポイント不足"
                    : "交換する"}
        </Button>
      </div>
    </div>
  );
}
