import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Plus, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { useMe } from "@/lib/auth";
import { membersQuery } from "@/lib/queries";
import { useMembership } from "@/components/app/JoinButton";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/c/$communityId/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Nexa" },
      { name: "description", content: "コミュニティのタスクを担当者・期限・優先度で管理。" },
      { property: "og:title", content: "Tasks — Nexa" },
      { property: "og:description", content: "コミュニティタスクボード。" },
    ],
  }),
  component: TasksPage,
});

type Status = Enums<"task_status">;
type Priority = Enums<"task_priority">;
const STATUSES: { key: Status; label: string }[] = [
  { key: "TODO", label: "TODO" },
  { key: "IN_PROGRESS", label: "IN PROGRESS" },
  { key: "DONE", label: "DONE" },
];
const PRIORITY_DOT: Record<Priority, string> = { high: "bg-dnd", medium: "bg-idle", low: "bg-offline" };

function TasksPage() {
  const { communityId } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const membership = useMembership(communityId);
  const members = useQuery(membersQuery(communityId));
  const role = membership.data?.role ?? null;
  const canManage = role === "owner" || role === "admin";

  const tasks = useQuery({
    queryKey: ["tasks", communityId],
    enabled: !!role,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(id, display_name, avatar_url)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" as Priority });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        community_id: communityId,
        title: form.title.trim(),
        description: form.description.trim(),
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        priority: form.priority,
        created_by: me.data!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("タスクを作成しました");
      setOpen(false);
      setForm({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" });
      qc.invalidateQueries({ queryKey: ["tasks", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", communityId] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", communityId] }),
    onError: (e) => toast.error(e.message),
  });

  if (membership.isLoading) return <LoadingState />;
  if (!role)
    return (
      <div className="p-8">
        <EmptyState icon={CheckSquare} title="タスクはメンバー限定です" body="コミュニティに参加するとタスクを見られます。" />
      </div>
    );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <PageHeader
          title="Tasks"
          subtitle="コミュニティのやることを整理"
          actions={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> タスク追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新しいタスク</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>タイトル</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>説明</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>担当者</Label>
                      <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">未割り当て</SelectItem>
                          {members.data?.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.profile.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>優先度</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>期限</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending}>
                    作成
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        {tasks.isLoading && <LoadingState />}
        {tasks.isError && <ErrorState message={tasks.error.message} onRetry={() => tasks.refetch()} />}
        {tasks.data && (
          <div className="grid gap-4 md:grid-cols-3">
            {STATUSES.map((s) => {
              const list = tasks.data.filter((t) => t.status === s.key);
              return (
                <div key={s.key} className="rounded-2xl border bg-card/50 p-3">
                  <h2 className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {s.label} <span>{list.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {list.map((t) => (
                      <div key={t.id} className="rounded-xl border bg-card p-3">
                        <div className="flex items-start gap-2">
                          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority])} />
                          <div className="min-w-0 flex-1">
                            <p className={cn("font-medium", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</p>
                            {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                          </div>
                          {(canManage || t.created_by === me.data?.id) && (
                            <button onClick={() => remove.mutate(t.id)} className="text-muted-foreground hover:text-destructive" aria-label="削除">
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {t.assignee ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <UserAvatar name={t.assignee.display_name} avatarUrl={t.assignee.avatar_url} size="xs" /> {t.assignee.display_name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">未割り当て</span>
                          )}
                          {t.due_date && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="size-3" /> {t.due_date}
                            </span>
                          )}
                          <div className="flex-1" />
                          <Select value={t.status} onValueChange={(v) => setStatus.mutate({ id: t.id, status: v as Status })}>
                            <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-accent px-2 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((o) => (
                                <SelectItem key={o.key} value={o.key}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    {list.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">なし</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
