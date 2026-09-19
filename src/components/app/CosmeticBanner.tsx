import { useSignedUrl } from "@/lib/storage";
import { backgroundStyle, safeImage } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";

/** 装備中の背景アイテムを帯として表示する */
export function CosmeticBanner({
  background,
  backgroundImage,
  className,
}: {
  background?: string | null | undefined;
  backgroundImage?: string | null | undefined;
  className?: string;
}) {
  const { data: url } = useSignedUrl(safeImage(backgroundImage));
  const style = backgroundStyle(background, url);
  if (!style) return null;
  return <div className={cn("w-full", className)} style={style} />;
}

/** 装備中の背景があるか（レイアウト調整用） */
export function hasCosmeticBackground(
  background?: string | null | undefined,
  backgroundImage?: string | null | undefined,
) {
  return !!backgroundStyle(background, safeImage(backgroundImage) ? "x" : null);
}
