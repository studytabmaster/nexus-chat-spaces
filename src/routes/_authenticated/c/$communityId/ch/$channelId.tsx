import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChatView, type ChatMessage } from "@/components/app/ChatView";
import { ThreadPanel } from "@/components/app/ThreadPanel";
import { VoiceChannelView } from "@/components/app/VoiceChannelView";
import { channelsQuery, membersQuery } from "@/lib/queries";
import { useMembership } from "@/components/app/JoinButton";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Hash, Lock, Archive } from "lucide-react";

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
  const canModerate = role === "owner" || role === "admin" || role === "moderator";
  const locked = channel.locked || channel.archived;
  const canPost = !!role && (!locked || canModerate);
  const memberProfiles = members.data?.map((m) => m.profile);
  const categoryName = data.data?.categories.find((k) => k.id === channel.category_id)?.name;
  const subtitle = [channel.topic || null, categoryName || null].filter(Boolean).join(" · ") || undefined;

  if (channel.type === "voice") {
    return <VoiceChannelView name={channel.name} topic={channel.topic} isMember={!!role} />;
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1">
        <ChatView
          key={channelId}
          source={{ kind: "channel", channelId, communityId, canPost, canModerate }}
          title={channel.name}
          subtitle={subtitle}
          members={memberProfiles}
          onOpenThread={(m) => setThread(m)}
          postDisabledNote={
            !role
              ? undefined
              : channel.archived
                ? "このチャンネルはアーカイブされています（閲覧のみ）"
                : "このチャンネルはロックされています（閲覧のみ）"
          }
          headerExtra={
            channel.archived ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Archive className="size-3.5" /> アーカイブ
              </span>
            ) : channel.locked ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> ロック中
              </span>
            ) : null
          }
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
