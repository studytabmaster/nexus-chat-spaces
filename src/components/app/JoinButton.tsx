import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import type { Community } from "@/lib/queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function useMembership(communityId: string) {
  const me = useMe();
  return useQuery({
    queryKey: ["membership", communityId, me.data?.id],
    enabled: !!me.data,
    queryFn: async () => {
      const [m, r] = await Promise.all([
        supabase.from("community_members").select("role").eq("community_id", communityId).eq("user_id", me.data!.id).maybeSingle(),
        supabase.from("join_requests").select("status").eq("community_id", communityId).eq("user_id", me.data!.id).maybeSingle(),
      ]);
      if (m.error) throw m.error;
      return { role: m.data?.role ?? null, request: r.data?.status ?? null };
    },
  });
}

export function JoinButton({
  community,
  size = "default",
  navigateOnJoin = false,
}: {
  community: Pick<Community, "id" | "join_policy" | "name">;
  size?: "sm" | "default" | "lg";
  navigateOnJoin?: boolean;
}) {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const membership = useMembership(community.id);
  const [askOpen, setAskOpen] = useState(false);
  const [message, setMessage] = useState("");

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: community.id, user_id: me.data!.id, role: "member" });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(`${community.name} に参加しました`);
      await qc.invalidateQueries({ queryKey: ["membership", community.id] });
      await qc.invalidateQueries({ queryKey: ["communities"] });
      await qc.invalidateQueries({ queryKey: ["members", community.id] });
      if (navigateOnJoin) {
        const { data } = await supabase.from("channels").select("id").eq("community_id", community.id).order("position").limit(1).maybeSingle();
        if (data) navigate({ to: "/c/$communityId/ch/$channelId", params: { communityId: community.id, channelId: data.id } });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("join_requests").insert({ community_id: community.id, user_id: me.data!.id, message });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("参加申請を送りました");
      setAskOpen(false);
      qc.invalidateQueries({ queryKey: ["membership", community.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!membership.data) return <Button size={size} variant="secondary" disabled>…</Button>;
  if (membership.data.role)
    return (
      <Button size={size} variant="secondary" disabled className="gap-1">
        <Check className="size-3.5" /> 参加中
      </Button>
    );
  if (membership.data.request === "PENDING")
    return (
      <Button size={size} variant="secondary" disabled className="gap-1">
        <Clock className="size-3.5" /> 申請中
      </Button>
    );

  if (community.join_policy === "request")
    return (
      <>
        <Button size={size} onClick={() => setAskOpen(true)}>
          参加を申請
        </Button>
        <Dialog open={askOpen} onOpenChange={setAskOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{community.name} に参加申請</DialogTitle>
            </DialogHeader>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ひとこと（任意）" rows={3} />
            <Button onClick={() => request.mutate()} disabled={request.isPending}>
              申請を送る
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );

  return (
    <Button size={size} onClick={() => join.mutate()} disabled={join.isPending}>
      Join
    </Button>
  );
}
