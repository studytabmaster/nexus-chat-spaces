import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, MapPin, LinkIcon, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useMembership } from "@/components/app/JoinButton";
import { eventsQuery, RSVP_LABEL, type CommunityEvent, type RsvpStatus } from "@/lib/events";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { chatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { recordActivity } from "@/lib/points";

export const Route = createFileRoute("/_authenticated/c/$communityId/events")({
  head: () => ({
    meta: [
      { title: "イベント — Nexa" },
      { name: "description", content: "コミュニティの開催予定イベントと過去のイベント。" },
      { property: "og:title", content: "イベント — Nexa" },
      { property: "og:description", content: "開催予定と過去のイベントを確認して参加登録できます。" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { communityId } = Route.useParams();
  const events = useQuery(eventsQuery(communityId));
  const membership = useMembership(communityId);
  const role = membership.data?.role ?? null;
  const canCreate = role === "owner" || role === "admin" || role === "moderator";
  const [tab, setTab] = useState("upcoming");

  const now = Date.now();
  const list = (events.data ?? []).filter((e) =>
    tab === "upcoming" ? new Date(e.starts_at).getTime() >= now : new Date(e.starts_at).getTime() < now,
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader
          title="イベント"
          subtitle="コミュニティの予定"
          actions={canCreate ? <CreateEventDialog communityId={communityId} /> : undefined}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">開催予定</TabsTrigger>
            <TabsTrigger value="past">過去のイベント</TabsTrigger>
          </TabsList>
        </Tabs>

        {events.isLoading && <LoadingState />}
        {events.isError && <ErrorState message={events.error.message} onRetry={() => events.refetch()} />}
        {events.data && list.length === 0 && (
          <EmptyState icon={CalendarDays} title="イベントはありません" body="予定が追加されるとここに表示されます。" />
        )}

        <div className="grid gap-3">
          {list.map((e) => (
            <EventCard key={e.id} event={e} communityId={communityId} isMember={!!role} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EventCard({
  event,
  communityId,
  isMember,
}: {
  event: CommunityEvent;
  communityId: string;
  isMember: boolean;
}) {
  const me = useMe();
  const qc = useQueryClient();
  const mine = event.rsvps.find((r) => r.user_id === me.data?.id);
  const going = event.rsvps.filter((r) => r.status === "going").length;

  const rsvp = useMutation({
    mutationFn: async (status: RsvpStatus) => {
      if (!me.data) throw new Error("サインインしてください");
      if (mine) {
        const { error } = await supabase.from("event_rsvps").update({ status }).eq("id", mine.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("event_rsvps")
        .insert({ event_id: event.id, user_id: me.data.id, status });
      if (error) throw error;
      await recordActivity("event_rsvp", event.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", communityId] });
      toast.success("変更を保存しました");
    },
    onError: () => toast.error("この操作を実行する権限がありません。"),
  });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {event.image_url && <img src={event.image_url} alt={event.title} loading="lazy" className="h-40 w-full object-cover" />}
      <div className="p-4">
        <p className="text-xs font-medium text-primary">{chatTime(event.starts_at)}</p>
        <h3 className="mt-1 text-lg font-bold">{event.title}</h3>
        {event.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {event.location}
            </span>
          )}
          {event.url && (
            <a href={event.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <LinkIcon className="size-3" /> リンク
            </a>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" /> 参加 {going}
            {event.capacity ? ` / 定員 ${event.capacity}` : ""}
          </span>
        </div>
        {isMember && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(["going", "maybe", "declined"] as RsvpStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={mine?.status === s ? "default" : "secondary"}
                onClick={() => rsvp.mutate(s)}
                disabled={rsvp.isPending}
                className={cn(mine?.status === s && "ring-1 ring-primary")}
              >
                {RSVP_LABEL[s]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEventDialog({ communityId }: { communityId: string }) {
  const me = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location: "",
    url: "",
    image_url: "",
    capacity: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("タイトルを入力してください。");
      if (!form.starts_at) throw new Error("日時を入力してください。");
      const { error } = await supabase.from("events").insert({
        community_id: communityId,
        title: form.title.trim(),
        description: form.description.trim(),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        location: form.location.trim() || null,
        url: form.url.trim() || null,
        image_url: form.image_url.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        created_by: me.data!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", communityId] });
      toast.success("イベントを作成しました");
      setOpen(false);
      setForm({ title: "", description: "", starts_at: "", ends_at: "", location: "", url: "", image_url: "", capacity: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 size-4" /> イベントを作成
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>イベントを作成</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="タイトル">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="説明">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="開始日時">
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </Field>
            <Field label="終了日時（任意）">
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </Field>
          </div>
          <Field label="場所（任意）">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="URL（任意）">
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="画像URL（任意）">
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="定員（任意）">
            <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
            作成する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
