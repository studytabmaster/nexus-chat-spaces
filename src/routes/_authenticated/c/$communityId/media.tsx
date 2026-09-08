import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, ImageIcon } from "lucide-react";
import { mediaQuery, type MediaItem } from "@/lib/community-extras";
import { useSignedUrl } from "@/lib/storage";
import { shortDate } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/c/$communityId/media")({
  head: () => ({
    meta: [
      { title: "メディア / ファイル — Nexa" },
      { name: "description", content: "コミュニティで共有された画像とファイルの一覧。" },
      { property: "og:title", content: "メディア / ファイル — Nexa" },
      { property: "og:description", content: "コミュニティで共有された画像とファイルの一覧。" },
    ],
  }),
  component: MediaPage,
});

function MediaPage() {
  const { communityId } = Route.useParams();
  const media = useQuery(mediaQuery(communityId));
  const [tab, setTab] = useState("images");

  if (media.isLoading) return <LoadingState />;
  if (media.isError) return <ErrorState message={media.error.message} onRetry={() => media.refetch()} />;

  const images = (media.data ?? []).filter((m) => m.attachment_type === "image");
  const files = (media.data ?? []).filter((m) => m.attachment_type !== "image");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <PageHeader title="メディア / ファイル" subtitle="共有された画像とファイル" />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="images">画像 {images.length > 0 && `(${images.length})`}</TabsTrigger>
            <TabsTrigger value="files">ファイル {files.length > 0 && `(${files.length})`}</TabsTrigger>
          </TabsList>
          <TabsContent value="images">
            {images.length === 0 ? (
              <EmptyState icon={ImageIcon} title="画像はまだありません" body="チャットで画像を送るとここに集まります。" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((m) => (
                  <ImageTile key={m.id} item={m} communityId={communityId} />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="files">
            {files.length === 0 ? (
              <EmptyState icon={FileText} title="ファイルはまだありません" body="チャットでファイルを送るとここに集まります。" />
            ) : (
              <div className="space-y-2">
                {files.map((m) => (
                  <FileRow key={m.id} item={m} communityId={communityId} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ImageTile({ item, communityId }: { item: MediaItem; communityId: string }) {
  const { data: url } = useSignedUrl(item.attachment_url);
  return (
    <Link
      to="/c/$communityId/ch/$channelId"
      params={{ communityId, channelId: item.channel_id }}
      className="group overflow-hidden rounded-xl border bg-card"
    >
      {url ? (
        <img src={url} alt={item.content || "共有画像"} loading="lazy" className="aspect-square w-full object-cover" />
      ) : (
        <div className="aspect-square w-full animate-pulse bg-muted" />
      )}
      <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
        {item.author?.display_name} ・ {shortDate(item.created_at)}
      </div>
    </Link>
  );
}

function FileRow({ item, communityId }: { item: MediaItem; communityId: string }) {
  return (
    <Link
      to="/c/$communityId/ch/$channelId"
      params={{ communityId, channelId: item.channel_id }}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-surface-hover"
    >
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.content || "ファイル"}</p>
        <p className="text-xs text-muted-foreground">
          {item.author?.display_name} ・ {shortDate(item.created_at)}
        </p>
      </div>
    </Link>
  );
}
