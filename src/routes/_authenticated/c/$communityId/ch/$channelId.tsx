import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChatView, type ChatMessage } from "@/components/app/ChatView";
import { ThreadPanel } from "@/components/app/ThreadPanel";
import { channelsQuery, membersQuery } from "@/lib/queries";
import { useMembership } from "@/components/app/JoinButton";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Hash } from "lucide-react";

export const Route = createFileRoute("/_authenticated/c/$communityId/ch/$channelId")({
  head: () => ({
    meta: [
      { title: "チャンネル — Nexa" },
      { name: "description", content: "コミュニティのリアルタイムチャット。" },
      { property: "og:title", content: "チャンネル — Nexa" },
      { property: "og:description", content: "リアルタイムチャット。" },
    ],
  }),
  component: ChannelPage,
});

function ChannelPage() {
  const { communityId, channelId } = Route.useParams();
  const data = useQuery(channelsQuery(communityId));
  const members = useQuery(membersQuery(communityId));
  const membership = useMembership(communityId);
  const [thread, setThread] = useState<ChatMessage | null>(null);

  if (data.isLoading || membership.isLoading) return <LoadingState />;
  const channel = data.data?.channels.find((c) => c.id === channelId);
  if (!channel)
    return (
      <div className="p-8">
        <EmptyState icon={Hash} title="チャンネルが見つかりません" />
      </div>
    );
  const role = membership.data?.role ?? null;
  const canPost = !!role;
  const canModerate = role === "owner" || role === "admin" || role === "moderator";
  const memberProfiles = members.data?.map((m) => m.profile);

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1">
        <ChatView
          key={channelId}
          source={{ kind: "channel", channelId, communityId, canPost, canModerate }}
          title={channel.name}
          subtitle={data.data?.categories.find((k) => k.id === channel.category_id)?.name}
          members={memberProfiles}
          onOpenThread={(m) => setThread(m)}
        />
      </div>

      {thread && (
        <aside className="hidden w-96 shrink-0 border-l lg:block">
          <ThreadPanel
            root={thread}
            communityId={communityId}
            channelId={channelId}
            canPost={canPost}
            canModerate={canModerate}
            members={memberProfiles}
            onClose={() => setThread(null)}
          />
        </aside>
      )}

      <Sheet open={!!thread} onOpenChange={(o) => !o && setThread(null)}>
        <SheetContent side="right" className="w-full p-0 lg:hidden">
          <SheetTitle className="sr-only">スレッド</SheetTitle>
          {thread && (
            <ThreadPanel
              root={thread}
              communityId={communityId}
              channelId={channelId}
              canPost={canPost}
              canModerate={canModerate}
              members={memberProfiles}
              onClose={() => setThread(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
