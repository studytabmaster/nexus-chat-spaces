import { Volume2, Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/app/UserAvatar";
import { useMe } from "@/lib/auth";
import { useVoiceRoom } from "@/lib/voice";
import { cn } from "@/lib/utils";

/** ボイスチャンネルの画面（WebRTCによる実際の音声通話） */
export function VoiceChannelView({
  channelId,
  name,
  topic,
  isMember,
}: {
  channelId: string;
  name: string;
  topic: string;
  isMember: boolean;
}) {
  const me = useMe();
  const voice = useVoiceRoom({
    channelId,
    me: me.data
      ? { id: me.data.id, name: me.data.display_name ?? "メンバー", avatarUrl: me.data.avatar_url }
      : null,
  });
  const connected = voice.state === "connected";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Volume2 className="size-4 text-muted-foreground" />
        <h1 className="truncate font-bold">{name}</h1>
        {topic && <span className="hidden truncate text-sm text-muted-foreground sm:inline">— {topic}</span>}
        {connected && (
          <span className="ml-auto text-xs text-muted-foreground">{voice.participants.length}人が参加中</span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {connected ? (
          <>
            <div className="flex max-w-2xl flex-wrap items-start justify-center gap-4">
              {voice.participants.map((p) => (
                <div key={p.userId} className="flex w-24 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "rounded-full p-1 ring-2 transition-colors",
                      p.speaking ? "ring-primary" : "ring-transparent",
                    )}
                  >
                    <UserAvatar name={p.name} avatarUrl={p.avatarUrl} size="lg" />
                  </div>
                  <span className="flex items-center gap-1 truncate text-sm font-medium">
                    {p.muted && <MicOff className="size-3 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{p.self ? "あなた" : p.name}</span>
                  </span>
                </div>
              ))}
            </div>
            {voice.participants.length <= 1 && (
              <p className="text-sm text-muted-foreground">ほかのメンバーが参加するとここに表示されます。</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant={voice.muted ? "default" : "secondary"}
                size="icon"
                onClick={voice.toggleMute}
                aria-label="マイク"
              >
                {voice.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button
                variant={voice.deafened ? "default" : "secondary"}
                size="icon"
                onClick={voice.toggleDeafen}
                aria-label="スピーカー"
              >
                {voice.deafened ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
              </Button>
              <Button variant="destructive" onClick={voice.disconnect} className="gap-2">
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
            {voice.error && <p className="max-w-sm text-sm text-destructive">{voice.error}</p>}
            <Button
              disabled={!isMember || voice.state === "connecting" || !me.data}
              onClick={() => void voice.connect()}
              className="gap-2"
            >
              {voice.state === "connecting" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mic className="size-4" />
              )}
              接続する
            </Button>
            <p className="text-xs text-muted-foreground">接続するとマイクの使用許可を求められます。</p>
          </>
        )}
      </div>
    </div>
  );
}
