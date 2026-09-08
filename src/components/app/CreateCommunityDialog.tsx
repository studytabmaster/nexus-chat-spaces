import { type ReactNode, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CREATE_CATEGORIES } from "@/lib/constants";
import { useMe } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export function CreateCommunityDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("雑談");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  const [tags, setTags] = useState("");
  const [icon, setIcon] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me.data) return;
    setBusy(true);
    try {
      const icon_url = icon ? await uploadFile(me.data.id, icon) : null;
      const { data: c, error } = await supabase
        .from("communities")
        .insert({ name: name.trim(), description: description.trim(), category, visibility, icon_url, created_by: me.data.id })
        .select()
        .single();
      if (error) throw error;
      const { error: mErr } = await supabase
        .from("community_members")
        .insert({ community_id: c.id, user_id: me.data.id, role: "owner" });
      if (mErr) throw mErr;
      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .insert({ community_id: c.id, name: "GENERAL", position: 0 })
        .select()
        .single();
      if (catErr) throw catErr;
      const { data: ch, error: chErr } = await supabase
        .from("channels")
        .insert({ community_id: c.id, category_id: cat.id, name: "general", position: 0 })
        .select()
        .single();
      if (chErr) throw chErr;
      const tagList = tags.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8);
      if (tagList.length) await supabase.from("community_tags").insert(tagList.map((tag) => ({ community_id: c.id, tag })));
      await qc.invalidateQueries({ queryKey: ["communities"] });
      toast.success("コミュニティを作成しました");
      setOpen(false);
      setName("");
      setDescription("");
      setTags("");
      setIcon(null);
      navigate({ to: "/c/$communityId/ch/$channelId", params: { communityId: c.id, channelId: ch.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Community</DialogTitle>
          <DialogDescription>GENERAL カテゴリーと #general チャンネルが自動で作られます。</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">名前</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-desc">説明</Label>
            <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>カテゴリー</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>公開設定</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC — Discoverに表示</SelectItem>
                  <SelectItem value="UNLISTED">UNLISTED — リンクのみ</SelectItem>
                  <SelectItem value="PRIVATE">PRIVATE — 非公開</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-tags">タグ（カンマ区切り）</Label>
            <Input id="c-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="minecraft, 建築" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-icon">アイコン</Label>
            <Input id="c-icon" type="file" accept="image/*" onChange={(e) => setIcon(e.target.files?.[0] ?? null)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
            {busy ? "作成中…" : "作成する"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
