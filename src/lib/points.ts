import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityKind = "daily_login" | "message" | "post" | "comment" | "poll_vote" | "event_rsvp";

/** ポイント付与はサーバー側（RPC）だけで行う。失敗しても画面の操作は止めない。 */
export async function recordActivity(kind: ActivityKind, refId?: string | null) {
  const { data, error } = await supabase.rpc("record_activity", {
    _kind: kind,
    ...(refId ? { _ref_id: refId } : {}),
  });
  if (error) return 0;
  return (data as number) ?? 0;
}

export function levelInfo(lifetime: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(lifetime, 0) / 100)) + 1);
  const floorPts = (level - 1) ** 2 * 100;
  const nextPts = level ** 2 * 100;
  const span = nextPts - floorPts;
  return {
    level,
    current: lifetime - floorPts,
    span,
    remaining: Math.max(nextPts - lifetime, 0),
    percent: span > 0 ? Math.min(100, Math.round(((lifetime - floorPts) / span) * 100)) : 0,
  };
}

export type Wallet = { balance: number; lifetime: number };

export function walletQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["wallet", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Wallet> => {
      const { data, error } = await supabase
        .from("point_wallets")
        .select("balance, lifetime")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? { balance: 0, lifetime: 0 };
    },
  });
}

export type PointEvent = {
  id: string;
  delta: number;
  reason: string;
  label: string;
  status: string;
  created_at: string;
};

export function pointHistoryQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["point-history", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PointEvent[]> => {
      const { data, error } = await supabase
        .from("point_events")
        .select("id, delta, reason, label, status, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type MissionRow = {
  key: string;
  name: string;
  description: string;
  target: number;
  points: number;
  progress: number;
  claimed: boolean;
};

function todayJst() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export function missionsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["missions", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MissionRow[]> => {
      const [defs, prog] = await Promise.all([
        supabase.from("mission_defs").select("*").eq("active", true).order("position"),
        supabase
          .from("mission_progress")
          .select("mission_key, progress, claimed")
          .eq("user_id", userId!)
          .eq("day", todayJst()),
      ]);
      if (defs.error) throw defs.error;
      if (prog.error) throw prog.error;
      return (defs.data ?? []).map((d) => {
        const p = prog.data?.find((x) => x.mission_key === d.key);
        return {
          key: d.key,
          name: d.name,
          description: d.description,
          target: d.target,
          points: d.points,
          progress: p?.progress ?? 0,
          claimed: p?.claimed ?? false,
        };
      });
    },
  });
}

export async function claimMission(key: string) {
  const { data, error } = await supabase.rpc("claim_mission", { _key: key });
  if (error) throw error;
  return (data as number) ?? 0;
}

export type AchievementRow = {
  key: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked_at: string | null;
};

export function achievementsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["achievements", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AchievementRow[]> => {
      const [defs, mine] = await Promise.all([
        supabase.from("achievement_defs").select("*").order("threshold"),
        supabase.from("user_achievements").select("achievement_key, unlocked_at").eq("user_id", userId!),
      ]);
      if (defs.error) throw defs.error;
      if (mine.error) throw mine.error;
      return (defs.data ?? []).map((d) => ({
        key: d.key,
        name: d.name,
        description: d.description,
        icon: d.icon,
        points: d.points,
        unlocked_at: mine.data?.find((m) => m.achievement_key === d.key)?.unlocked_at ?? null,
      }));
    },
  });
}

export type LeaderRow = {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  lifetime: number;
  level: number;
};

export function leaderboardQuery() {
  return queryOptions({
    queryKey: ["points-leaderboard"],
    queryFn: async (): Promise<LeaderRow[]> => {
      const { data, error } = await supabase.rpc("points_leaderboard", { _limit: 50 });
      if (error) throw error;
      return (data as LeaderRow[]) ?? [];
    },
  });
}

export type ReferralRow = {
  id: string;
  status: string;
  note: string;
  created_at: string;
  confirmed_at: string | null;
  invitee: { display_name: string; username: string; avatar_url: string | null } | null;
};

export function referralsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["referrals", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ReferralRow[]> => {
      const { data, error } = await supabase
        .from("invite_referrals")
        .select("id, status, note, created_at, confirmed_at, invitee:profiles!invite_referrals_invitee_id_fkey(display_name, username, avatar_url)")
        .eq("inviter_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReferralRow[];
    },
  });
}

export const REFERRAL_STATUS_LABEL: Record<string, string> = {
  pending: "保留中",
  confirmed: "成立",
  rejected: "無効",
};
