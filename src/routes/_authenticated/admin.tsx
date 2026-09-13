import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { generateShopItemDraft, type AiShopDraft } from "@/lib/shop-ai.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Plus, ScrollText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import {
  shopItemsQuery,
  fraudFlagsQuery,
  serviceAuditQuery,
  isAdminQuery,
  shopKindLabel,
  saleState,
  SHOP_KINDS,
  REVIEW_STATUS_LABEL,
  FRAUD_KIND_LABEL,
  type ShopItem,
} from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, LoadingState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { chatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "運営センター — Nexa" },
      { name: "description", content: "Shop商品の管理、不正検知、運営操作の監査ログ。" },
      { property: "og:title", content: "運営センター — Nexa" },
      { property: "og:description", content: "Shop商品の管理、不正検知、運営操作の監査ログ。" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const me = useMe();
  const admin = useQuery(isAdminQuery(me.data?.id));

  if (admin.isLoading) return <LoadingState />;
  if (!admin.data)
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState icon={ShieldAlert} title="権限がありません" body="このページは運営スタッフのみが利用できます。" />
      </div>
    );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <PageHeader title="運営センター" subtitle="コミュニティ管理とは分離された、サービス全体の管理画面です。" />
        <Tabs defaultValue="items">
          <TabsList className="flex-wrap">
            <TabsTrigger value="items">Shop商品</TabsTrigger>
            <TabsTrigger value="fraud">不正検知</TabsTrigger>
            <TabsTrigger value="audit">監査ログ</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="mt-4">
            <ItemsManager />
          </TabsContent>
          <TabsContent value="fraud" className="mt-4">
            <FraudPanel />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type ItemForm = {
  kind: string;
  name: string;
  description: string;
  payload: string;
  image_url: string;
  price: string;
  stock: string;
  starts_at: string;
  ends_at: string;
  season: string;
  published: boolean;
  review_status: string;
  ai_generated: boolean;
};

const emptyForm: ItemForm = {
  kind: "frame",
  name: "",
  description: "",
  payload: "",
  image_url: "",
  price: "500",
  stock: "",
  starts_at: "",
  ends_at: "",
  season: "",
  published: false,
  review_status: "draft",
  ai_generated: false,
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AiDraftPanel({ kind, onApply }: { kind: string; onApply: (d: AiShopDraft) => void }) {
  const [prompt, setPrompt] = useState("");
  const [withImage, setWithImage] = useState(true);
  const gen = useServerFn(generateShopItemDraft);
  const run = useMutation({
    mutationFn: async () => {
      if (prompt.trim().length < 2) throw new Error("どんな商品にしたいか入力してください");
      return gen({ data: { prompt: prompt.trim(), kind, withImage } });
    },
    onSuccess: (d) => {
      onApply(d);
      toast.success(d.imagePath ? "AIが商品案と画像を作成しました" : "AIが商品案を作成しました");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2 rounded-xl border border-dashed p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles className="size-4 text-primary" />
        AIに商品案を作ってもらう
      </p>
      <Textarea
        rows={2}
        placeholder="例：夏祭りの花火をイメージした華やかなプロフィールフレーム"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={withImage} onCheckedChange={setWithImage} />
          商品画像も作る
        </label>
        <Button size="sm" variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "作成中…" : "AIで作成"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        AIが作った商品は「審査中」の下書きとして入り、承認するまで公開されません。
      </p>
    </div>
  );
}

function ItemsManager() {
  const qc = useQueryClient();
  const me = useMe();
  const items = useQuery(shopItemsQuery({ all: true }));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShopItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(item: ShopItem) {
    setEditing(item);
    setForm({
      kind: item.kind,
      name: item.name,
      description: item.description,
      payload: item.payload,
      image_url: item.image_url ?? "",
      price: String(item.price),
      stock: item.stock == null ? "" : String(item.stock),
      starts_at: toLocalInput(item.starts_at),
      ends_at: toLocalInput(item.ends_at),
      season: item.season,
      published: item.published,
      review_status: item.review_status,
      ai_generated: item.ai_generated,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("商品名を入力してください");
      const price = Number(form.price);
      if (!Number.isFinite(price) || price < 0) throw new Error("価格が正しくありません");
      const img = form.image_url.trim();
      if (img && img.includes("://") && !/^https?:\/\//.test(img))
        throw new Error("画像は https のURL、またはAIで作成した画像のみ使えます（端末内のファイルは表示できません）");
      // AI生成の商品は自動公開しない（必ず審査を通す）
      const published = form.ai_generated && form.review_status !== "approved" ? false : form.published;
      const payload = {
        kind: form.kind,
        name: form.name.trim(),
        description: form.description.trim(),
        payload: form.payload.trim(),
        image_url: form.image_url.trim() || null,
        price,
        stock: form.stock.trim() === "" ? null : Number(form.stock),
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        season: form.season.trim(),
        published,
        review_status: form.review_status,
        ai_generated: form.ai_generated,
      };
      if (editing) {
        const { error } = await supabase.from("shop_items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shop_items").insert({ ...payload, created_by: me.data?.id ?? null });
        if (error) throw error;
      }
      await supabase.from("service_audit_logs").insert({
        actor_id: me.data?.id ?? null,
        action: editing ? "shop_item_update" : "shop_item_create",
        target: editing?.id ?? payload.name,
        detail: `${shopKindLabel(payload.kind)} / ${payload.price}pt / ${payload.published ? "公開" : "非公開"}`,
      });
    },
    onSuccess: () => {
      toast.success("保存しました");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["shop-items"] });
      qc.invalidateQueries({ queryKey: ["service-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (item: ShopItem) => {
      if (!item.published && item.review_status !== "approved") throw new Error("審査が承認されていません");
      const { error } = await supabase.from("shop_items").update({ published: !item.published }).eq("id", item.id);
      if (error) throw error;
      await supabase.from("service_audit_logs").insert({
        actor_id: me.data?.id ?? null,
        action: item.published ? "shop_item_unpublish" : "shop_item_publish",
        target: item.id,
        detail: item.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-items"] });
      qc.invalidateQueries({ queryKey: ["service-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restock = useMutation({
    mutationFn: async (item: ShopItem) => {
      const add = item.stock ?? 0;
      const { error } = await supabase
        .from("shop_items")
        .update({ stock: (item.stock ?? 0) + add, restock_count: item.restock_count + 1 })
        .eq("id", item.id);
      if (error) throw error;
      await supabase.from("service_audit_logs").insert({
        actor_id: me.data?.id ?? null,
        action: "shop_item_restock",
        target: item.id,
        detail: `${item.name} / +${add}個`,
      });
    },
    onSuccess: () => {
      toast.success("再販売しました");
      qc.invalidateQueries({ queryKey: ["shop-items"] });
      qc.invalidateQueries({ queryKey: ["service-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">商品の作成・価格・販売期間・限定数・公開状態を管理します。</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 size-4" />
          商品を作成
        </Button>
      </div>

      {items.isLoading && <LoadingState />}
      {items.data?.map((item) => {
        const s = saleState(item);
        return (
          <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-medium">{item.name}</p>
                <Badge variant="secondary">{shopKindLabel(item.kind)}</Badge>
                <Badge variant="outline">{REVIEW_STATUS_LABEL[item.review_status]}</Badge>
                <Badge variant={item.published ? "default" : "outline"}>{item.published ? "公開中" : "非公開"}</Badge>
                <Badge variant="outline">{s.label}</Badge>
                {item.ai_generated && (
                  <Badge variant="outline">
                    <Sparkles className="mr-1 size-3" />
                    AI制作
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.price.toLocaleString()}pt / 販売 {item.sold}
                {item.stock != null ? ` / ${item.stock}個限定` : ""}
                {item.season ? ` / ${item.season}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                編集
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggle.mutate(item)} disabled={toggle.isPending}>
                {item.published ? "販売停止" : "公開する"}
              </Button>
              {item.stock != null && (
                <Button size="sm" variant="outline" onClick={() => restock.mutate(item)} disabled={restock.isPending}>
                  再販売
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "商品を編集" : "商品を作成"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <AiDraftPanel
              kind={form.kind}
              onApply={(d) =>
                setForm((f) => ({
                  ...f,
                  name: d.name,
                  description: d.description,
                  payload: d.payload,
                  price: String(d.price),
                  season: d.season,
                  image_url: d.imagePath ?? f.image_url,
                  ai_generated: true,
                  published: false,
                  review_status: "pending",
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>種類</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOP_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>価格（ポイント）</Label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>商品名</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>説明</Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>見た目の値（色・グラデーション・絵文字・称号など）</Label>
                <Input
                  className="mt-1"
                  value={form.payload}
                  onChange={(e) => setForm({ ...form, payload: e.target.value })}
                />
              </div>
              <div>
                <Label>画像URL（任意）</Label>
                <Input
                  className="mt-1"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>個数限定（空欄で無制限）</Label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
              <div>
                <Label>販売開始</Label>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Label>販売終了</Label>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>シーズン・イベント名（任意）</Label>
                <Input
                  className="mt-1"
                  value={form.season}
                  onChange={(e) => setForm({ ...form, season: e.target.value })}
                />
              </div>
              <div>
                <Label>審査状態</Label>
                <Select value={form.review_status} onValueChange={(v) => setForm({ ...form, review_status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REVIEW_STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">AIの制作補助を使った商品</p>
                <p className="text-xs text-muted-foreground">AI制作の商品は審査が承認されるまで自動公開されません。</p>
              </div>
              <Switch
                checked={form.ai_generated}
                onCheckedChange={(v) => setForm({ ...form, ai_generated: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">公開する</p>
                <p className="text-xs text-muted-foreground">審査が「承認済み」のときだけ公開されます。</p>
              </div>
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FraudPanel() {
  const qc = useQueryClient();
  const me = useMe();
  const flags = useQuery(fraudFlagsQuery());
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState<string | null>(null);

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("fraud_flags").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("service_audit_logs").insert({
        actor_id: me.data?.id ?? null,
        action: "fraud_flag_" + status,
        target: id,
        detail: "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraud-flags"] });
      qc.invalidateQueries({ queryKey: ["service-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      const pts = Number(amount);
      if (!target || !Number.isFinite(pts) || pts <= 0) throw new Error("取消するポイント数を入力してください");
      const { error } = await supabase.rpc("revoke_points", {
        _user_id: target,
        _points: pts,
        _reason: reason || "不正ポイント取消",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ポイントを取消しました");
      setAmount("");
      setReason("");
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["service-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {flags.isLoading && <LoadingState />}
      {flags.data?.length === 0 && (
        <EmptyState icon={ShieldAlert} title="検知された不正はありません" body="ポイントの異常な獲得や招待の悪用を自動で記録します。" />
      )}
      {flags.data?.map((f) => (
        <div key={f.id} className="rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{FRAUD_KIND_LABEL[f.kind] ?? f.kind}</Badge>
            <Badge variant={f.status === "open" ? "default" : "secondary"}>
              {f.status === "open" ? "未対応" : f.status === "resolved" ? "対応済み" : "問題なし"}
            </Badge>
            <span className="text-xs text-muted-foreground">{chatTime(f.created_at)}</span>
          </div>
          <p className="mt-1 text-sm">{f.detail}</p>
          <p className="mt-1 text-xs text-muted-foreground">対象ユーザーID：{f.user_id}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: f.id, status: "resolved" })}>
              対応済みにする
            </Button>
            <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: f.id, status: "dismissed" })}>
              問題なし
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setTarget(f.user_id)}>
              ポイントを取消
            </Button>
          </div>
          {target === f.user_id && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs">取消ポイント</Label>
                <Input className="mt-1 w-28" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="min-w-40 flex-1">
                <Label className="text-xs">理由</Label>
                <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button size="sm" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
                実行
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AuditPanel() {
  const logs = useQuery(serviceAuditQuery());
  return (
    <div className="space-y-1">
      {logs.isLoading && <LoadingState />}
      {logs.data?.length === 0 && (
        <EmptyState icon={ScrollText} title="記録がありません" body="運営の操作はここに残ります。" />
      )}
      {logs.data?.map((l) => (
        <div key={l.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{l.action}</Badge>
            <span className="text-muted-foreground">{l.actor?.display_name ?? "不明"}</span>
            <span className="text-xs text-muted-foreground">{chatTime(l.created_at)}</span>
          </div>
          {l.detail && <p className="mt-1 text-xs text-muted-foreground">{l.detail}</p>}
        </div>
      ))}
    </div>
  );
}
