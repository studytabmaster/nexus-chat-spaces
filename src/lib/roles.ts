import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RolePermissionKey =
  | "manage_channels"
  | "manage_messages"
  | "manage_events"
  | "manage_members"
  | "manage_roles"
  | "mention_everyone"
  | "view_audit_log";

export const ROLE_PERMISSIONS: { key: RolePermissionKey; label: string; description: string }[] = [
  { key: "manage_channels", label: "チャンネル管理", description: "チャンネルの作成・編集・削除" },
  { key: "manage_messages", label: "メッセージ管理", description: "他者のメッセージ削除やピン留め" },
  { key: "manage_events", label: "イベント管理", description: "コミュニティイベントの作成・編集" },
  { key: "manage_members", label: "メンバー管理", description: "キック・BAN・タイムアウトの実行" },
  { key: "manage_roles", label: "ロール管理", description: "ロールの作成・編集・メンバーへの付与" },
  { key: "mention_everyone", label: "@everyone メンション", description: "全員宛ての通知を送信" },
  { key: "view_audit_log", label: "監査ログ閲覧", description: "モデレーションログの確認" },
];

export interface CommunityRole {
  id: string;
  community_id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  permissions: string[];
  created_at: string;
}

export interface MemberRoleLink {
  id: string;
  community_id: string;
  role_id: string;
  user_id: string;
  role?: CommunityRole;
}

export function communityRolesQuery(communityId: string) {
  return queryOptions({
    queryKey: ["community-roles", communityId],
    staleTime: 15 * 60 * 1000,
    queryFn: async (): Promise<CommunityRole[]> => {
      const { data, error } = await supabase
        .from("community_roles")
        .select("*")
        .eq("community_id", communityId)
        .order("position", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CommunityRole[];
    },
  });
}

export function memberRolesQuery(communityId: string) {
  return queryOptions({
    queryKey: ["community-member-roles", communityId],
    staleTime: 15 * 60 * 1000,
    queryFn: async (): Promise<MemberRoleLink[]> => {
      const { data, error } = await supabase
        .from("community_member_roles")
        .select("id, community_id, role_id, user_id, role:community_roles(*)")
        .eq("community_id", communityId);
      if (error) throw error;
      return (data ?? []) as unknown as MemberRoleLink[];
    },
  });
}

/** ユーザーIDごとの付与済みロール（優先順位が高い順） */
export function groupMemberRoles(links: MemberRoleLink[] | undefined) {
  const map: Record<string, CommunityRole[]> = {};
  for (const link of links ?? []) {
    if (!link.role) continue;
    (map[link.user_id] ??= []).push(link.role);
  }
  for (const list of Object.values(map)) list.sort((a, b) => b.position - a.position);
  return map;
}

export function useRoleAdmin(communityId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["community-roles", communityId] });
    qc.invalidateQueries({ queryKey: ["community-member-roles", communityId] });
  };

  const create = useMutation({
    mutationFn: async (input: { name: string; color: string; icon: string; permissions: string[]; position: number }) => {
      const { error } = await supabase.from("community_roles").insert({ community_id: communityId, ...input });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Omit<CommunityRole, "id" | "community_id" | "created_at">>) => {
      const { error } = await supabase.from("community_roles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: async ({ roleId, userId, on }: { roleId: string; userId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from("community_member_roles")
          .insert({ community_id: communityId, role_id: roleId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_member_roles")
          .delete()
          .eq("community_id", communityId)
          .eq("role_id", roleId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, assign };
}

/** コミュニティ内で自分が持っている権限（既定ロールも考慮） */
export function useMyRolePermissions(communityId: string, userId: string | undefined, baseRole: string | undefined) {
  const links = useQuery(memberRolesQuery(communityId));
  const mine = (links.data ?? []).filter((l) => l.user_id === userId).map((l) => l.role?.permissions ?? []);
  const set = new Set(mine.flat());
  const elevated = baseRole === "owner" || baseRole === "admin";
  return {
    has: (key: string) => elevated || set.has(key),
    keys: elevated ? ROLE_PERMISSIONS.map((p) => p.key) : Array.from(set),
  };
}
