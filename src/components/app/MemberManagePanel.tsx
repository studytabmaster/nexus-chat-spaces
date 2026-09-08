import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Clock, LogOut, Ban, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { moderateMember, transferOwnership, TIMEOUT_PRESETS, type ModAction } from "@/lib/moderation";
import type { Member } from "@/lib/queries";
import { shortDate } from "@/lib/format";

type Role = "owner" | "admin" | "moderator" | "member";

const ROLE_LABEL: Record<Role, string> = {
  owner: "オーナー",
  admin: "管理者",
  moderator: "モデレーター",
  member: "メンバー",
};

export function MemberManagePanel({
  communityId,
  member,
  myRole,
}: {
  communityId: string;
  member: Member & { muted_until?: string | null };
  myRole: Role;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [confirm, setConfirm] = useState<null | { action: ModAction; title: string; body: string }>(null);

  const targetRole = member.role as Role;
  const isOwnerTarget = targetRole === "owner";
  const canAct =
    !isOwnerTarget &&
    (myRole === "owner" ||
      (myRole === "admin" && targetRole !== "admin") ||
      (myRole === "moderator" && targetRole === "member"));
  const canRemove = !isOwnerTarget && (myRole === "owner" || (myRole === "admin" && targetRole !== "admin"));
  const muted = member.muted_until && new Date(member.muted_until) > new Date() ? member.muted_until : null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["members", communityId] });
    qc.invalidateQueries({ queryKey: ["bans", communityId] });
    qc.invalidateQueries({ queryKey: ["audit-logs", communityId] });
    qc.invalidateQueries({ queryKey: ["mod-history", communityId] });
  };

  const act = useMutation({
    mutationFn: (action: ModAction) =>
      moderateMember({ communityId, userId: member.user_id, action, reason, minutes }),
    onSuccess: () => {
      toast.success("変更を保存しました");
      setReason("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async (role: Role) => {
      const { error } = await supabase
        .from("community_members")
        .update({ role })
        .eq("community_id", communityId)
        .eq("user_id", member.user_id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        community_id: communityId,
        actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        action: "role_change",
        target: member.user_id,
        detail: ROLE_LABEL[role],
      });
    },
    onSuccess: () => {
      toast.success("ロールを変更しました");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: () => transferOwnership(communityId, member.user_id),
    onSuccess: () => {
      toast.success("オーナーを移譲しました");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <UserAvatar name={member.profile.display_name} avatarUrl={member.profile.avatar_url} status={member.profile.status} showStatus />
        <div className="min-w-0">
          <p className="truncate font-semibold">{member.profile.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{member.profile.username} ・ {shortDate(member.joined_at)} 参加 ・ {ROLE_LABEL[targetRole]}
          </p>
          {muted && <p className="text-xs text-destructive">タイムアウト中（{new Date(muted).toLocaleString("ja-JP")} まで）</p>}
        </div>
      </div>

      {isOwnerTarget ? (
        <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
          オーナーは管理操作の対象にできません。
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label>ロール</Label>
            <Select
              value={targetRole}
              onValueChange={(v) => changeRole.mutate(v as Role)}
              disabled={myRole !== "owner" && myRole !== "admin"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">メンバー</SelectItem>
                <SelectItem value="moderator">モデレーター</SelectItem>
                <SelectItem value="admin">管理者</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>理由（記録されます）</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：スパム行為" />
          </div>

          <div className="space-y-1.5">
            <Label>タイムアウト期間</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIMEOUT_PRESETS.map((p) => (
                <Button
                  key={p.minutes}
                  size="sm"
                  variant={minutes === p.minutes ? "default" : "secondary"}
                  onClick={() => setMinutes(p.minutes)}
                >
                  {p.label}
                </Button>
              ))}
              <Input
                className="h-8 w-24"
                inputMode="numeric"
                value={String(minutes)}
                onChange={(e) => setMinutes(Number(e.target.value.replace(/\D/g, "")) || 0)}
                aria-label="カスタム（分）"
              />
              <span className="self-center text-xs text-muted-foreground">分</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" disabled={!canAct || act.isPending} onClick={() => act.mutate("warn")}>
              <AlertTriangle className="mr-1.5 size-4" /> 警告
            </Button>
            {muted ? (
              <Button variant="secondary" disabled={!canAct || act.isPending} onClick={() => act.mutate("untimeout")}>
                <Clock className="mr-1.5 size-4" /> タイムアウト解除
              </Button>
            ) : (
              <Button variant="secondary" disabled={!canAct || act.isPending} onClick={() => act.mutate("timeout")}>
                <Clock className="mr-1.5 size-4" /> タイムアウト
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!canRemove || act.isPending}
              onClick={() => setConfirm({ action: "kick", title: "キックしますか？", body: "このメンバーはコミュニティから退出します。再参加は可能です。" })}
            >
              <LogOut className="mr-1.5 size-4" /> キック
            </Button>
            <Button
              variant="destructive"
              disabled={!canRemove || act.isPending}
              onClick={() => setConfirm({ action: "ban", title: "BANしますか？", body: "このユーザーは再参加できなくなります。この操作は管理画面から解除できます。" })}
            >
              <Ban className="mr-1.5 size-4" /> BAN
            </Button>
          </div>

          {myRole === "owner" && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setConfirm({ action: "warn", title: "オーナーを移譲しますか？", body: "あなたは管理者になります。この操作は取り消せません。" })}
              data-transfer
            >
              <Crown className="mr-1.5 size-4" /> オーナーを移譲
            </Button>
          )}
        </>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm.title.startsWith("オーナー")) transfer.mutate();
                else act.mutate(confirm.action);
                setConfirm(null);
              }}
            >
              実行する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
