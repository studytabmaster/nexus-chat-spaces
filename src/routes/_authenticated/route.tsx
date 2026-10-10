import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // 招待確認は1時間ブラウザに保存し、画面移動ごとの問い合わせを省く
    const ck = `access_ok:${data.user.id}`;
    const cached = Number(sessionStorage.getItem(ck) ?? 0);
    let allowed: unknown = cached > Date.now() ? true : null;
    if (allowed !== true) {
      allowed = (await supabase.rpc("is_access_allowed" as never)).data;
      if (allowed === true) sessionStorage.setItem(ck, String(Date.now() + 3600_000));
    }
    if (allowed !== true) {
      sessionStorage.removeItem(ck);
      sessionStorage.setItem("not_invited", "1");
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
