import { Link } from "@tanstack/react-router";
import { BadgeCheck, Users } from "lucide-react";
import { CommunityIcon } from "./CommunityIcon";
import { Badge } from "@/components/ui/badge";
import type { CommunityCardData } from "@/lib/queries";
import { JoinButton } from "./JoinButton";

export function CommunityCard({ c, compact = false }: { c: CommunityCardData; compact?: boolean }) {
  return (
    <div className="group flex flex-col rounded-2xl border bg-card p-4 transition-colors hover:bg-surface-hover">
      <Link to="/c/$communityId" params={{ communityId: c.id }} className="flex items-start gap-3">
        <CommunityIcon id={c.id} name={c.name} iconUrl={c.icon_url} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-bold">{c.name}</h3>
            {c.is_verified && <BadgeCheck className="size-4 shrink-0 text-verified" aria-label="Verified" />}
          </div>
          <p className="text-xs text-muted-foreground">{c.category}</p>
        </div>
      </Link>
      {!compact && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
      {c.tags.length > 0 && !compact && (
        <div className="mt-3 flex flex-wrap gap-1">
          {c.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="rounded-md font-normal">
              #{t}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {c.member_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="status-dot bg-online" /> {c.online_count}
          </span>
        </div>
        <JoinButton community={c} size="sm" />
      </div>
    </div>
  );
}
