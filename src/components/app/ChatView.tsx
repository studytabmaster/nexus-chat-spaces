import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  Reply,
  Pencil,
  Trash2,
  Pin,
  SmilePlus,
  X,
  Hash,
  Image as ImageIcon,
  Lock,
  MessagesSquare,
  Bookmark,
  BookmarkCheck,
  Copy,
  Flag,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useMe } from "@/lib/auth";
import { chatTime } from "@/lib/format";
import { uploadFile, useSignedUrl } from "@/lib/storage";
import { QUICK_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSaved } from "@/lib/social";
import { channelPollsQuery, type Poll } from "@/lib/events";
import { UserAvatar } from "./UserAvatar";
import { CustomEmojiPicker, EmojiImage, renderEmojiParts } from "./CustomEmoji";
import { useCustomEmojis } from "@/lib/community-extras";
import { myPurchasesQuery } from "@/lib/shop";
import { PollCard, CreatePollDialog } from "./PollCard";
import { ReportDialog } from "./ReportDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingState, ErrorState } from "./EmptyState";
import type { Profile } from "@/lib/queries";
import { recordActivity } from "@/lib/points";
import { useCosmetics } from "@/lib/cosmetics";
import { groupMemberRoles, memberRolesQuery } from "@/lib/roles";
import { NameDecorations } from "./NameDecorations";

type Reaction = Tables<"message_reactions">;
export type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  reply_to: string | null;
  thread_root_id?: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  is_pinned?: boolean;
  author: Profile | null;
  reactions?: Reaction[];
};

type Source =
  | { kind: "channel"; channelId: string; communityId: string; canModerate: boolean; canPost: boolean }
  | { kind: "dm"; dmId: string };

export function ChatView({
  source,
  title,
  subtitle,
  members,
  headerExtra,
  threadRootId,
  onOpenThread,
  compact,
  postDisabledNote,
}: {
  source: Source;
  title: string;
  subtitle?: string;
  members?: Profile[];
  headerExtra?: React.ReactNode;
  threadRootId?: string | null;
  onOpenThread?: (msg: ChatMessage) => void;
  compact?: boolean;
  postDisabledNote?: string;
}) {
  const me = useMe();
  const qc = useQueryClient();
  const saved = useSaved();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [reportingMsg, setReportingMsg] = useState<ChatMessage | null>(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<ChatMessage | null>(null);
  const [customEmojiOpen, setCustomEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 荒らし対策用の送信監視
  const lastSendTimeRef = useRef<number>(0);
  const lastSentTextRef = useRef<string>("");

  const table = source.kind === "channel" ? "messages" : "direct_messages";
  const filterKey = source.kind === "channel" ? "channel_id" : "dm_id";
  const filterVal = source.kind === "channel" ? source.channelId : source.dmId;
  const communityId = source.kind === "channel" ? source.communityId : undefined;

  const key = useMemo(
    () => ["chat", table, filterVal, threadRootId ?? "main"],
    [table, filterVal, threadRootId],
  );

  const customEmojis = useCustomEmojis(communityId);
  const memberRoles = useQuery({
    ...memberRolesQuery(communityId),
    enabled: !!communityId,
  });
  const rolesByUser = useMemo(() => groupMemberRoles(memberRoles.data), [memberRoles.data]);

  const threadStats = useQuery({
    queryKey: ["thread-stats", filterVal],
    enabled: source.kind === "channel" && !threadRootId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("thread_root_id, created_at")
        .eq("channel_id", filterVal)
        .not("thread_root_id", "is", null);
      if (error) throw error;
      const map = new Map<string, { count: number; last: string }>();
      for (const r of data ?? []) {
        const rootId = r.thread_root_id as string;
        const cur = map.get(rootId);
        if (!cur) map.set(rootId, { count: 1, last: r.created_at });
        else map.set(rootId, { count: cur.count + 1, last: r.created_at > cur.last ? r.created_at : cur.last });
      }
      return map;
    },
  });

  const polls = useQuery({
    ...channelPollsQuery(source.kind === "channel" ? source.channelId : ""),
    enabled: source.kind === "channel",
  });
  const pollByMessage = useMemo(() => {
    const m = new Map<string, Poll>();
    for (const p of polls.data ?? []) if (p.message_id) m.set(p.message_id, p);
    return m;
  }, [polls.data]);

  // ショップで購入したスタンプ
  const purchases = useQuery({
    ...myPurchasesQuery(me.data?.id),
    enabled: !!me.data?.id,
  });

  // 絵文字とショップスタンプを合体
  const allEmojis = useMemo(() => {
    const shopEmojis = (purchases.data ?? [])
      .filter((p) => (p.item?.kind === "sticker" || p.item?.kind === "emoji") && p.item.image_url)
      .map((p) => ({
        id: p.id,
        name: p.item!.payload || p.item!.name,
        image_url: p.item!.image_url!,
      }));
    return [...customEmojis, ...shopEmojis];
  }, [customEmojis, purchases.data]);

  // Realtime購読（省エネデバウンス対応）
  useEffect(() => {
    let messageTimer: ReturnType<typeof setTimeout> | null = null;
    let sideTimer: ReturnType<typeof setTimeout> | null = null;

    const refetchMessages = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (messageTimer) return;
      messageTimer = setTimeout(() => {
        messageTimer = null;
        qc.invalidateQueries({ queryKey: ["chat", table, filterVal] });
        qc.invalidateQueries({ queryKey: ["thread-stats", filterVal] });
      }, 800);
    };

    const refetchSide = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (sideTimer) return;
      sideTimer = setTimeout(() => {
        sideTimer = null;
        qc.invalidateQueries({ queryKey: ["chat", table, filterVal] });
      }, 4000);
    };

    const channelName = `chat-${table}-${filterVal}-${threadRootId ?? "main"}`;
    const sub = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `${filterKey}=eq.${filterVal}` }, refetchMessages);

    if (source.kind === "channel") {
      sub
        .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, refetchSide)
        .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, refetchSide);
    }
    sub.subscribe();

    return () => {
      if (messageTimer) clearTimeout(messageTimer);
      if (sideTimer) clearTimeout(sideTimer);
      supabase.removeChannel(sub);
    };
  }, [table, filterVal, filterKey, source.kind, threadRootId, qc]);

  const messages = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from(table)
        .select(
          table === "messages"
            ? "*, author:profiles!messages_user_id_fkey(*), reactions:message_reactions(*)"
            : "*, author:profiles!direct_messages_user_id_fkey(*)",
        )
        .eq(filterKey, filterVal)
        .order("created_at", { ascending: true })
        .limit(100);

      if (source.kind === "channel") {
        if (threadRootId) q = q.eq("thread_root_id", threadRootId);
        else q = q.is("thread_root_id", null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!me.data) return;
      const content = text.trim();
      if (!content && !file) return;

      // --- 荒らし対策: 連投と重複テキストチェック ---
      const now = Date.now();
      if (now - lastSendTimeRef.current < 1500) {
        throw new Error("メッセージ送信の間隔が早すぎます。少し時間を空けてください。");
      }
      if (content && content === lastSentTextRef.current && now - lastSendTimeRef.current < 5000) {
        throw new Error("同じメッセージを連続して送信することはできません。");
      }
      lastSendTimeRef.current = now;
      lastSentTextRef.current = content;

      let attachment_url: string | null = null;
      let attachment_type: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${source.kind}/${filterVal}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        attachment_url = await uploadFile("attachments", path, file);
        attachment_type = file.type.startsWith("image/") ? "image" : "file";
      }

      if (editing) {
        const { error } = await supabase
          .from(table)
          .update({ content, edited_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
        return;
      }

      const payload: Record<string, unknown> = {
        [filterKey]: filterVal,
        user_id: me.data.id,
        content: content || (file ? "添付ファイル" : ""),
        reply_to: replyTo?.id ?? null,
        attachment_url,
        attachment_type,
      };
      if (source.kind === "channel") {
        payload.thread_root_id = threadRootId ?? null;
      }

      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;

      if (source.kind === "channel") {
        recordActivity(me.data.id, "post_message", {
          community_id: source.communityId,
          channel_id: source.channelId,
        });
      }

      const targets = new Set<string>();
      const linkBase =
        source.kind === "channel"
          ? `/c/${source.communityId}/ch/${source.channelId}`
          : `/dm/${source.dmId}`;
      if (replyTo && replyTo.user_id !== me.data.id) targets.add(replyTo.user_id);
      const mentions = content.match(/@([a-z0-9_]+)/gi) ?? [];
      for (const m of mentions) {
        const p = members?.find((x) => x.username === m.slice(1).toLowerCase());
        if (p && p.id !== me.data.id) targets.add(p.id);
      }
      if (targets.size) {
        await supabase.from("notifications").insert(
          [...targets].map((user_id) => ({
            user_id,
            actor_id: me.data!.id,
            type: replyTo && replyTo.user_id === user_id ? "reply" : "mention",
            content:
              replyTo && replyTo.user_id === user_id
                ? `${me.data!.display_name}: ${content.slice(0, 80)}`
                : `${me.data!.display_name}さんがあなたをメンションしました`,
            link: linkBase,
          })),
        );
      }
    },
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      setEditing(null);
      setFile(null);
      setFilePreview(null);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["thread-stats", filterVal] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "メッセージを送信できませんでした。");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("メッセージを削除しました");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("この操作を実行する権限がありません。"),
  });

  const togglePin = useMutation({
    mutationFn: async (m: ChatMessage) => {
      const { error } = await supabase.from("messages").update({ is_pinned: !m.is_pinned }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const react = useMutation({
    mutationFn: async ({ m, emoji }: { m: ChatMessage; emoji: string }) => {
      const mine = m.reactions?.find((r) => r.user_id === me.data!.id && r.emoji === emoji);
      if (mine) {
        const { error } = await supabase.from("message_reactions").delete().eq("id", mine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_reactions")
          .insert({ message_id: m.id, user_id: me.data!.id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const copyLink = (m: ChatMessage) => {
    const url = new URL(window.location.href);
    url.hash = `msg-${m.id}`;
    navigator.clipboard.writeText(url.toString());
    toast.success("メッセージのリンクをコピーしました");
  };

  const report = (m: ChatMessage) => setReportingMsg(m);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const canPost = source.kind === "channel" ? source.canPost : true;
  const canModerate = source.kind === "channel" && source.canModerate;

  const userIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of messages.data ?? []) s.add(m.user_id);
    return Array.from(s);
  }, [messages.data]);
  const cosmeticsMap = useCosmetics(userIds);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {!compact && (
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            {source.kind === "channel" && <Hash className="size-5 shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{title}</h2>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">{headerExtra}</div>
        </header>
      )}

      <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.isLoading && <LoadingState />}
        {messages.isError && <ErrorState message="メッセージを読み込めませんでした。" />}
        {messages.data?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <MessagesSquare className="mb-2 size-10 stroke-[1.5]" />
            <p className="text-sm font-medium">まだメッセージはありません</p>
            <p className="text-xs">最初のメッセージを投稿してみましょう！</p>
          </div>
        )}

        {messages.data?.map((m) => {
          const isMine = m.user_id === me.data?.id;
          const canEdit = isMine;
          const canDelete = isMine || canModerate;
          const isOthers = !isMine;
          const poll = pollByMessage.get(m.id);
          const threadInfo = threadStats.data?.get(m.id);
          const isReplying = replyTo?.id === m.id;
          const userRolesList = rolesByUser.get(m.user_id) ?? [];
          const cosmetic = cosmeticsMap[m.user_id];

          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={cn(
                "group relative flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40",
                isReplying && "bg-muted/60",
                m.is_pinned && "border-l-2 border-primary bg-primary/5",
              )}
              onContextMenu={(e) => {
                e.preventDefault();
                setSheetMessage(m);
              }}
            >
              <Link to="/u/$userId" params={{ userId: m.user_id }}>
                <UserAvatar
                  src={m.author?.avatar_url}
                  fallback={m.author?.display_name || "U"}
                  size="md"
                  frame={cosmetic?.frame}
                  frameImage={cosmetic?.frame_image}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Link to="/u/$userId" params={{ userId: m.user_id }} className="font-semibold hover:underline">
                    {m.author?.display_name || "ユーザー"}
                  </Link>
                  <NameDecorations
                    title={cosmetic?.title}
                    roles={userRolesList}
                    maxRoles={2}
                    size="sm"
                  />
                  <span className="text-muted-foreground">{chatTime(m.created_at)}</span>
                  {m.edited_at && <span className="text-muted-foreground">(編集済)</span>}
                  {m.is_pinned && (
                    <span className="inline-flex items-center gap-0.5 text-primary">
                      <Pin className="size-3" /> ピン留め
                    </span>
                  )}
                </div>

                {m.reply_to && (
                  <div className="my-1 rounded border-l-2 border-primary/50 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                    <Reply className="mr-1 inline size-3" /> 返信先メッセージ
                  </div>
                )}

                <div className="break-words text-sm leading-relaxed text-foreground">
                  <Highlight text={m.content} emojis={allEmojis} />
                </div>

                {poll && (
                  <div className="mt-2">
                    <PollCard poll={poll} currentUserId={me.data?.id} />
                  </div>
                )}

                {m.attachment_url && (
                  <Attachment path={m.attachment_url} type={m.attachment_type} />
                )}

                {m.reactions && m.reactions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(new Set(m.reactions.map((r) => r.emoji))).map((emoji) => {
                      const count = m.reactions!.filter((r) => r.emoji === emoji).length;
                      const hasMine = m.reactions!.some((r) => r.emoji === emoji && r.user_id === me.data?.id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => react.mutate({ m, emoji })}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                            hasMine ? "border-primary bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {source.kind === "channel" && !threadRootId && onOpenThread && (
                  <div className="mt-1">
                    <button
                      onClick={() => onOpenThread(m)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <MessagesSquare className="size-3.5" />
                      {threadInfo ? `${threadInfo.count} 件の返信` : "スレッドを開始"}
                    </button>
                  </div>
                )}
              </div>

                <div className="absolute right-2 top-2 hidden items-center gap-0.5 rounded-lg border bg-background/95 p-0.5 shadow-sm backdrop-blur group-hover:flex">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="rounded p-1 hover:bg-muted" title="リアクション">
                        <SmilePlus className="size-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1" align="end">
                      <div className="flex gap-1">
                        {QUICK_EMOJIS.map((e) => (
                          <button
                            key={e}
                            className="p-1 hover:scale-125 transition-transform"
                            onClick={() => react.mutate({ m, emoji: e })}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <IconBtn label="返信" onClick={() => setReplyTo(m)}>
                    <Reply className="size-3.5" />
                  </IconBtn>
                  <IconBtn label="ブックマーク" onClick={() => saved.toggle(m.id)}>
                    {saved.isSaved(m.id) ? (
                      <BookmarkCheck className="size-3.5 text-primary" />
                    ) : (
                      <Bookmark className="size-3.5" />
                    )}
                  </IconBtn>
                  {canModerate && (
                    <IconBtn label={m.is_pinned ? "ピン解除" : "ピン留め"} onClick={() => togglePin.mutate(m)}>
                      <Pin className={cn("size-3.5", m.is_pinned && "text-primary")} />
                    </IconBtn>
                  )}
                  {canEdit && (
                    <IconBtn
                      label="編集"
                      onClick={() => {
                        setReplyTo(null);
                        setEditing(m);
                        setText(m.content);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </IconBtn>
                  )}
                  {canDelete && (
                    <IconBtn
                      label={isOthers ? "モデレーターとして削除" : "削除"}
                      onClick={() => {
                        if (isOthers && !confirm("このメッセージをモデレーターとして削除しますか？")) return;
                        remove.mutate(m.id);
                      }}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </IconBtn>
                  )}
                </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <Sheet open={!!sheetMessage} onOpenChange={(o) => !o && setSheetMessage(null)}>
        <SheetContent side="bottom" className="p-4">
          <SheetHeader>
            <SheetTitle>メッセージ操作</SheetTitle>
          </SheetHeader>
          {sheetMessage && (
            <div className="mt-4 grid gap-2">
              <SheetAction
                icon={Reply}
                label="返信"
                onClick={() => {
                  setReplyTo(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Copy}
                label="リンクをコピー"
                onClick={() => {
                  copyLink(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={sheetMessage.is_pinned ? Pin : Pin}
                label={sheetMessage.is_pinned ? "ピン解除" : "ピン留め"}
                show={canModerate}
                onClick={() => {
                  togglePin.mutate(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Pencil}
                label="編集"
                show={sheetMessage.user_id === me.data?.id}
                onClick={() => {
                  setReplyTo(null);
                  setEditing(sheetMessage);
                  setText(sheetMessage.content);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Trash2}
                label={sheetMessage.user_id === me.data?.id ? "削除" : "モデレーターとして削除"}
                destructive
                show={sheetMessage.user_id === me.data?.id || canModerate}
                onClick={() => {
                  const isOthers = sheetMessage.user_id !== me.data?.id;
                  if (isOthers && !confirm("このメッセージを削除しますか？")) return;
                  remove.mutate(sheetMessage.id);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Flag}
                label="通報する"
                show={sheetMessage.user_id !== me.data?.id}
                onClick={() => {
                  report(sheetMessage);
                  setSheetMessage(null);
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {reportingMsg && (
        <ReportDialog
          open={!!reportingMsg}
          onOpenChange={(o) => !o && setReportingMsg(null)}
          target={{
            type: "message",
            id: reportingMsg.id,
            communityId,
            reportedUserId: reportingMsg.user_id,
            snippet: reportingMsg.content,
          }}
        />
      )}

      {source.kind === "channel" && (
        <CreatePollDialog
          open={showPollDialog}
          onOpenChange={setShowPollDialog}
          channelId={source.channelId}
        />
      )}

      <div className="border-t p-3">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded bg-muted/60 px-3 py-1.5 text-xs">
            <span className="truncate">
              <Reply className="mr-1 inline size-3" />
              <strong>{replyTo.author?.display_name}</strong> に返信中: {replyTo.content.slice(0, 50)}
            </span>
            <button onClick={() => setReplyTo(null)} className="hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {editing && (
          <div className="mb-2 flex items-center justify-between rounded bg-muted/60 px-3 py-1.5 text-xs">
            <span className="truncate">
              <Pencil className="mr-1 inline size-3" /> メッセージを編集中
            </span>
            <button
              onClick={() => {
                setEditing(null);
                setText("");
              }}
              className="hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {file && (
          <div className="mb-2 flex items-center gap-2 rounded border bg-muted/30 p-2 text-xs">
            {filePreview ? (
              <img src={filePreview} alt="preview" className="size-10 rounded object-cover" />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" />
            )}
            <span className="flex-1 truncate">{file.name}</span>
            <button
              onClick={() => {
                setFile(null);
                setFilePreview(null);
              }}
              className="rounded p-1 hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {!canPost ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Lock className="size-4" />
            <span>{postDisabledNote || "このチャンネルには投稿できません"}</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (f.type.startsWith("image/")) {
                    setFilePreview(URL.createObjectURL(f));
                  }
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="ファイルを添付"
            >
              <Paperclip className="size-4" />
            </Button>

            <Popover open={customEmojiOpen} onOpenChange={setCustomEmojiOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 shrink-0" title="スタンプ・絵文字">
                  <SmilePlus className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <CustomEmojiPicker
                  communityId={communityId}
                  onPick={(token) => {
                    setText((prev) => prev + token);
                    setCustomEmojiOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>

            {source.kind === "channel" && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => setShowPollDialog(true)}
                title="投票を作成"
              >
                <BarChart3 className="size-4" />
              </Button>
            )}

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send.mutate();
                }
              }}
              placeholder="メッセージを入力... (Enterで送信, Shift+Enterで改行)"
              rows={1}
              className="min-h-[38px] resize-none py-2"
            />

            <Button
              size="icon"
              className="size-9 shrink-0"
              disabled={(!text.trim() && !file) || send.isPending}
              onClick={() => send.mutate()}
            >
              <Send className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SheetAction({
  icon: Icon,
  label,
  onClick,
  destructive,
  show = true,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  show?: boolean;
}) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Highlight({
  text,
  emojis = [],
}: {
  text: string;
  emojis?: { name: string; image_url: string }[];
}) {
  const parts = text.split(/(@[a-z0-9_]+|https?:\/\/\S+)/gi);
  return (
    <>
      {parts.map((p, i) => {
        if (/^@/.test(p))
          return (
            <span key={i} className="rounded bg-primary/20 px-1 font-medium text-primary">
              {p}
            </span>
          );
        if (/^https?:\/\//.test(p))
          return (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
              {p}
            </a>
          );
        return (
          <span key={i}>
            {renderEmojiParts(p, emojis).map((part, j) =>
              typeof part === "string" ? <span key={j}>{part}</span> : <EmojiImage key={j} emoji={part} />,
            )}
          </span>
        );
      })}
    </>
  );
}

function Attachment({ path, type }: { path: string; type: string | null }) {
  const { data: url } = useSignedUrl(path);
  if (!url) return <div className="mt-1 h-24 w-40 animate-pulse rounded-lg bg-muted" />;
  if (type === "image")
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img src={url} alt="添付画像" loading="lazy" className="max-h-72 max-w-full rounded-lg border object-contain" />
      </a>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-accent"
    >
      <ImageIcon className="size-4" /> ファイルを開く
    </a>
  );
}
