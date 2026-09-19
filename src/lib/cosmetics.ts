import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** 装備中のショップアイテム（フレーム・称号・背景） */
export type Cosmetics = {
  user_id: string;
  frame: string | null;
  frame_image: string | null;
  title: string | null;
  background: string | null;
  background_image: string | null;
};

export function cosmeticsQuery(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean))).sort();
  return queryOptions({
    queryKey: ["cosmetics", ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, Cosmetics>> => {
      const { data, error } = await supabase.rpc("user_cosmetics_v2", { _user_ids: ids });
      if (error) throw error;
      const map: Record<string, Cosmetics> = {};
      for (const row of (data ?? []) as Cosmetics[]) map[row.user_id] = row;
      return map;
    },
  });
}

/** 複数ユーザーの装備アイテムをまとめて取得する */
export function useCosmetics(userIds: string[]) {
  const q = useQuery(cosmeticsQuery(userIds));
  return q.data ?? {};
}

/** 1人分の装備アイテム */
export function useCosmetic(userId: string | undefined) {
  const map = useCosmetics(userId ? [userId] : []);
  return userId ? map[userId] : undefined;
}

/** 装備が変わったときに表示を更新する */
export function invalidateCosmetics(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["cosmetics"] });
}

const COLORISH = /^(#|rgb|hsl|linear-gradient|radial-gradient|conic-gradient)/i;

/** 表示に使える画像パスだけ返す（端末内パスなどは無視） */
export function safeImage(path: string | null | undefined) {
  if (!path) return null;
  const value = path.trim();
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  if (value.includes("://")) return null;
  return value;
}

/** フレームの見た目（単色でもグラデーションでも枠線として使える） */
export function frameStyle(
  frame: string | null | undefined,
  frameImageUrl?: string | null,
): React.CSSProperties | undefined {
  if (frameImageUrl) {
    return {
      backgroundImage: `url(${frameImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      padding: "3px",
      borderRadius: "1rem",
    };
  }
  if (!frame) return undefined;
  const value = frame.trim();
  if (!value || !COLORISH.test(value)) return undefined;
  return {
    background: value,
    padding: "2px",
    borderRadius: "1rem",
  };
}

/** 背景の見た目（プロフィールカードなどで使う） */
export function backgroundStyle(
  background: string | null | undefined,
  backgroundImageUrl?: string | null,
): React.CSSProperties | undefined {
  if (backgroundImageUrl) {
    return {
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (!background) return undefined;
  const value = background.trim();
  if (!COLORISH.test(value)) return undefined;
  return { background: value };
}
