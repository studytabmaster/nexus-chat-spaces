import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { UserAvatar } from "@/components/app/UserAvatar";
import { membersQuery } from "@/lib/queries";
import { ROLE_PERMISSIONS, communityRolesQuery, memberRolesQuery, groupMemberRoles, useRoleAdmin, type CommunityRole } from "@/lib/roles";

/** カスタムロールの作成・編集・付与 */
export function RoleManager({ communityId }: { communityId: string }) {
  const roles = useQuery(communityRolesQuery(communityId));
  const links = useQuery(memberRolesQuery(communityId));
  const members = useQuery(membersQuery(communityId));
  const admin = useRoleAdmin(communityId);
  const [editing, setEditing] = useState<CommunityRole | null>(null);
  const [open, setOpen] = useState(false);

  if (roles.isLoading) return <LoadingState />;
  if (roles.isError) return <ErrorState message={roles.error.message} onRetry={() => roles.refetch()} />;

  const byUser = groupMemberRoles(links.data);
  const list = roles.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">カスタムロール</p>
          <p className="text-sm text-muted-foreground">色・アイコン・優先順位・権限を設定できます</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-1 size-4" /> ロールを作成
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "ロールを編集" : "ロールを作成"}</DialogTitle>
            </DialogHeader>
            <RoleForm
              key={editing?.id ?? "new"}
              role={editing}
              nextPosition={(list[0]?.position ?? 0) + 1}
              onSubmit={async (input) => {
                try {
                  if (editing) await admin.update.mutateAsync({ id: editing.id, ...input });
                  else await admin.create.mutateAsync(input);
                  toast.success(editing ? "ロールを更新しました" : "ロールを作成しました");
                  setOpen(false);
                  setEditing(null);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              pending={admin.create.isPending || admin.update.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {list.length === 0 && <EmptyState icon={Shield} title="ロールがありません" body="ロールを作成してメンバーに付与できます。" />}

      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm font-semibold"
                style={{ color: r.color, borderColor: r.color }}
              >
                {r.icon && <span>{r.icon}</span>}
                {r.name}
              </span>
              <span className="text-xs text-muted-foreground">優先順位 {r.position}</span>
              <span className="text-xs text-muted-foreground">権限 {r.permissions.length}件</span>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  編集
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="ロールを削除"
                  onClick={() => {
                    if (!confirm(`ロール「${r.name}」を削除しますか？`)) return;
                    admin.remove.mutate(r.id, {
                      onSuccess: () => toast.success("ロールを削除しました"),
                      onError: (e) => toast.error(e.message),
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {r.permissions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ROLE_PERMISSIONS.filter((p) => r.permissions.includes(p.key)).map((p) => (
                  <span key={p.key} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {list.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold">メンバーへの付与</p>
          {members.isLoading && <LoadingState />}
          {(members.data ?? []).map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <UserAvatar name={m.profile?.display_name ?? "?"} avatarUrl={m.profile?.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium">{m.profile?.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{m.profile?.username}</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {list.map((r) => {
                  const on = (byUser[m.user_id] ?? []).some((x) => x.id === r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() =>
                        admin.assign.mutate(
                          { roleId: r.id, userId: m.user_id, on: !on },
                          { onError: (e) => toast.error(e.message) },
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                      style={on ? { background: r.color, color: "#fff", borderColor: r.color } : { color: r.color, borderColor: r.color }}
                    >
                      {on && <Check className="size-3" />}
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleForm({
  role,
  nextPosition,
  onSubmit,
  pending,
}: {
  role: CommunityRole | null;
  nextPosition: number;
  onSubmit: (input: { name: string; color: string; icon: string; permissions: string[]; position: number }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [color, setColor] = useState(role?.color ?? "#7c5cff");
  const [icon, setIcon] = useState(role?.icon ?? "");
  const [position, setPosition] = useState(role?.position ?? nextPosition);
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>ロール名</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: モデレーター" />
        </div>
        <div className="space-y-1.5">
          <Label>アイコン（絵文字）</Label>
          <Input value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} placeholder="例: 🛡" />
        </div>
        <div className="space-y-1.5">
          <Label>色</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1" />
        </div>
        <div className="space-y-1.5">
          <Label>優先順位（大きいほど上）</Label>
          <Input type="number" value={position} onChange={(e) => setPosition(Number(e.target.value) || 0)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>権限</Label>
        {ROLE_PERMISSIONS.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
            <Switch
              checked={permissions.includes(p.key)}
              onCheckedChange={(v) => setPermissions((prev) => (v ? [...prev, p.key] : prev.filter((k) => k !== p.key)))}
            />
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={pending || !name.trim()}
        onClick={() => onSubmit({ name: name.trim(), color, icon: icon.trim(), permissions, position })}
      >
        {role ? "保存" : "作成"}
      </Button>
    </div>
  );
}
