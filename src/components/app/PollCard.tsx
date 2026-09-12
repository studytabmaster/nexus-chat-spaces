import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Plus, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { isPollOpen, type Poll } from "@/lib/events";
import { chatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { recordActivity } from "@/lib/points";

export function PollCard({ poll, onChanged }: { poll: Poll; onChanged?: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const open = isPollOpen(poll);
  const myVotes = poll.votes.filter((v) => v.user_id === me.data?.id);
  const total = new Set(poll.votes.map((v) => v.user_id)).size;
  const canClose = poll.created_by === me.data?.id;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["polls"] });
    onChanged?.();
  };

  const vote = useMutation({
    mutationFn: async (optionId: string) => {
      if (!me.data) throw new Error("サインインしてください");
      const mine = myVotes.find((v) => v.option_id === optionId);
      if (mine) {
        const { error } = await supabase.from("poll_votes").delete().eq("id", mine.id);
        if (error) throw error;
        return;
      }
      if (!poll.multiple && myVotes.length) {
        const { error } = await supabase
          .from("poll_votes")
          .delete()
          .in(
            "id",
            myVotes.map((v) => v.id),
          );
        if (error) throw error;
      }
      const { error } = await supabase
        .from("poll_votes")
        .insert({ poll_id: poll.id, option_id: optionId, user_id: me.data.id });
      if (!error) await recordActivity("poll_vote", poll.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("投票できませんでした。"),
  });

  const close = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("polls").update({ closed: true }).eq("id", poll.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("投票を締め切りました");
    },
    onError: () => toast.error("この操作を実行する権限がありません。"),
  });

  return (
    <div className="mt-2 max-w-md rounded-xl border bg-card p-3">
      <p className="flex items-start gap-2 text-sm font-semibold">
        <BarChart3 className="mt-0.5 size-4 shrink-0 text-primary" />
        {poll.question}
      </p>
      <div className="mt-2 space-y-1.5">
        {[...poll.options]
          .sort((a, b) => a.position - b.position)
          .map((o) => {
            const count = poll.votes.filter((v) => v.option_id === o.id).length;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const mine = myVotes.some((v) => v.option_id === o.id);
            return (
              <button
                key={o.id}
                disabled={!open || vote.isPending}
                onClick={() => vote.mutate(o.id)}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  mine ? "border-primary/60 bg-primary/10" : "hover:bg-accent",
                  !open && "cursor-default opacity-90",
                )}
              >
                <span className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${pct}%` }} />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="truncate">{o.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {count}票 / {pct}%
                  </span>
                </span>
              </button>
            );
          })}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{total}人が投票</span>
        {poll.multiple && <span>・複数選択可</span>}
        {poll.closes_at && <span>・締切 {chatTime(poll.closes_at)}</span>}
        {!open && (
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" />
            締め切り済み
          </span>
        )}
        {open && canClose && (
          <button className="ml-auto text-primary hover:underline" onClick={() => close.mutate()}>
            投票を締め切る
          </button>
        )}
      </div>
    </div>
  );
}

export function CreatePollDialog({
  trigger,
  communityId,
  channelId,
  onCreate,
}: {
  trigger: React.ReactNode;
  communityId: string;
  channelId?: string | undefined;
  /** 投票と紐づけるメッセージ/投稿を作る処理。作成したIDを返す。 */
  onCreate?: ((question: string) => Promise<{ messageId?: string; postId?: string }>) | undefined;
}) {
  const me = useMe();
  const qc = useQueryClient();
  const [openState, setOpenState] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const q = question.trim();
      const opts = options.map((o) => o.trim()).filter(Boolean);
      if (!q) throw new Error("質問を入力してください。");
      if (opts.length < 2) throw new Error("選択肢は2つ以上必要です。");
      const linked = onCreate ? await onCreate(q) : {};
      const { data, error } = await supabase
        .from("polls")
        .insert({
          community_id: communityId,
          channel_id: channelId ?? null,
          message_id: linked.messageId ?? null,
          post_id: linked.postId ?? null,
          question: q,
          multiple,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
          created_by: me.data!.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: oe } = await supabase
        .from("poll_options")
        .insert(opts.map((label, position) => ({ poll_id: data.id, label, position })));
      if (oe) throw oe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polls"] });
      qc.invalidateQueries({ queryKey: ["chat"] });
      toast.success("投票を作成しました");
      setOpenState(false);
      setQuestion("");
      setOptions(["", ""]);
      setMultiple(false);
      setClosesAt("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={openState} onOpenChange={setOpenState}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>投票を作成</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>質問</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例: 次回の開催日は？" />
          </div>
          <div className="space-y-1.5">
            <Label>選択肢</Label>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={o}
                  onChange={(e) => setOptions((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`選択肢 ${i + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="選択肢を削除"
                    onClick={() => setOptions((s) => s.filter((_, j) => j !== i))}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setOptions((s) => [...s, ""])}>
              <Plus className="mr-1 size-4" /> 選択肢を追加
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">複数選択を許可</p>
              <p className="text-xs text-muted-foreground">複数の選択肢に投票できます</p>
            </div>
            <Switch checked={multiple} onCheckedChange={setMultiple} />
          </div>
          <div className="space-y-1.5">
            <Label>締切（任意）</Label>
            <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
            投票を作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
