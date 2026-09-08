import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageSquare, Compass, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexa — コミュニティ型チャットツール" },
      {
        name: "description",
        content: "ゲーム、趣味、開発、クリエイター。何でも使えるコミュニティチャット。探して、参加して、すぐ話せる。",
      },
      { property: "og:title", content: "Nexa — コミュニティ型チャットツール" },
      { property: "og:description", content: "コミュニティを見つけて、すぐにチャットを始めよう。" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [session, loading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,var(--color-glow),transparent_65%)]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth" search={{ mode: "login" }}>
              ログイン
            </Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              はじめる
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Zap className="size-3.5 text-primary" /> リアルタイム・軽量・整理されたコミュニティ
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            見つけて、参加して、
            <br />
            <span className="text-gradient">すぐ話せる。</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            {APP_NAME}
            はゲーム・趣味・開発・クリエイター、何にでも使えるコミュニティ型チャット。チャンネル、投稿、タスク、DMをひとつの場所に。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                無料で始める
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "login" }}>
                ログイン
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Compass, title: "Discover", body: "カテゴリーとタグで公開コミュニティを検索。急上昇・新着もすぐ分かる。" },
            { icon: MessageSquare, title: "Chat", body: "返信、リアクション、ピン留め、画像添付。シンプルで速いチャット。" },
            { icon: Users, title: "Organize", body: "チャンネル、投稿、タスク、ロール。コミュニティ運営に必要なものだけ。" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card/70 p-6 glow-ring">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
