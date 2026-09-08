import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModAction = "warn" | "timeout" | "untimeout" | "kick" | "ban" | "unban";

export const MOD_ACTION_LABEL: Record<string, string> = {
  warn: "警告",
  timeout: "タイムアウト",
  untimeout: "タイムアウト解除",
  kick: "キック",
  ban: "BAN",
  unban: "BAN解除",
  transfer_owner: "オーナー移譲",
};

export const TIMEOUT_PRESETS = [
  { label: "1分", minutes: 1 },
  { label: "10分", minutes: 10 },
  { label: "1時間", minutes: 60 },
  { label: "1日", minutes: 1440 },
  { label: "7日", minutes: 10080 },
] as const;

export async function moderateMember(input: {
  communityId: string;
  userId: string;
  action: ModAction;
  reason?: string;
  minutes?: number | null;
}) {
  const { error } = await supabase.rpc("moderate_member", {
    _community_id: input.communityId,
    _user_id: input.userId,
    _action: input.action,
    _reason: input.reason ?? "",
    _minutes: input.minutes ?? null,
  });
  if (error) throw error;
}

export async function transferOwnership(communityId: string, newOwner: string) {
  const { error } = await supabase.rpc("transfer_ownership", {
    _community_id: communityId,
    _new_owner: newOwner,
  });
  if (error) throw error;
}

export type BanRow = {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  profile: { display_name: string; username: string; avatar_url: string | null } | null;
};

export function bansQuery(communityId: string) {
  return queryOptions({
    queryKey: ["bans", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<BanRow[]> => {
      const { data, error } = await supabase
        .from("community_bans")
        .select("id, user_id, reason, created_at, profile:profiles(display_name, username, avatar_url)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BanRow[];
    },
  });
}

export type AuditRow = {
  id: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
  actor: { display_name: string; avatar_url: string | null } | null;
};

export function auditLogsQuery(communityId: string) {
  return queryOptions({
    queryKey: ["audit-logs", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, target, detail, created_at, actor:profiles(display_name, avatar_url)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRow[];
    },
  });
}

export type ModerationRow = {
  id: string;
  action: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
  user_id: string;
  profile: { display_name: string; avatar_url: string | null } | null;
};

export function modHistoryQuery(communityId: string) {
  return queryOptions({
    queryKey: ["mod-history", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<ModerationRow[]> => {
      const { data, error } = await supabase
        .from("moderation_actions")
        .select("id, action, reason, expires_at, created_at, user_id, profile:profiles!moderation_actions_user_id_fkey(display_name, avatar_url)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ModerationRow[];
    },
  });
}

/* ---------------- 通報 ---------------- */

export const REPORT_REASONS = [
  { value: "spam", label: "スパム" },
  { value: "harassment", label: "ハラスメント" },
  { value: "inappropriate", label: "不適切なコンテンツ" },
  { value: "other", label: "その他" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export async function submitReport(input: {
  communityId?: string | null;
  targetType: "message" | "user" | "community";
  targetId: string;
  reporterId: string;
  reason: ReportReason;
  detail?: string;
  link?: string | null;
  preview?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    community_id: input.communityId ?? null,
    target_type: input.targetType,
    target_id: input.targetId,
    reporter_id: input.reporterId,
    reason: input.reason,
    detail: input.detail ?? "",
    link: input.link ?? null,
    preview: input.preview ?? "",
  });
  if (error) throw error;
}

export type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  detail: string;
  status: string;
  link: string | null;
  preview: string;
  created_at: string;
  reporter: { display_name: string; avatar_url: string | null } | null;
};

export function reportsQuery(communityId: string) {
  return queryOptions({
    queryKey: ["reports", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, target_type, target_id, reason, detail, status, link, preview, created_at, reporter:profiles!reports_reporter_id_fkey(display_name, avatar_url)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });
}

export async function setReportStatus(id: string, status: "RESOLVED" | "DISMISSED") {
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}
