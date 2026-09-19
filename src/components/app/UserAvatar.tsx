import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { STATUS_COLOR } from "@/lib/constants";
import { useSignedUrl } from "@/lib/storage";
import { frameStyle, safeImage } from "@/lib/cosmetics";

type Props = {
  name: string;
  avatarUrl?: string | null | undefined;
  status?: string | null | undefined;
  showStatus?: boolean | undefined;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** ショップで装備中のフレーム（色やグラデーション） */
  frame?: string | null | undefined;
  /** ショップで装備中のフレーム画像 */
  frameImage?: string | null | undefined;
};

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
};

export function UserAvatar({
  name,
  avatarUrl,
  status,
  showStatus,
  className,
  size = "md",
  frame,
  frameImage,
}: Props) {
  const { data: url } = useSignedUrl(avatarUrl);
  const { data: frameUrl } = useSignedUrl(safeImage(frameImage));
  const style = frameStyle(frame, frameUrl);
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <span className="block" style={style}>
        <Avatar className={cn(sizes[size], "rounded-xl", style && "bg-card")}>
          {url && <AvatarImage src={url} alt={name} className="object-cover" />}
          <AvatarFallback className="rounded-xl bg-accent font-bold text-accent-foreground">{initials(name)}</AvatarFallback>
        </Avatar>
      </span>
      {showStatus && (
        <span className={cn("status-dot absolute -bottom-0.5 -right-0.5", STATUS_COLOR[status ?? "offline"] ?? "bg-offline")} />
      )}
    </span>
  );
}
