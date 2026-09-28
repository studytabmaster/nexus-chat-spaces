import { Smile, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSignedUrl } from "@/lib/storage";
import { useCustomEmojis, type CustomEmoji as Emoji } from "@/lib/community-extras";
import { myPurchasesQuery } from "@/lib/shop";
import { useMe } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 画像URLを直接渡せる汎用スタンプ表示コンポーネント
export function EmojiImage({
  emoji,
  className = "inline size-6 align-text-bottom object-contain",
}: {
  emoji: { name: string; image_url: string };
  className?: string;
}) {
  const { data: url, isLoading } = useSignedUrl(emoji.image_url);
  const [hasError, setHasError] = useState(false);

  // 1. URL取得中はパルス状の薄いスケルトンを表示してガタつきと空白を防止
  if (isLoading) {
    return <span className="inline-block size-6 animate-pulse rounded bg-muted/60 align-text-bottom" />;
  }

  // 2. 画像が見つからない・読み込み失敗時はテキストバッジをフォールバック表示
  if (!url || hasError) {
    return (
      <span className="inline-block rounded border border-muted bg-muted/40 px-1 py-0.5 text-xs text-muted-foreground align-text-bottom">
        :{emoji.name}:
      </span>
    );
  }

  // 3. 画像表示（読み込みエラーを検知）
  return (
    <img
      src={url}
      alt={`:${emoji.name}:`}
      title={`:${emoji.name}:`}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

/** 日本語・英数字・アンダースコア・ハイフンに対応したトークン置換 */
export function renderEmojiParts(text: string, emojis: { name: string; image_url: string }[]) {
  if (!text || emojis.length === 0) return [text];
  const byName = new Map(emojis.map((e) => [e.name, e]));
  
  // 日本語（ひらがな・カタカナ・漢字）を含む :token: を検出
  const tokenRegex = /(:[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+:)/g;

  return text.split(tokenRegex).map((part) => {
    const m = /^:([a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+):$/.exec(part);
    const matched = m?.[1] ? byName.get(m[1]) : undefined;
    return matched ?? part;
  });
}

/** コミュニティ絵文字 ＋ ショップ購入スタンプを表示するピッカー */
export function CustomEmojiPicker({
  communityId,
  onPick,
}: {
  communityId: string;
  onPick: (token: string) => void;
}) {
  const me = useMe();
  const communityEmojis = useCustomEmojis(communityId);
  const purchases = useQuery(myPurchasesQuery(me.data?.id));

  // ショップで購入したスタンプ・絵文字を抽出
  const ownedStickers = (purchases.data ?? [])
    .filter((p) => (p.item?.kind === "sticker" || p.item?.kind === "emoji") && p.item.image_url)
    .map((p) => ({
      id: p.id,
      name: p.item!.payload || p.item!.name,
      displayName: p.item!.name,
      image_url: p.item!.image_url!,
    }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="スタンプ・絵文字">
          <Smile className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Tabs defaultValue={ownedStickers.length > 0 ? "stickers" : "community"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stickers" className="text-xs">
              <Sparkles className="mr-1 size-3" /> マイスタンプ ({ownedStickers.length})
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs">
              絵文字 ({communityEmojis.length})
            </TabsTrigger>
          </TabsList>

          {/* マイスタンプ */}
          <TabsContent value="stickers" className="mt-2">
            {ownedStickers.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                ショップでスタンプを購入するとここに表示されます。
              </p>
            ) : (
              <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto p-1">
                {ownedStickers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex flex-col items-center rounded-lg border border-transparent p-1.5 hover:border-border hover:bg-accent"
                    onClick={() => onPick(`:${s.name}:`)}
                    title={s.displayName}
                  >
                    <EmojiImage emoji={s} className="size-10 object-contain" />
                    <span className="mt-1 w-full truncate text-center text-[10px] text-muted-foreground">
                      {s.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* コミュニティ絵文字 */}
          <TabsContent value="community" className="mt-2">
            {communityEmojis.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                コミュニティの絵文字はまだ登録されていません。
              </p>
            ) : (
              <div className="flex max-h-56 flex-wrap gap-1 overflow-y-auto p-1">
                {communityEmojis.map((e) => (
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
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
