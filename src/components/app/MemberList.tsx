import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { membersQuery } from "@/lib/queries";
import { UserAvatar } from "./UserAvatar";
import { ROLE_LABEL } from "@/lib/constants";
import { LoadingState } from "./EmptyState";

export function MemberList({ communityId }: { communityId: string }) {
  const members = useQuery(membersQuery(communityId));
  if (members.isLoading) return <LoadingState />;
  const list = members.data ?? [];
  const isOnline = (m: (typeof list)[number]) => m.profile.show_online && m.profile.status !== "offline";
  const online = list.filter(isOnline);
  const offline = list.filter((m) => !isOnline(m));

  const Group = ({ title, items }: { title: string; items: typeof list }) =>
    items.length ? (
      <div className="mb-4">
        <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title} — {items.length}
        </p>
        {items.map((m) => (
          <Link
            key={m.id}
            to="/u/$userId"
            params={{ userId: m.user_id }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
          >
            <UserAvatar name={m.profile.display_name} avatarUrl={m.profile.avatar_url} status={isOnline(m) ? m.profile.status : "offline"} showStatus size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.profile.display_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[m.role]}</p>
            </div>
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div className="h-full overflow-y-auto p-2">
      <Group title="オンライン" items={online} />
      <Group title="オフライン" items={offline} />
    </div>
  );
}
