import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/auth";
import { Logo } from "@/components/app/Logo";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "ログイン / 新規登録 — Nexa" },
      { name: "description", content: "Nexaにログインまたはアカウントを作成して、コミュニティに参加しよう。" },
      { property: "og:title", content: "ログイン / 新規登録 — Nexa" },
      { property: "og:description", content: "Nexaにログインしてコミュニティに参加。" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [session, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (uname.length < 3) {
          toast.error("ユーザー名は英数字3文字以上にしてください");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: uname, display_name: username.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Googleログインに失敗しました");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,var(--color-glow),transparent_65%)]" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-2xl border bg-card p-6 glow-ring">
          {checkEmail ? (
            <div className="text-center">
              <h1 className="text-lg font-bold">メールを確認してください</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {email} に確認リンクを送りました。リンクを開くとログインできます。
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold">{mode === "signup" ? "アカウント作成" : "おかえりなさい"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signup" ? "数秒でコミュニティに参加できます。" : "ログインしてチャットを続けましょう。"}
              </p>

              <Button type="button" variant="secondary" className="mt-5 w-full" onClick={google} disabled={busy}>
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.65 4.4-5.35 4.4a6.4 6.4 0 1 1 0-12.8c1.85 0 3.1.8 3.8 1.45l2.6-2.5A10 10 0 1 0 12 22c5.75 0 9.6-4.05 9.6-9.75 0-.65-.1-1.15-.25-1.15Z"
                  />
                </svg>
                Googleで続ける
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                または
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="username">ユーザー名</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="yuki_dev"
                      required
                      autoComplete="username"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "処理中…" : mode === "signup" ? "アカウントを作成" : "ログイン"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    すでにアカウントをお持ちですか？{" "}
                    <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary hover:underline">
                      ログイン
                    </Link>
                  </>
                ) : (
                  <>
                    アカウントがありませんか？{" "}
                    <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-primary hover:underline">
                      新規登録
                    </Link>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
