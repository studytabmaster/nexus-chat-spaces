import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_authenticated/invite/$code")({
  head: () => ({
    meta: [
      { title: "招待リンク — Nexa" },
      { name: "description", content: "招待リンクからコミュニティに参加します。" },
      { property: "og:title", content: "招待リンク — Nexa" },
      { property: "og:description", content: "招待リンクからコミュニティに参加します。" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const preview = useQuery({
    queryKey: ["invite-preview", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("invite_preview", { _code: code });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const join = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_invite", { _code: code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (communityId) => {
      toast.success("コミュニティに参加しました");
      await qc.invalidateQueries();
      navigate({ to: "/c/$communityId", params: { communityId } });
    },
    onError: (e) => toast.error(e.message),
  });

  if (preview.isLoading) return <LoadingState />;
  if (!preview.data)
    return (
      <div className="p-8">
        <EmptyState icon={Link2} title="招待リンクが見つかりません" body="リンクが間違っているか、削除された可能性があります。" />
      </div>
    );

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <CommunityIcon
        id={preview.data.community_id}
        name={preview.data.name}
        iconUrl={preview.data.icon_url}
        className="size-20 rounded-3xl text-2xl"
      />
      <h1 className="text-2xl font-extrabold">{preview.data.name}</h1>
      <p className="text-sm text-muted-foreground">{preview.data.description}</p>
      {preview.data.valid ? (
        <Button size="lg" className="w-full" onClick={() => join.mutate()} disabled={join.isPending}>
          参加する
        </Button>
      ) : (
        <p className="text-sm text-destructive">この招待リンクは期限切れ、または使用できません。</p>
      )}
    </div>
  );
}
