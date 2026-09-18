import { useEffect } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DashboardStats = {
  memberCount: number;
  onlineCount: number;
  openReports: number;
  joined24h: number;
  joined7d: number;
  recentJoins: {
    user_id: string;
    joined_at: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    status: string;
  }[];
  roleCounts: Record<string, number>;
};

export function dashboardQuery(communityId: string) {
  return queryOptions({
    queryKey: ["dashboard", communityId],
    enabled: !!communityId,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardStats> => {
      const [members, reports] = await Promise.all([
        supabase
          .from("community_members")
          .select("user_id, role, joined_at, profile:profiles(display_name, username, avatar_url, status, show_online)")
          .eq("community_id", communityId)
          .order("joined_at", { ascending: false }),
        supabase.from("reports").select("id, status").eq("community_id", communityId).eq("status", "OPEN"),
      ]);
      if (members.error) throw members.error;
      if (reports.error) throw reports.error;

      const rows = (members.data ?? []) as unknown as {
        user_id: string;
        role: string;
        joined_at: string;
        profile: {
          display_name: string;
          username: string;
          avatar_url: string | null;
          status: string;
          show_online: boolean;
        } | null;
      }[];

      const now = Date.now();
      const since = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
      const d1 = since(24);
      const d7 = since(24 * 7);

      const roleCounts: Record<string, number> = {};
      for (const r of rows) roleCounts[r.role] = (roleCounts[r.role] ?? 0) + 1;

      return {
        memberCount: rows.length,
        onlineCount: rows.filter((r) => r.profile?.show_online && r.profile.status !== "offline").length,
        openReports: reports.data?.length ?? 0,
        joined24h: rows.filter((r) => r.joined_at > d1).length,
        joined7d: rows.filter((r) => r.joined_at > d7).length,
        recentJoins: rows.slice(0, 8).map((r) => ({
          user_id: r.user_id,
          joined_at: r.joined_at,
          display_name: r.profile?.display_name ?? "不明なユーザー",
          username: r.profile?.username ?? "",
          avatar_url: r.profile?.avatar_url ?? null,
          status: r.profile?.status ?? "offline",
        })),
        roleCounts,
      };
    },
  });
}

/** メンバー・通報・オンライン状態の変化を購読して数値を即時更新する。 */
export function useDashboardRealtime(communityId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!communityId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // 参加・通報の変化だけを購読し、まとめて再集計する（オンライン数は定期更新）
    const invalidate = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (document.visibilityState !== "visible") return;
        qc.invalidateQueries({ queryKey: ["dashboard", communityId] });
      }, 3000);
    };
    const channel = supabase
      .channel(`dashboard:${communityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members", filter: `community_id=eq.${communityId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports", filter: `community_id=eq.${communityId}` },
        invalidate,
      )
      .subscribe();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") qc.invalidateQueries({ queryKey: ["dashboard", communityId] });
    }, 60_000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [communityId, qc]);
}
