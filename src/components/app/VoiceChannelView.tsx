import { useState } from "react";
import { Volume2, Mic, MicOff, Headphones, HeadphoneOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/app/UserAvatar";
import { useMe } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** ボイスチャンネルの画面（接続UIのみ。音声通話機能は未実装） */
export function VoiceChannelView({ name, topic, isMember }: { name: string; topic: string; isMember: boolean }) {
  const me = useMe();
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Volume2 className="size-4 text-muted-foreground" />
        <h1 className="truncate font-bold">{name}</h1>
        {topic && <span className="hidden truncate text-sm text-muted-foreground sm:inline">— {topic}</span>}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {connected ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex w-28 flex-col items-center gap-2">
                <div className={cn("rounded-full p-1 ring-2", muted ? "ring-muted" : "ring-primary")}>
                  <UserAvatar name={me.data?.display_name ?? "あなた"} avatarUrl={me.data?.avatar_url} size="lg" />
                </div>
                <span className="truncate text-sm font-medium">{me.data?.display_name ?? "あなた"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">接続中です。ほかのメンバーが参加するとここに表示されます。</p>
            <div className="flex items-center gap-2">
              <Button variant={muted ? "default" : "secondary"} size="icon" onClick={() => setMuted((v) => !v)} aria-label="マイク">
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button variant={deafened ? "default" : "secondary"} size="icon" onClick={() => setDeafened((v) => !v)} aria-label="スピーカー">
                {deafened ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
              </Button>
              <Button variant="destructive" onClick={() => setConnected(false)} className="gap-2">
                <PhoneOff className="size-4" /> 退出
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-20 items-center justify-center rounded-full bg-muted">
              <Volume2 className="size-9 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{name}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {isMember ? "ボイスチャンネルに参加できます。" : "参加するにはコミュニティに参加してください。"}
              </p>
            </div>
            <Button disabled={!isMember} onClick={() => setConnected(true)} className="gap-2">
              <Mic className="size-4" /> 接続する
            </Button>
            <p className="text-xs text-muted-foreground">※音声通話そのものは今後のアップデートで有効になります。</p>
          </>
        )}
      </div>
    </div>
  );
}
