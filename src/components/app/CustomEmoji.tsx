import { Smile } from "lucide-react";
import { useSignedUrl } from "@/lib/storage";
import { useCustomEmojis, type CustomEmoji as Emoji } from "@/lib/community-extras";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function EmojiImage({ emoji, className = "inline size-5 align-text-bottom" }: { emoji: Emoji; className?: string }) {
  const { data: url } = useSignedUrl(emoji.image_url);
  if (!url) return <span className="text-muted-foreground">:{emoji.name}:</span>;
  return <img src={url} alt={`:${emoji.name}:`} title={`:${emoji.name}:`} className={className} loading="lazy" />;
}

/** メッセージ本文の :name: をコミュニティのカスタム絵文字画像に置き換える */
export function renderEmojiParts(text: string, emojis: Emoji[]) {
  if (emojis.length === 0) return [text];
  const byName = new Map(emojis.map((e) => [e.name, e]));
  return text.split(/(:[a-zA-Z0-9_]+:)/g).map((part) => {
    const m = /^:([a-zA-Z0-9_]+):$/.exec(part);
    const emoji = m?.[1] ? byName.get(m[1]) : undefined;
    return emoji ?? part;
  });
}

export function CustomEmojiPicker({ communityId, onPick }: { communityId: string; onPick: (token: string) => void }) {
  const emojis = useCustomEmojis(communityId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="カスタム絵文字">
          <Smile className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {emojis.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">このコミュニティにはカスタム絵文字がまだありません。</p>
        ) : (
          <div className="flex max-h-56 flex-wrap gap-1 overflow-y-auto">
            {emojis.map((e) => (
              <button
                key={e.id}
                type="button"
                className="rounded-md p-1.5 hover:bg-accent"
                onClick={() => onPick(`:${e.name}:`)}
                aria-label={`:${e.name}:`}
              >
                <EmojiImage emoji={e} className="size-6" />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
