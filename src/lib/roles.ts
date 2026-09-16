import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** カスタムロールで設定できる権限 */
export const ROLE_PERMISSIONS: { key: string; label: string; description: string }[] = [
  { key: "manage_channels", label: "チャンネル管理", description: "チャンネルやカテゴリーの作成・編集・削除" },
  { key: "manage_messages", label: "メッセージ管理", description: "他のメンバーのメッセージの削除・ピン留め" },
  { key: "manage_events", label: "イベント管理", description: "イベントや投票の作成・編集" },
  { key: "manage_members", label: "メンバー管理", description: "警告・タイムアウト・キック・BAN" },
  { key: "manage_roles", label: "ロール管理", description: "ロールの作成・編集とメンバーへの付与" },
  { key: "mention_everyone", label: "全員メンション", description: "@everyone / @here を使える" },
  { key: "view_audit_log", label: "監査ログの閲覧", description: "コミュニティの操作履歴を見られる" },
];

export type CommunityRole = {
  id: string;
  community_id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  permissions: string[];
  created_at: string;
};

export type MemberRoleLink = {
  id: string;
  role_id: string;
  user_id: string;
  role: CommunityRole | null;
};

export function communityRolesQuery(communityId: string) {
  return queryOptions({
    queryKey: ["community-roles", communityId],
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
    queryFn: async (): Promise<MemberRoleLink[]> => {
      const { data, error } = await supabase
        .from("community_member_roles")
        .select("id, role_id, user_id, role:community_roles(*)")
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
