import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, FileText, BarChart3, CalendarDays, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ChannelType = "text" | "post" | "poll" | "event" | "voice";

export const CHANNEL_TYPES: { value: ChannelType; label: string; icon: typeof Hash }[] = [
  { value: "text", label: "テキスト", icon: Hash },
  { value: "post", label: "投稿", icon: FileText },
  { value: "poll", label: "投票", icon: BarChart3 },
  { value: "event", label: "イベント", icon: CalendarDays },
  { value: "voice", label: "ボイス", icon: Volume2 },
];

export function channelTypeMeta(type: string) {
  return CHANNEL_TYPES.find((t) => t.value === type) ?? CHANNEL_TYPES[0]!;
}

export type ChannelPref = {
  channel_id: string;
  favorite: boolean;
  muted: boolean;
  last_read_at: string;
};

export function channelPrefsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["channel-prefs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ChannelPref[]> => {
      const { data, error } = await supabase
        .from("channel_prefs")
        .select("channel_id, favorite, muted, last_read_at")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** お気に入り・ミュートなどの自分用チャンネル設定を保存する */
export function useSetChannelPref(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, patch }: { channelId: string; patch: Partial<Pick<ChannelPref, "favorite" | "muted" | "last_read_at">> }) => {
      if (!userId) throw new Error("ログインが必要です");
      const { error } = await supabase
        .from("channel_prefs")
        .upsert({ channel_id: channelId, user_id: userId, ...patch }, { onConflict: "channel_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channel-prefs", userId] }),
  });
}
