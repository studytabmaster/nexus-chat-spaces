import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { welcomeQuery } from "@/lib/community-extras";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** コミュニティを初めて開いたときに表示するウェルカム画面 */
export function WelcomeDialog({ communityId, communityName }: { communityId: string; communityName: string }) {
  const welcome = useQuery(welcomeQuery(communityId));
  const [open, setOpen] = useState(false);
  const storageKey = `nexa-welcome-${communityId}`;

  useEffect(() => {
    if (!welcome.data?.enabled) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey)) return;
    setOpen(true);
  }, [welcome.data?.enabled, storageKey]);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* 保存できなくても表示は続行 */
    }
  };

  const w = welcome.data;
  if (!w?.enabled) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {w.title || `${communityName} へようこそ`}
          </DialogTitle>
        </DialogHeader>
        {w.body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{w.body}</p>}
        {w.rules.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-sm font-semibold">コミュニティのルール</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {w.rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </div>
        )}
        <Button onClick={close}>はじめる</Button>
      </DialogContent>
    </Dialog>
  );
}
