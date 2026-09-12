import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShopKind =
  | "frame"
  | "background"
  | "badge"
  | "title"
  | "theme"
  | "emoji"
  | "sticker"
  | "reaction"
  | "limited";

export const SHOP_KINDS: { value: ShopKind; label: string }[] = [
  { value: "frame", label: "プロフィールフレーム" },
  { value: "background", label: "背景" },
  { value: "badge", label: "バッジ" },
  { value: "title", label: "称号" },
  { value: "theme", label: "テーマ" },
  { value: "emoji", label: "絵文字" },
  { value: "sticker", label: "スタンプ" },
  { value: "reaction", label: "リアクション" },
  { value: "limited", label: "限定アイテム" },
];

export function shopKindLabel(kind: string) {
  return SHOP_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  pending: "審査中",
  approved: "承認済み",
  rejected: "却下",
};

export type ShopItem = {
  id: string;
  kind: string;
  name: string;
  description: string;
  image_url: string | null;
  payload: string;
  price: number;
  stock: number | null;
  sold: number;
  starts_at: string | null;
  ends_at: string | null;
  published: boolean;
  review_status: string;
  ai_generated: boolean;
  season: string;
  restock_count: number;
  created_at: string;
};

export function shopItemsQuery(opts?: { all?: boolean }) {
  return queryOptions({
    queryKey: ["shop-items", opts?.all ? "all" : "public"],
    queryFn: async (): Promise<ShopItem[]> => {
      let q = supabase.from("shop_items").select("*").order("created_at", { ascending: false });
      if (!opts?.all) q = q.eq("published", true).eq("review_status", "approved");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ShopItem[];
    },
  });
}

export type PurchaseRow = {
  id: string;
  item_id: string;
  price_paid: number;
  equipped: boolean;
  created_at: string;
  item: ShopItem | null;
};

export function myPurchasesQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["shop-purchases", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PurchaseRow[]> => {
      const { data, error } = await supabase
        .from("shop_purchases")
        .select("id, item_id, price_paid, equipped, created_at, item:shop_items(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseRow[];
    },
  });
}

export async function purchaseItem(itemId: string) {
  const { error } = await supabase.rpc("purchase_shop_item", { _item_id: itemId });
  if (error) throw error;
}

export async function equipItem(itemId: string, equip: boolean) {
  const { error } = await supabase.rpc("equip_shop_item", { _item_id: itemId, _equip: equip });
  if (error) throw error;
}

/** 販売状態の判定（期間限定・個数限定・完売・予約公開） */
export function saleState(item: ShopItem, now = new Date()) {
  const starts = item.starts_at ? new Date(item.starts_at) : null;
  const ends = item.ends_at ? new Date(item.ends_at) : null;
  const soldOut = item.stock != null && item.sold >= item.stock;
  if (starts && starts > now) return { state: "upcoming" as const, label: "公開予定", startsAt: starts, endsAt: ends, soldOut };
  if (ends && ends <= now) return { state: "ended" as const, label: "販売終了", startsAt: starts, endsAt: ends, soldOut };
  if (soldOut) return { state: "soldout" as const, label: "完売", startsAt: starts, endsAt: ends, soldOut };
  return { state: "onsale" as const, label: "販売中", startsAt: starts, endsAt: ends, soldOut };
}

export function countdownText(target: Date, now = new Date()) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "終了";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}日 ${h}時間`;
  if (h > 0) return `${h}時間 ${m}分`;
  return `${m}分 ${s}秒`;
}

export type FraudFlag = {
  id: string;
  user_id: string | null;
  kind: string;
  detail: string;
  status: string;
  created_at: string;
};

export function fraudFlagsQuery() {
  return queryOptions({
    queryKey: ["fraud-flags"],
    queryFn: async (): Promise<FraudFlag[]> => {
      const { data, error } = await supabase
        .from("fraud_flags")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FraudFlag[];
    },
  });
}

export const FRAUD_KIND_LABEL: Record<string, string> = {
  rate_limit: "短時間の大量獲得",
  invite_abuse: "招待の不正利用の疑い",
};

export type ServiceAuditRow = {
  id: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
  actor: { display_name: string; username: string } | null;
};

export function serviceAuditQuery() {
  return queryOptions({
    queryKey: ["service-audit"],
    queryFn: async (): Promise<ServiceAuditRow[]> => {
      const { data, error } = await supabase
        .from("service_audit_logs")
        .select("id, action, target, detail, created_at, actor:profiles!service_audit_logs_actor_id_fkey(display_name, username)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ServiceAuditRow[];
    },
  });
}

export function isAdminQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId!, _role: "admin" });
      if (error) return false;
      return !!data;
    },
  });
}
