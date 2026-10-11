import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Hash,
  Volume2,
  Settings,
  Plus,
  Home,
  FileText,
  CalendarDays,
  CalendarRange,
  ImageIcon,
  BadgeCheck,
  ChevronDown,
  Menu,
  PanelRight,
  Star,
  BellOff,
  CheckSquare,
} from "lucide-react";
import { channelsQuery, communityQuery, membersQuery } from "@/lib/queries";
import { useMe, useMembership } from "@/lib/auth";
import { useSetChannelPref, channelPrefsQuery } from "@/lib/social";
import { useMyRolePermissions } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/app/UserAvatar";
import { MemberList } from "@/components/app/MemberList";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { WelcomeDialog } from "@/components/app/WelcomeDialog";
import { channelTypeMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";

export const Route = createFileRoute("/_authenticated/c/$communityId")({
  component: CommunityLayout,
});

function CommunityLayout() {
  const { communityId } = Route.useParams();
  const community = useQuery(communityQuery(communityId));
  const membership = useMembership(communityId);
  const me = useMe();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const pathname = useLocation({ select: (s) => s.pathname });
  const isChat = pathname.includes("/ch/");

  const role = membership.data?.role;
  const canManage = role === "owner" || role === "admin";
  const perms = useMyRolePermissions(communityId, me.data?.id, role ?? undefined);
  const canRoles = perms.has("manage_roles");

  if (!community.data) return null;

  const sidebar = (
    <ChannelSidebar
      communityId={communityId}
      name={community.data.name}
      verified={community.data.is_verified}
      canManage={canManage || canRoles}
      isMember={!!role}
      onNavigate={() => setLeftOpen(false)}
    />
  );

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden">
      {!!role && <WelcomeDialog communityId={communityId} communityName={community.data.name} />}
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:block">{sidebar}</aside>
      <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">チャンネル</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b px-2 lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => setLeftOpen(true)} className="gap-1.5">
            <Menu className="size-4" />
            <CommunityIcon id={communityId} name={community.data.name} iconUrl={community.data.icon_url} className="size-5 rounded-md text-[9px]" />
            <span className="max-w-32 truncate text-sm font-semibold">{community.data.name}</span>
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => setRightOpen(true)} aria-label="メンバー">
            <PanelRight className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>

      <aside className={cn("hidden w-60 shrink-0 border-l bg-sidebar", isChat ? "xl:block" : "md:block")}>
        <MemberList communityId={communityId} />
      </aside>
      <Sheet open={rightOpen} onOpenChange={setRightOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <SheetTitle className="sr-only">メンバー</SheetTitle>
          <MemberList communityId={communityId} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChannelSidebar({
  communityId,
  name,
  verified,
  canManage,
  isMember,
  onNavigate,
}: {
  communityId: string;
  name: string;
  verified: boolean;
  canManage: boolean;
  isMember: boolean;
  onNavigate: () => void;
}) {
  const data = useQuery(channelsQuery(communityId));
  const members = useQuery(membersQuery(communityId));
  const me = useMe();
  const prefs = useQuery(channelPrefsQuery(me.data?.id));
  const setPref = useSetChannelPref(me.data?.id);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);

  const cats = data.data?.categories ?? [];
  const all = data.data?.channels ?? [];
  const prefOf = (id: string) => prefs.data?.find((p) => p.channel_id === id);
  const active = all.filter((c) => !c.archived);
  const archived = all.filter((c) => c.archived);
  const favorites = active.filter((c) => prefOf(c.id)?.favorite);
  const uncategorized = active.filter((c) => !c.category_id || !cats.some((k) => k.id === c.category_id));

  const renderChannel = (ch: Channel) => (
    <ChannelLink
      key={ch.id}
      communityId={communityId}
      channel={ch}
      favorite={!!prefOf(ch.id)?.favorite}
      muted={!!prefOf(ch.id)?.muted}
      canTogglePrefs={isMember && !!me.data}
      onTogglePref={(patch) => setPref.mutate({ channelId: ch.id, patch })}
      onClick={onNavigate}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/c/$communityId"
        params={{ communityId }}
        onClick={onNavigate}
        className="flex h-12 items-center gap-2 border-b px-4 hover:bg-sidebar-accent"
      >
        <span className="truncate font-bold">{name}</span>
        {verified && <BadgeCheck className="size-4 shrink-0 text-verified" />}
      </Link>
      <nav className="flex-1 overflow-y-auto p-2 text-sm">
        <SideLink to="/c/$communityId" params={{ communityId }} exact icon={Home} label="概要" onClick={onNavigate} />
        <SideLink to="/c/$communityId/posts" params={{ communityId }} icon={FileText} label="Posts" onClick={onNavigate} />
        {isMember && <SideLink to="/c/$communityId/tasks" params={{ communityId }} icon={CheckSquare} label="タスク" onClick={onNavigate} />}
        <SideLink to="/c/$communityId/events" params={{ communityId }} icon={CalendarDays} label="イベント" onClick={onNavigate} />
        <SideLink to="/c/$communityId/calendar" params={{ communityId }} icon={CalendarRange} label="カレンダー" onClick={onNavigate} />
        <SideLink to="/c/$communityId/media" params={{ communityId }} icon={ImageIcon} label="メディア" onClick={onNavigate} />
        {canManage && <SideLink to="/c/$communityId/settings" params={{ communityId }} icon={Settings} label="設定" onClick={onNavigate} />}

        <div className="mt-3 space-y-3">
          {favorites.length > 0 && (
            <div>
              <p className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Star className="size-3" /> お気に入り
              </p>
              {favorites.map(renderChannel)}
            </div>
          )}
          {cats.map((cat) => {
            const list = active.filter((c) => c.category_id === cat.id);
            const isCollapsed = collapsed[cat.id];
            return (
              <div key={cat.id}>
                <button
                  onClick={() => setCollapsed((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
                  className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={cn("size-3 transition-transform", isCollapsed && "-rotate-90")} />
                  {cat.name}
                </button>
                {!isCollapsed && list.map(renderChannel)}
              </div>
            );
          })}
          {uncategorized.length > 0 && <div>{uncategorized.map(renderChannel)}</div>}
          {archived.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex w-full items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("size-3 transition-transform", !showArchived && "-rotate-90")} />
                アーカイブ
              </button>
              {showArchived && archived.map(renderChannel)}
            </div>
          )}
          {canManage && (
            <Link
              to="/c/$communityId/settings"
              params={{ communityId }}
              onClick={onNavigate}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <Plus className="size-4" /> チャンネルを追加
            </Link>
          )}
        </div>
      </nav>
      <div className="flex h-[52px] shrink-0 items-center gap-2 bg-user-panel px-2">
        <UserAvatar
          name={me.data?.display_name ?? "?"}
          avatarUrl={me.data?.avatar_url}
          status={me.data?.status}
          showStatus={me.data?.show_online}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground">{me.data?.display_name ?? "…"}</p>
          <p className="text-[10px] leading-tight text-muted-foreground">{members.data?.length ?? 0} メンバー</p>
        </div>
      </div>
    </div>
  );
}

function ChannelLink({
  communityId,
  channel,
  favorite,
  muted,
  canTogglePrefs,
  onTogglePref,
  onClick,
}: {
  communityId: string;
  channel: Channel;
  favorite: boolean;
  muted: boolean;
  canTogglePrefs: boolean;
  onTogglePref: (patch: { favorite?: boolean; muted?: boolean }) => void;
  onClick: () => void;
}) {
  const Icon = channelTypeMeta(channel.type).icon;
  const link = (
    <Link
      to="/c/$communityId/ch/$channelId"
      params={{ communityId, channelId: channel.id }}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        muted && "opacity-50",
      )}
      activeProps={{ className: "bg-sidebar-accent text-foreground font-semibold" }}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      <span className="truncate">{channel.name}</span>
      {muted && <BellOff className="ml-auto size-3 shrink-0 text-muted-foreground" />}
    </Link>
  );

  return link;
}

function SideLink({
  to,
  params,
  exact,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  params: Record<string, string>;
  exact?: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      params={params}
      activeOptions={{ exact }}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      activeProps={{ className: "bg-sidebar-accent text-foreground font-semibold" }}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
