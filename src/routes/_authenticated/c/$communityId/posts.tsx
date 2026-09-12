import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, MessageSquare, Trash2, Link2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useMembership } from "@/components/app/JoinButton";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/EmptyState";
import { timeAgo } from "@/lib/format";
import { uploadFile, useSignedUrl } from "@/lib/storage";
import { PageHeader } from "@/components/app/PageHeader";
import { recordActivity } from "@/lib/points";

export const Route = createFileRoute("/_authenticated/c/$communityId/posts")({
  head: () => ({
    meta: [
      { title: "Posts — Nexa" },
      { name: "description", content: "お知らせ、イベント告知、進捗共有。コミュニティの投稿。" },
      { property: "og:title", content: "Posts — Nexa" },
      { property: "og:description", content: "コミュニティの投稿一覧。" },
    ],
  }),
  component: PostsPage,
});

function PostsPage() {
  const { communityId } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const membership = useMembership(communityId);
  const role = membership.data?.role ?? null;
  const canManage = role === "owner" || role === "admin";

  const posts = useQuery({
    queryKey: ["posts", communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, author:profiles!posts_user_id_fkey(*), comments:post_comments(count)")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const image_url = image ? await uploadFile(me.data!.id, image) : null;
      const { error } = await supabase.from("posts").insert({
        community_id: communityId,
        user_id: me.data!.id,
        title: title.trim(),
        content: content.trim(),
        link_url: link.trim() || null,
        image_url,
      });
      if (error) throw error;
      await recordActivity("post");
    },
    onSuccess: () => {
      toast.success("投稿しました");
      setOpen(false);
      setTitle("");
      setContent("");
      setLink("");
      setImage(null);
      qc.invalidateQueries({ queryKey: ["posts", communityId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts", communityId] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <PageHeader
          title="Posts"
          subtitle="お知らせ・イベント・進捗を共有"
          actions={
            role ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4" /> 投稿する
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新しい投稿</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>タイトル</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>本文</Label>
                      <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>リンク（任意）</Label>
                      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>画像 / ファイル（任意）</Label>
                      <Input type="file" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
                    </div>
                    <Button className="w-full" onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>
                      投稿
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null
          }
        />

        {posts.isLoading && <LoadingState />}
        {posts.isError && <ErrorState message={posts.error.message} onRetry={() => posts.refetch()} />}
        {posts.data?.length === 0 && <EmptyState icon={FileText} title="まだ投稿はありません" body="最初のお知らせを投稿してみましょう。" />}
        <div className="space-y-4">
          {posts.data?.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              canDelete={p.user_id === me.data?.id || canManage}
              canComment={!!role}
              onDelete={() => remove.mutate(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type PostRow = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
  user_id: string;
  author: { id: string; display_name: string; avatar_url: string | null } | null;
  comments: { count: number }[];
};

function PostCard({ post, canDelete, canComment, onDelete }: { post: PostRow; canDelete: boolean; canComment: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: img } = useSignedUrl(post.image_url);
  const count = post.comments?.[0]?.count ?? 0;
  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        {post.author && (
          <Link to="/u/$userId" params={{ userId: post.author.id }}>
            <UserAvatar name={post.author.display_name} avatarUrl={post.author.avatar_url} size="sm" />
          </Link>
        )}
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{post.author?.display_name}</span>
          <span className="ml-2 text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="削除">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <h2 className="mt-3 text-lg font-bold">{post.title}</h2>
      <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{post.content}</p>
      {img && <img src={img} alt="" loading="lazy" className="mt-3 max-h-80 rounded-xl border object-contain" />}
      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Link2 className="size-3.5" /> {post.link_url}
        </a>
      )}
      <div className="mt-4">
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <MessageSquare className="size-4" /> コメント {count > 0 && count}
        </button>
      </div>
      {open && <Comments postId={post.id} canComment={canComment} />}
    </article>
  );
}

function Comments({ postId, canComment }: { postId: string; canComment: boolean }) {
  const me = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const comments = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, author:profiles!post_comments_user_id_fkey(display_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: me.data!.id, content: text.trim() });
      if (error) throw error;
      await recordActivity("comment");
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {comments.data?.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-sm">
          <UserAvatar name={c.author?.display_name ?? "?"} avatarUrl={c.author?.avatar_url} size="xs" />
          <div>
            <span className="font-medium">{c.author?.display_name}</span>{" "}
            <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
            <p>{c.content}</p>
          </div>
        </div>
      ))}
      {canComment && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) add.mutate();
          }}
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="コメントを書く…" />
          <Button type="submit" size="sm" disabled={!text.trim() || add.isPending}>
            送信
          </Button>
        </form>
      )}
    </div>
  );
}
