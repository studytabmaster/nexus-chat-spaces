import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** 装備中のショップアイテム（フレーム・称号・背景） */
export type Cosmetics = {
  user_id: string;
  frame: string | null;
  frame_image: string | null;
  title: string | null;
  background: string | null;
};

export function cosmeticsQuery(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean))).sort();
  return queryOptions({
    queryKey: ["cosmetics", ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, Cosmetics>> => {
      const { data, error } = await supabase.rpc("user_cosmetics", { _user_ids: ids });
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

/** フレームの見た目（単色でもグラデーションでも枠線として使える） */
export function frameStyle(frame: string | null | undefined): React.CSSProperties | undefined {
  if (!frame) return undefined;
  const value = frame.trim();
  if (!value) return undefined;
  const isColorish = /^(#|rgb|hsl|linear-gradient|radial-gradient|conic-gradient)/i.test(value);
  if (!isColorish) return undefined;
  return {
    background: value,
    padding: "2px",
    borderRadius: "1rem",
  };
}

/** 背景の見た目（プロフィールカードなどで使う） */
export function backgroundStyle(background: string | null | undefined): React.CSSProperties | undefined {
  if (!background) return undefined;
  const value = background.trim();
  if (!/^(#|rgb|hsl|linear-gradient|radial-gradient|conic-gradient)/i.test(value)) return undefined;
  return { background: value };
}
