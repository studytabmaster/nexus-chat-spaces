import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- ウェルカム画面 ---------------- */

export type Welcome = {
  community_id: string;
  enabled: boolean;
  title: string;
  body: string;
  rules: string[];
};

export function welcomeQuery(communityId: string) {
  return queryOptions({
    queryKey: ["welcome", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<Welcome | null> => {
      const { data, error } = await supabase
        .from("community_welcome")
        .select("community_id, enabled, title, body, rules")
        .eq("community_id", communityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ---------------- 招待リンク ---------------- */

export type Invite = {
  id: string;
  community_id: string;
  code: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

export function invitesQuery(communityId: string) {
  return queryOptions({
    queryKey: ["invites", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("invites")
        .select("id, community_id, code, max_uses, uses, expires_at, revoked, created_at")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function inviteCode() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export function inviteUrl(code: string) {
  if (typeof window === "undefined") return `/invite/${code}`;
  return `${window.location.origin}/invite/${code}`;
}

/* ---------------- カスタム絵文字 ---------------- */

export type CustomEmoji = {
  id: string;
  community_id: string;
  name: string;
  image_url: string;
};

export function emojisQuery(communityId: string | undefined) {
  return queryOptions({
    queryKey: ["custom-emojis", communityId],
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CustomEmoji[]> => {
      const { data, error } = await supabase
        .from("custom_emojis")
        .select("id, community_id, name, image_url")
        .eq("community_id", communityId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCustomEmojis(communityId: string | undefined) {
  const q = useQuery(emojisQuery(communityId));
  return q.data ?? [];
}

/* ---------------- バッジ ---------------- */

export type Badge = { id: string; key: string; name: string; description: string; icon: string; color: string };

export function userBadgesQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["user-badges", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Badge[]> => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge:badges(id, key, name, description, icon, color)")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.badge as Badge).filter(Boolean);
    },
  });
}

/* ---------------- メディア / ファイル ---------------- */

export type MediaItem = {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  attachment_url: string;
  attachment_type: string | null;
  created_at: string;
  author: { display_name: string; avatar_url: string | null } | null;
};

export function mediaQuery(communityId: string) {
  return queryOptions({
    queryKey: ["media", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<MediaItem[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, channel_id, user_id, content, attachment_url, attachment_type, created_at, author:profiles(display_name, avatar_url)")
        .eq("community_id", communityId)
        .not("attachment_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as MediaItem[];
    },
  });
}
