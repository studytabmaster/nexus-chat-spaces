import type { ElementType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, MessageSquare, UserPlus, Heart, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { notificationsQuery } from "@/lib/queries";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Nexa" },
      { name: "description", content: "あなたへの通知一覧。" },
      { property: "og:title", content: "Notifications — Nexa" },
      { property: "og:description", content: "あなたへの通知一覧。" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<string, React.ElementType> = {
  message: MessageSquare,
  mention: AtSign,
  reaction: Heart,
  join: UserPlus,
  default: Bell,
};

function NotificationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const notifications = useQuery(notificationsQuery(me.data?.id ?? ""));

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", me.data?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", me.data!.id).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", me.data?.id] }),
  });

  if (!me.data) return <LoadingState />;
  if (notifications.isLoading) return <LoadingState />;
  if (notifications.isError) return <ErrorState message={notifications.error.message} onRetry={() => notifications.refetch()} />;

  const unreadCount = notifications.data?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader
          title="Notifications"
          subtitle="あなたへの通知"
          actions={
            unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
                <Check className="mr-1 size-3.5" /> すべて既読
              </Button>
            )
          }
        />

        {notifications.data?.length === 0 && (
          <EmptyState icon={Bell} title="通知はありません" body="新しい通知が届くとここに表示されます。" />
        )}

        <div className="space-y-2">
          {notifications.data?.map((n) => {
            const Icon = ICONS[n.type] ?? ICONS["default"];
            if (!Icon) return null;
            const content = (
              <div
                className={`flex items-start gap-3 rounded-xl border p-3 transition hover:bg-surface-hover ${
                  !n.read ? "bg-card" : "bg-muted/30"
                }`}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {n.actor && (
                      <span className="font-semibold">{n.actor.display_name}</span>
                    )}{" "}
                    {n.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>
                    既読
                  </Button>
                )}
              </div>
            );
            if (n.link) {
              return (
                <Link key={n.id} to={n.link as any} className="block">
                  {content}
                </Link>
              );
            }
            return <div key={n.id}>{content}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
