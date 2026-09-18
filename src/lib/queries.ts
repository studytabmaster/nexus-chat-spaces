import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Community = Tables<"communities">;
export type Channel = Tables<"channels">;
export type Category = Tables<"categories">;
export type Profile = Tables<"profiles">;
export type Member = Tables<"community_members"> & { profile: Profile };

export type CommunityCardData = Community & {
  tags: string[];
  member_count: number;
  online_count: number;
};

function shape(rows: (Community & { community_tags: { tag: string }[]; community_members: { user_id: string; profile: { status: string; show_online: boolean } | null }[] })[]) {
  return rows.map((c) => ({
    ...c,
    tags: c.community_tags.map((t) => t.tag),
    member_count: c.community_members.length,
    online_count: c.community_members.filter((m) => m.profile?.show_online && m.profile.status !== "offline").length,
  })) as CommunityCardData[];
}

const CARD_SELECT = "*, community_tags(tag), community_members(user_id, profile:profiles(status, show_online))";

export const publicCommunitiesQuery = queryOptions({
  queryKey: ["communities", "public"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("communities")
      .select(CARD_SELECT)
      .eq("visibility", "PUBLIC")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return shape(data as never);
  },
});

export const myCommunitiesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["communities", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select(`role, joined_at, community:communities(${CARD_SELECT})`)
        .eq("user_id", userId)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data.map((r) => ({ role: r.role, joined_at: r.joined_at, ...shape([r.community as never])[0]! }));
    },
  });

export const communityQuery = (id: string) =>
  queryOptions({
    queryKey: ["community", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("communities").select(CARD_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return shape([data as never])[0]!;
    },
  });

export const channelsQuery = (communityId: string) =>
  queryOptions({
    queryKey: ["channels", communityId],
    queryFn: async () => {
      const [cats, chans] = await Promise.all([
        supabase.from("categories").select("*").eq("community_id", communityId).order("position"),
        supabase.from("channels").select("*").eq("community_id", communityId).order("position"),
      ]);
      if (cats.error) throw cats.error;
      if (chans.error) throw chans.error;
      return { categories: cats.data, channels: chans.data };
    },
  });

export const membersQuery = (communityId: string) =>
  queryOptions({
    queryKey: ["members", communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*, profile:profiles(*)")
        .eq("community_id", communityId)
        .order("joined_at");
      if (error) throw error;
      return data as Member[];
    },
  });

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      // 公開してよい項目のみを返す仕組みを経由して取得する
      const { data, error } = await supabase.rpc("profile_card", { _id: userId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

export const notificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

export const dmListQuery = (userId: string) =>
  queryOptions({
    queryKey: ["dms", userId],
    queryFn: async () => {
      const { data: mine, error } = await supabase.from("dm_members").select("dm_id, last_read_at").eq("user_id", userId);
      if (error) throw error;
      if (!mine.length) return [];
      const ids = mine.map((m) => m.dm_id);
      const [others, lasts] = await Promise.all([
        supabase.from("dm_members").select("dm_id, profile:profiles(*)").in("dm_id", ids).neq("user_id", userId),
        supabase.from("dm_messages").select("*").in("dm_id", ids).order("created_at", { ascending: false }).limit(200),
      ]);
      if (others.error) throw others.error;
      if (lasts.error) throw lasts.error;
      return mine
        .map((m) => {
          const other = others.data.find((o) => o.dm_id === m.dm_id)?.profile as Profile | undefined;
          const msgs = lasts.data.filter((x) => x.dm_id === m.dm_id);
          const last = msgs[0];
          const unread = msgs.filter((x) => x.user_id !== userId && x.created_at > m.last_read_at).length;
          return { dm_id: m.dm_id, other, last, unread };
        })
        .filter((d) => d.other)
        .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
    },
  });
