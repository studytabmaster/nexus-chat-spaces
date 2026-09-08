import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Hash, Users, Lock, Globe, Link2 } from "lucide-react";
import { communityQuery, channelsQuery } from "@/lib/queries";
import { CommunityIcon } from "@/components/app/CommunityIcon";
import { JoinButton, useMembership } from "@/components/app/JoinButton";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/app/EmptyState";
import { useSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/c/$communityId/")({
  head: () => ({
    meta: [
      { title: "コミュニティ — Nexa" },
      { name: "description", content: "コミュニティの概要、チャンネル、メンバーを確認して参加。" },
      { property: "og:title", content: "コミュニティ — Nexa" },
      { property: "og:description", content: "コミュニティの概要とチャンネル。" },
    ],
  }),
  component: CommunityOverview,
});

function CommunityOverview() {
  const { communityId } = Route.useParams();
  const c = useQuery(communityQuery(communityId));
  const chans = useQuery(channelsQuery(communityId));
  const membership = useMembership(communityId);
  const { data: banner } = useSignedUrl(c.data?.banner_url);

  if (!c.data) return <LoadingState />;
  const VisIcon = c.data.visibility === "PUBLIC" ? Globe : c.data.visibility === "UNLISTED" ? Link2 : Lock;

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative h-36 bg-brand-gradient md:h-48">
        {banner && <img src={banner} alt="" className="size-full object-cover" />}
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-10 md:px-8">
        <div className="-mt-10 flex flex-wrap items-end gap-4">
          <CommunityIcon id={c.data.id} name={c.data.name} iconUrl={c.data.icon_url} className="size-20 rounded-3xl border-4 border-background text-2xl" />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <span className="truncate">{c.data.name}</span>
              {c.data.is_verified && <BadgeCheck className="size-5 shrink-0 text-verified" />}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{c.data.category}</span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {c.data.member_count} メンバー
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="status-dot bg-online" /> {c.data.online_count} オンライン
              </span>
              <span className="inline-flex items-center gap-1">
                <VisIcon className="size-3.5" /> {c.data.visibility}
              </span>
            </p>
          </div>
          <div className="pb-1">
            <JoinButton community={c.data} navigateOnJoin />
          </div>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed">{c.data.description}</p>
        {c.data.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.data.tags.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-md font-normal">
                #{t}
              </Badge>
            ))}
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            チャンネル {!membership.data?.role && "（プレビュー）"}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {chans.data?.channels.map((ch) => (
              <Link
                key={ch.id}
                to="/c/$communityId/ch/$channelId"
                params={{ communityId, channelId: ch.id }}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 hover:bg-surface-hover"
              >
                <Hash className="size-4 text-muted-foreground" />
                <span className="font-medium">{ch.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {chans.data?.categories.find((k) => k.id === ch.category_id)?.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
