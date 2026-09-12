import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Compass, MessageCircle, Settings, Plus, Search, Bell, Bookmark, Users, Coins, ShoppingBag, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "./UserAvatar";
import { CommunityIcon } from "./CommunityIcon";
import { CreateCommunityDialog } from "./CreateCommunityDialog";
import type { Profile } from "@/lib/auth";
import { myCommunitiesQuery } from "@/lib/queries";
import { isAdminQuery } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const items = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/dm", icon: MessageCircle, label: "DM" },
  { to: "/search", icon: Search, label: "検索" },
  { to: "/saved", icon: Bookmark, label: "保存済み" },
  { to: "/friends", icon: Users, label: "フレンド" },
  { to: "/points", icon: Coins, label: "ポイント" },
  { to: "/shop", icon: ShoppingBag, label: "公式Shop" },
] as const;

export function NavRail({ me, unread, onNavigate }: { me: Profile; unread: number; onNavigate?: () => void }) {
  const mine = useQuery(myCommunitiesQuery(me.id));
  const admin = useQuery(isAdminQuery(me.id));

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex h-full flex-col items-center gap-1 overflow-y-auto bg-rail py-3">
        <Link to="/home" onClick={onNavigate} className="mb-2">
          <Logo compact />
        </Link>
        {items.map((it) => (
          <RailLink key={it.to} to={it.to} label={it.label} onClick={onNavigate}>
            <it.icon className="size-5" />
          </RailLink>
        ))}
        <RailLink to="/notifications" label="通知" onClick={onNavigate}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </RailLink>

        <div className="my-2 h-px w-8 bg-border" />

        {mine.data?.map((c) => (
          <Tooltip key={c.id}>
            <TooltipTrigger asChild>
              <Link
                to="/c/$communityId"
                params={{ communityId: c.id }}
                onClick={onNavigate}
                className="group relative rounded-2xl transition-transform hover:scale-105"
                activeProps={{ "data-active": "true" }}
              >
                <span className="absolute -left-3 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r bg-foreground transition-all group-hover:h-5 group-data-[active=true]:h-8" />
                <CommunityIcon id={c.id} name={c.name} iconUrl={c.icon_url} className="size-11 text-sm" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{c.name}</TooltipContent>
          </Tooltip>
        ))}

        <CreateCommunityDialog
          trigger={
            <button
              className="grid size-11 place-items-center rounded-2xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="コミュニティを作成"
            >
              <Plus className="size-5" />
            </button>
          }
        />

        <div className="flex-1" />
        {admin.data && (
          <RailLink to="/admin" label="運営センター" onClick={onNavigate}>
            <ShieldAlert className="size-5" />
          </RailLink>
        )}
        <RailLink to="/settings" label="Settings" onClick={onNavigate}>
          <Settings className="size-5" />
        </RailLink>
        <Link to="/u/$userId" params={{ userId: me.id }} onClick={onNavigate} className="mt-1" aria-label="マイプロフィール">
          <UserAvatar name={me.display_name} avatarUrl={me.avatar_url} status={me.status} showStatus size="sm" />
        </Link>
      </nav>
    </TooltipProvider>
  );
}

function RailLink({
  to,
  label,
  children,
  onClick,
}: {
  to: string;
  label: string;
  children: React.ReactNode;
  onClick?: (() => void) | undefined;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          onClick={onClick}
          className={cn(
            "relative grid size-11 place-items-center rounded-2xl text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
          )}
          activeProps={{ className: "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary" }}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
