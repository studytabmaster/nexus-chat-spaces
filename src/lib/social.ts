import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import type { Profile } from "@/lib/queries";

/* ---------------- 保存済み (Saved / Bookmarks) ---------------- */

export type SavedKind = "message" | "dm_message" | "post" | "file";

export const SAVED_KIND_LABEL: Record<SavedKind, string> = {
  message: "メッセージ",
  dm_message: "DM",
  post: "投稿",
  file: "ファイル",
};

export type SavedItem = {
  id: string;
  user_id: string;
  kind: SavedKind;
  ref_id: string;
  link: string;
  preview: string;
  created_at: string;
};

export const savedQuery = (userId: string) =>
  queryOptions({
    queryKey: ["saved", userId],
    queryFn: async (): Promise<SavedItem[]> => {
      const { data, error } = await supabase
        .from("saved_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as SavedItem[];
    },
  });

/** 保存/保存解除をまとめて扱う共通フック。全画面で再利用する。 */
export function useSaved() {
  const me = useMe();
  const qc = useQueryClient();
  const userId = me.data?.id ?? "";
  const list = useQuery({ ...savedQuery(userId), enabled: !!userId });

  const isSaved = (refId: string) => !!list.data?.some((s) => s.ref_id === refId);

  const toggle = useMutation({
    mutationFn: async (item: { kind: SavedKind; refId: string; link: string; preview: string }) => {
      if (!userId) throw new Error("サインインしてください");
      const existing = list.data?.find((s) => s.ref_id === item.refId && s.kind === item.kind);
      if (existing) {
        const { error } = await supabase.from("saved_items").delete().eq("id", existing.id);
        if (error) throw error;
        return "removed" as const;
      }
      const { error } = await supabase.from("saved_items").insert({
        user_id: userId,
        kind: item.kind,
        ref_id: item.refId,
        link: item.link,
        preview: item.preview.slice(0, 200),
      });
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["saved", userId] });
      toast.success(r === "added" ? "保存しました" : "保存を解除しました");
    },
    onError: (e) => toast.error(e.message),
  });

  return { list, isSaved, toggle };
}

/* ---------------- フレンド ---------------- */

export type FriendStatus = "pending" | "accepted" | "blocked";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatus;
  created_at: string;
  requester: Profile | null;
  addressee: Profile | null;
};

const FRIEND_SELECT =
  "*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)";

export const friendshipsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["friendships", userId],
    queryFn: async (): Promise<Friendship[]> => {
      const { data, error } = await supabase
        .from("friendships")
        .select(FRIEND_SELECT)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Friendship[];
    },
  });

export function otherSide(f: Friendship, meId: string): Profile | null {
  return f.requester_id === meId ? f.addressee : f.requester;
}

export function useFriends() {
  const me = useMe();
  const qc = useQueryClient();
  const userId = me.data?.id ?? "";
  const list = useQuery({ ...friendshipsQuery(userId), enabled: !!userId });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["friendships", userId] });

  const relationWith = (otherId: string) =>
    list.data?.find(
      (f) =>
        (f.requester_id === userId && f.addressee_id === otherId) ||
        (f.addressee_id === userId && f.requester_id === otherId),
    ) ?? null;

  const request = useMutation({
    mutationFn: async (otherId: string) => {
      const { error } = await supabase.from("friendships").insert({ requester_id: userId, addressee_id: otherId });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: otherId,
        actor_id: userId,
        type: "friend_request",
        content: `${me.data?.display_name ?? ""}さんからフレンド申請が届きました`,
        link: "/friends",
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("フレンド申請を送りました");
    },
    onError: () => toast.error("フレンド申請を送信できませんでした。"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FriendStatus }) => {
      const { error } = await supabase.from("friendships").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("変更を保存しました");
    },
    onError: () => toast.error("この操作を実行する権限がありません。"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("削除しました");
    },
    onError: (e) => toast.error(e.message),
  });

  return { me, userId, list, relationWith, request, setStatus, remove };
}
