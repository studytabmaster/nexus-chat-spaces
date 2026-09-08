import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useSignedUrl } from "@/lib/storage";

const palette = [
  "from-[oklch(0.6_0.19_262)] to-[oklch(0.62_0.2_295)]",
  "from-[oklch(0.62_0.17_200)] to-[oklch(0.6_0.19_262)]",
  "from-[oklch(0.65_0.18_330)] to-[oklch(0.62_0.2_295)]",
  "from-[oklch(0.68_0.16_150)] to-[oklch(0.62_0.17_200)]",
  "from-[oklch(0.72_0.16_60)] to-[oklch(0.65_0.18_330)]",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function CommunityIcon({
  name,
  id,
  iconUrl,
  className,
}: {
  name: string;
  id: string;
  iconUrl?: string | null;
  className?: string;
}) {
  const { data: url } = useSignedUrl(iconUrl);
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br font-extrabold text-primary-foreground",
        palette[hash(id) % palette.length],
        className,
      )}
    >
      {url ? <img src={url} alt={name} className="size-full object-cover" /> : initials(name)}
    </div>
  );
}
