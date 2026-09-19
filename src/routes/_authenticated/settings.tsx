import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Camera, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { profileQuery } from "@/lib/queries";
import { uploadFile } from "@/lib/storage";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, ErrorState } from "@/components/app/EmptyState";
import { STATUS_LABEL } from "@/lib/constants";
import { useCosmetic } from "@/lib/cosmetics";
import { CosmeticBanner } from "@/components/app/CosmeticBanner";
import { NameDecorations } from "@/components/app/NameDecorations";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nexa" },
      { name: "description", content: "プロフィールと設定を管理。" },
      { property: "og:title", content: "Settings — Nexa" },
      { property: "og:description", content: "プロフィールと設定を管理。" },
    ],
  }),
  component: SettingsPage,
});

const STATUSES = ["online", "idle", "dnd", "offline"];

function SettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const profile = useQuery(profileQuery(me.data?.id ?? ""));
  const fileRef = useRef<HTMLInputElement>(null);
  const cosmetic = useCosmetic(me.data?.id);

  const [form, setForm] = useState<{
    display_name: string;
    username: string;
    bio: string;
    status: string;
    custom_status: string;
    show_online: boolean;
    allow_dms: boolean;
  }>({
    display_name: "",
    username: "",
    bio: "",
    status: "online",
    custom_status: "",
    show_online: true,
    allow_dms: true,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) {
      setForm({
        display_name: profile.data.display_name,
        username: profile.data.username,
        bio: profile.data.bio ?? "",
        status: profile.data.status,
        custom_status: profile.data.custom_status ?? "",
        show_online: profile.data.show_online,
        allow_dms: profile.data.allow_dms,
      });
      setAvatarUrl(profile.data.avatar_url);
    }
  }, [profile.data]);

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name.trim(),
          username: form.username.trim(),
          bio: form.bio.trim() || null,
          status: form.status,
          custom_status: form.custom_status.trim() || null,
          show_online: form.show_online,
          allow_dms: form.allow_dms,
          avatar_url: avatarUrl,
        })
        .eq("id", me.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("プロフィールを更新しました");
      qc.invalidateQueries({ queryKey: ["profile", me.data?.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadFile(me.data!.id, file);
      setAvatarUrl(path);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!me.data) return <LoadingState />;
  if (profile.isLoading) return <LoadingState />;
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={() => profile.refetch()} />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
        <PageHeader title="設定" subtitle="プロフィールとアプリ設定" />

        <div className="space-y-6 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative"
              aria-label="アバターを変更"
            >
              <UserAvatar
                name={form.display_name}
                avatarUrl={avatarUrl}
                size="xl"
                frame={cosmetic?.frame}
                frameImage={cosmetic?.frame_image}
              />
              <span className="absolute inset-0 grid place-items-center rounded-3xl bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                <Camera className="size-6" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />
            <div>
              <p className="font-semibold">アバター</p>
              <p className="text-sm text-muted-foreground">画像をタップして変更</p>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">装備中のアイテム</p>
                <p className="text-sm text-muted-foreground">ショップで交換したアイテムがプロフィールに反映されます</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/shop">ショップ</Link>
              </Button>
            </div>
            <CosmeticBanner
              background={cosmetic?.background}
              backgroundImage={cosmetic?.background_image}
              className="mt-3 h-14 rounded-lg border"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {cosmetic?.title ? (
                <NameDecorations title={cosmetic.title} />
              ) : (
                <span className="text-muted-foreground">称号：未装備</span>
              )}
              <span className="text-muted-foreground">
                フレーム：{cosmetic?.frame || cosmetic?.frame_image ? "装備中" : "未装備"}
              </span>
              <span className="text-muted-foreground">
                背景：{cosmetic?.background || cosmetic?.background_image ? "装備中" : "未装備"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>表示名</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ユーザー名</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>自己紹介</Label>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ステータス</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>カスタムステータス</Label>
              <Input
                value={form.custom_status}
                maxLength={60}
                onChange={(e) => setForm({ ...form, custom_status: e.target.value })}
                placeholder="例: 作業中 / ゲーム中 / あとで返信します"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="font-medium">オンライン状態を表示</p>
              <p className="text-sm text-muted-foreground">他のユーザーにステータスを表示します</p>
            </div>
            <Switch checked={form.show_online} onCheckedChange={(v) => setForm({ ...form, show_online: v })} />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <p className="font-medium">DMを許可</p>
              <p className="text-sm text-muted-foreground">他のユーザーからのダイレクトメッセージを受け取ります</p>
            </div>
            <Switch checked={form.allow_dms} onCheckedChange={(v) => setForm({ ...form, allow_dms: v })} />
          </div>

          <Button onClick={() => update.mutate()} disabled={update.isPending} className="w-full">
            <Save className="mr-1 size-4" /> 保存
          </Button>
        </div>
      </div>
    </div>
  );
}
