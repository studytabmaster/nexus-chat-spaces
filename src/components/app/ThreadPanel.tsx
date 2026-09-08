import { X } from "lucide-react";
import { ChatView, type ChatMessage } from "./ChatView";
import { UserAvatar } from "./UserAvatar";
import { chatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/queries";

/** PCでは右パネル、スマホでは専用画面として同じロジックを再利用する。 */
export function ThreadPanel({
  root,
  communityId,
  channelId,
  canPost,
  canModerate,
  members,
  onClose,
}: {
  root: ChatMessage;
  communityId: string;
  channelId: string;
  canPost: boolean;
  canModerate: boolean;
  members?: Profile[] | undefined;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <h2 className="font-bold">スレッド</h2>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="スレッドを閉じる">
          <X className="size-4" />
        </Button>
      </header>

      <div className="shrink-0 border-b bg-card px-3 py-3">
        <div className="flex gap-3">
          <UserAvatar name={root.author?.display_name ?? ""} avatarUrl={root.author?.avatar_url ?? null} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2">
              <span className="text-sm font-bold">{root.author?.display_name ?? "Unknown"}</span>
              <span className="text-[11px] text-muted-foreground">{chatTime(root.created_at)}</span>
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{root.content}</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatView
          key={root.id}
          compact
          threadRootId={root.id}
          source={{ kind: "channel", channelId, communityId, canPost, canModerate }}
          title="スレッド"
          members={members}
        />
      </div>
    </div>
  );
}
