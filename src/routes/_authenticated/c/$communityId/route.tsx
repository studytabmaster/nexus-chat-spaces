import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Hash, ChevronDown, FileText, CheckSquare, Settings, Users, BadgeCheck, Menu, PanelRight, Home, CalendarDays, CalendarRange, ImageIcon } from "lucide-react";
import { communityQuery, channelsQuery, membersQuery } from "@/lib/queries";
import { useMembership } from "@/components/app/JoinButton";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { WelcomeDialog } from "@/components/app/WelcomeDialog";
import { MemberList } from "@/components/app/MemberList";
import { LoadingState, ErrorState, EmptyState } from "@/components/app/EmptyState";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/c/$communityId")({
  component: CommunityLayout,
});

function CommunityLayout() {
  const { communityId } = Route.useParams();
  const community = useQuery(communityQuery(communityId));
  const membership = useMembership(communityId);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChat = /\/ch\//.test(pathname);

  if (community.isLoading) return <LoadingState />;
  if (community.isError) return <ErrorState message={community.error.message} onRetry={() => community.refetch()} />;
  if (!community.data)
    return (
      <div className="p-8">
        <EmptyState icon={Users} title="コミュニティが見つかりません" body="非公開か、削除された可能性があります。" />
      </div>
    );

  const role = membership.data?.role ?? null;
  const canManage = role === "owner" || role === "admin";

  const sidebar = (
    <ChannelSidebar communityId={communityId} name={community.data.name} verified={community.data.is_verified} canManage={canManage} isMember={!!role} onNavigate={() => setLeftOpen(false)} />
  );

  return (
    <div className="flex h-full min-h-0">
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const cats = data.data?.categories ?? [];
  const chans = data.data?.channels ?? [];
  const uncategorized = chans.filter((c) => !c.category_id || !cats.some((k) => k.id === c.category_id));

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
          {cats.map((cat) => {
            const list = chans.filter((c) => c.category_id === cat.id);
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
                {!isCollapsed &&
                  list.map((ch) => (
                    <ChannelLink key={ch.id} communityId={communityId} channelId={ch.id} name={ch.name} onClick={onNavigate} />
                  ))}
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <div>
              {uncategorized.map((ch) => (
                <ChannelLink key={ch.id} communityId={communityId} channelId={ch.id} name={ch.name} onClick={onNavigate} />
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        <Users className="mr-1 inline size-3" /> {members.data?.length ?? 0} メンバー
      </div>
    </div>
  );
}

function ChannelLink({ communityId, channelId, name, onClick }: { communityId: string; channelId: string; name: string; onClick: () => void }) {
  return (
    <Link
      to="/c/$communityId/ch/$channelId"
      params={{ communityId, channelId }}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
    >
      <Hash className="size-4 shrink-0 opacity-60" /> <span className="truncate">{name}</span>
    </Link>
  );
}

function SideLink({
  to,
  params,
  icon: Icon,
  label,
  exact,
  onClick,
}: {
  to:
    | "/c/$communityId"
    | "/c/$communityId/posts"
    | "/c/$communityId/tasks"
    | "/c/$communityId/settings"
    | "/c/$communityId/events"
    | "/c/$communityId/media"
    | "/c/$communityId/calendar";
  params: { communityId: string };
  icon: typeof Home;
  label: string;
  exact?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      params={params}
      onClick={onClick}
      activeOptions={{ exact: !!exact }}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );
}
