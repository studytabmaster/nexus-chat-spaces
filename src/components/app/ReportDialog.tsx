import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMe } from "@/lib/auth";
import { REPORT_REASONS, submitReport, type ReportReason } from "@/lib/moderation";

export function ReportDialog({
  trigger,
  targetType,
  targetId,
  communityId,
  link,
  preview,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode;
  targetType: "message" | "user" | "community";
  targetId: string;
  communityId?: string | null;
  link?: string | null;
  preview?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const me = useMe();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      await submitReport({
        communityId: communityId ?? null,
        targetType,
        targetId,
        reporterId: me.data!.id,
        reason,
        detail,
        link: link ?? null,
        preview: preview ?? "",
      });
    },
    onSuccess: () => {
      toast.success("通報を送信しました");
      setOpen(false);
      setDetail("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>通報する</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>通報理由</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
                  <RadioGroupItem value={r.value} /> {r.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label>詳細（任意）</Label>
            <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} placeholder="状況を教えてください" />
          </div>
          <Button className="w-full" onClick={() => send.mutate()} disabled={send.isPending || !me.data}>
            通報を送信
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
