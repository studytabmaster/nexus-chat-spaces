import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NavRail } from "./NavRail";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useMe } from "@/lib/auth";
import { LoadingState } from "./EmptyState";
import { notificationsQuery } from "@/lib/queries";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notifs = useQuery({ ...notificationsQuery(me.data?.id ?? ""), enabled: !!me.data });
  const unread = notifs.data?.filter((n) => !n.read).length ?? 0;

  if (me.isLoading) return <LoadingState label="アカウントを準備しています…" />;
  if (me.isError || !me.data)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        プロフィールを読み込めませんでした。再読み込みしてください。
      </div>
    );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-[72px] shrink-0 md:block">
        <NavRail me={me.data} unread={unread} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[72px] border-r p-0">
          <SheetTitle className="sr-only">ナビゲーション</SheetTitle>
          <NavRail me={me.data} unread={unread} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="メニュー">
            <Menu className="size-5" />
          </Button>
          <Logo compact />
          <div className="flex-1" />
          <Button asChild variant="ghost" size="icon" aria-label="検索">
            <Link to="/search">
              <Search className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="通知" className="relative">
            <Link to="/notifications">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />}
            </Link>
          </Button>
        </header>
        <main key={pathname.split("/").slice(0, 3).join("/")} className="min-h-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
