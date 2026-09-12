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
import { useCustomEmojis, type CustomEmoji as Emoji } from "@/lib/community-extras";
import { PollCard, CreatePollDialog } from "./PollCard";
import { ReportDialog } from "./ReportDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingState, ErrorState } from "./EmptyState";
import type { Profile } from "@/lib/queries";

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
  subtitle?: string | undefined;
  members?: Profile[] | undefined;
  headerExtra?: React.ReactNode;
  /** 指定するとスレッド内の返信のみを表示する */
  threadRootId?: string | undefined;
  onOpenThread?: ((m: ChatMessage) => void) | undefined;
  compact?: boolean | undefined;
  /** 投稿できない理由の説明文（未指定なら参加を促す文言） */
  postDisabledNote?: string | undefined;
}) {
  const me = useMe();
  const qc = useQueryClient();
  const saved = useSaved();
  const customEmojis = useCustomEmojis(source.kind === "channel" ? source.communityId : undefined);
  const table = source.kind === "channel" ? "messages" : "dm_messages";
  const filterCol = source.kind === "channel" ? "channel_id" : "dm_id";
  const filterVal = source.kind === "channel" ? source.channelId : source.dmId;
  const key = ["chat", table, filterVal, threadRootId ?? "main"];
  const canPost = source.kind === "dm" ? true : source.canPost;
  const linkBase =
    source.kind === "channel" ? `/c/${source.communityId}/ch/${source.channelId}` : `/dm/${source.dmId}`;

  const messages = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ChatMessage[]> => {
      if (source.kind === "channel") {
        let q = supabase
          .from("messages")
          .select("*, author:profiles!messages_user_id_fkey(*), reactions:message_reactions(*)")
          .eq("channel_id", source.channelId);
        q = threadRootId ? q.eq("thread_root_id", threadRootId) : q.is("thread_root_id", null);
        const { data, error } = await q.order("created_at", { ascending: true }).limit(200);
        if (error) throw error;
        return data as unknown as ChatMessage[];
      }
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*, author:profiles!dm_messages_user_id_fkey(*)")
        .eq("dm_id", source.dmId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as unknown as ChatMessage[];
    },
  });

  // スレッド返信数・最終返信
  const threadStats = useQuery({
    queryKey: ["thread-stats", filterVal],
    enabled: source.kind === "channel" && !threadRootId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, thread_root_id, created_at")
        .eq("channel_id", filterVal)
        .not("thread_root_id", "is", null);
      if (error) throw error;
      const map = new Map<string, { count: number; last: string }>();
      for (const r of data) {
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

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${table}-${filterVal}-${threadRootId ?? "main"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `${filterCol}=eq.${filterVal}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat", table, filterVal] });
        qc.invalidateQueries({ queryKey: ["thread-stats", filterVal] });
      });
    if (source.kind === "channel") {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        qc.invalidateQueries({ queryKey: ["chat", table, filterVal] }),
      );
      ch.on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () =>
        qc.invalidateQueries({ queryKey: ["polls"] }),
      );
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filterVal, threadRootId]);

  // mark DM read
  useEffect(() => {
    if (source.kind !== "dm" || !me.data || !messages.data) return;
    supabase
      .from("dm_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("dm_id", source.dmId)
      .eq("user_id", me.data.id)
      .then(() => qc.invalidateQueries({ queryKey: ["dms"] }));
  }, [source, me.data, messages.data, qc]);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<ChatMessage | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  async function insertMessage(content: string) {
    if (source.kind !== "channel") throw new Error("チャンネルではありません");
    const { data, error } = await supabase
      .from("messages")
      .insert({
        user_id: me.data!.id,
        content,
        channel_id: source.channelId,
        community_id: source.communityId,
        thread_root_id: threadRootId ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: key });
    return data.id as string;
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!me.data) throw new Error("サインインしてください");
      const content = text.trim();
      if (!content && !file) return;
      let attachment_url: string | null = null;
      let attachment_type: string | null = null;
      if (file) {
        attachment_url = await uploadFile(me.data.id, file);
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
      const base = { user_id: me.data.id, content, reply_to: replyTo?.id ?? null, attachment_url, attachment_type };
      const { error } =
        source.kind === "channel"
          ? await supabase.from("messages").insert({
              ...base,
              channel_id: source.channelId,
              community_id: source.communityId,
              thread_root_id: threadRootId ?? null,
            })
          : await supabase.from("dm_messages").insert({ ...base, dm_id: source.dmId });
      if (error) throw error;

      // メンション・返信通知
      const targets = new Set<string>();
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
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["thread-stats", filterVal] });
    },
    onError: () => toast.error("メッセージを送信できませんでした。"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
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
    onError: (e) => toast.error(e.message),
  });

  const byId = useMemo(() => new Map(messages.data?.map((m) => [m.id, m])), [messages.data]);
  const pinned = messages.data?.filter((m) => m.is_pinned) ?? [];
  const mentionCandidates =
    mentionQuery !== null
      ? (members ?? []).filter((p) => p.username.startsWith(mentionQuery.toLowerCase())).slice(0, 5)
      : [];

  function toggleSave(m: ChatMessage) {
    saved.toggle.mutate({
      kind: source.kind === "channel" ? "message" : "dm_message",
      refId: m.id,
      link: linkBase,
      preview: `${m.author?.display_name ?? ""}: ${m.content}`,
    });
  }

  function copyText(m: ChatMessage) {
    navigator.clipboard?.writeText(m.content).then(
      () => toast.success("コピーしました"),
      () => toast.error("コピーできませんでした。"),
    );
  }

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}${linkBase}`).then(
      () => toast.success("リンクをコピーしました"),
      () => toast.error("コピーできませんでした。"),
    );
  }

  function report(m: ChatMessage) {
    setReportTarget(m);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send.mutate();
    }
    if (e.key === "Escape") {
      setReplyTo(null);
      setEditing(null);
      setText("");
    }
  }

  function onChange(v: string) {
    setText(v);
    const m = v.slice(0, v.length).match(/@([a-z0-9_]*)$/i);
    setMentionQuery(m ? m[1]! : null);
  }

  const canModerate = source.kind === "channel" && source.canModerate;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!compact && (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          {source.kind === "channel" ? <Hash className="size-4 text-muted-foreground" /> : null}
          <h2 className="truncate font-bold">{title}</h2>
          {subtitle && <span className="hidden truncate text-sm text-muted-foreground sm:inline">— {subtitle}</span>}
          <div className="flex-1" />
          {source.kind === "channel" && pinned.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPinned((s) => !s)}
              className="gap-1 text-muted-foreground"
            >
              <Pin className="size-4" /> {pinned.length}
            </Button>
          )}
          {headerExtra}
        </header>
      )}

      {showPinned && pinned.length > 0 && (
        <div className="max-h-40 shrink-0 overflow-y-auto border-b bg-card px-4 py-2 text-sm">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">ピン留め</p>
          {pinned.map((m) => (
            <p key={m.id} className="truncate">
              <span className="font-medium">{m.author?.display_name}</span>: {m.content}
            </p>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 md:px-4">
        {messages.isLoading && <LoadingState />}
        {messages.isError && <ErrorState message={messages.error.message} onRetry={() => messages.refetch()} />}
        {messages.data?.length === 0 && (
          <div className="px-2 py-10 text-center text-sm text-muted-foreground">
            {threadRootId ? "このスレッドにはまだ返信がありません。" : "まだメッセージはありません。最初の一言をどうぞ。"}
          </div>
        )}
        {messages.data?.map((m, i) => {
          const prev = messages.data![i - 1];
          const grouped =
            prev &&
            prev.user_id === m.user_id &&
            !m.reply_to &&
            new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
          const parent = m.reply_to ? byId.get(m.reply_to) : null;
          const isMine = m.user_id === me.data?.id;
          const canEdit = isMine;
          const canDelete = isMine || canModerate;
          const stats = threadStats.data?.get(m.id);
          const poll = pollByMessage.get(m.id);
          return (
            <div
              key={m.id}
              onTouchStart={() => {
                longPress.current = setTimeout(() => setSheetMessage(m), 500);
              }}
              onTouchEnd={() => longPress.current && clearTimeout(longPress.current)}
              onTouchMove={() => longPress.current && clearTimeout(longPress.current)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSheetMessage(m);
              }}
              className={cn(
                "group relative flex gap-3 rounded-lg px-2 hover:bg-surface-hover/60",
                grouped ? "py-0.5" : "mt-3 py-1",
                m.is_pinned && "border-l-2 border-primary/60",
              )}
            >
              <div className="w-10 shrink-0">
                {!grouped && m.author && (
                  <Link to="/u/$userId" params={{ userId: m.user_id }}>
                    <UserAvatar name={m.author.display_name} avatarUrl={m.author.avatar_url} size="md" />
                  </Link>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {parent && (
                  <p className="mb-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Reply className="size-3" /> <span className="font-medium">{parent.author?.display_name}</span>{" "}
                    {parent.content}
                  </p>
                )}
                {!grouped && (
                  <div className="flex items-baseline gap-2">
                    <Link to="/u/$userId" params={{ userId: m.user_id }} className="text-sm font-bold hover:underline">
                      {m.author?.display_name ?? "Unknown"}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">{chatTime(m.created_at)}</span>
                  </div>
                )}
                {m.content && (
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    <Highlight text={m.content} emojis={customEmojis} />
                    {m.edited_at && <span className="ml-1 text-[10px] text-muted-foreground">(編集済み)</span>}
                  </p>
                )}
                {m.attachment_url && <Attachment path={m.attachment_url} type={m.attachment_type} />}
                {poll && <PollCard poll={poll} />}
                {m.reactions && m.reactions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(
                      m.reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
                        (acc[r.emoji] ??= []).push(r);
                        return acc;
                      }, {}),
                    ).map(([emoji, rs]) => (
                      <button
                        key={emoji}
                        onClick={() => react.mutate({ m, emoji })}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-accent",
                          rs.some((r) => r.user_id === me.data?.id) && "border-primary/50 bg-primary/15",
                        )}
                      >
                        {emoji} {rs.length}
                      </button>
                    ))}
                  </div>
                )}
                {stats && onOpenThread && (
                  <button
                    onClick={() => onOpenThread(m)}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-accent/50 px-2 py-1 text-xs font-medium text-primary hover:border-primary/40"
                  >
                    <MessagesSquare className="size-3.5" /> スレッド {stats.count}件
                    <span className="font-normal text-muted-foreground">最終返信 {chatTime(stats.last)}</span>
                  </button>
                )}
              </div>

              {canPost && (
                <div className="absolute -top-3 right-2 hidden items-center rounded-lg border bg-popover shadow-md group-hover:md:flex">
                  {source.kind === "channel" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <IconBtn label="リアクション">
                          <SmilePlus className="size-4" />
                        </IconBtn>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="end">
                        <div className="flex gap-0.5">
                          {QUICK_EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => react.mutate({ m, emoji: e })}
                              className="rounded-md p-1.5 text-lg hover:bg-accent"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <IconBtn
                    label="返信"
                    onClick={() => {
                      setEditing(null);
                      setReplyTo(m);
                    }}
                  >
                    <Reply className="size-4" />
                  </IconBtn>
                  {onOpenThread && (
                    <IconBtn label="スレッド" onClick={() => onOpenThread(m)}>
                      <MessagesSquare className="size-4" />
                    </IconBtn>
                  )}
                  <IconBtn label={saved.isSaved(m.id) ? "保存を解除" : "保存"} onClick={() => toggleSave(m)}>
                    {saved.isSaved(m.id) ? (
                      <BookmarkCheck className="size-4 text-primary" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
                  </IconBtn>
                  {canModerate && (
                    <IconBtn label={m.is_pinned ? "ピン解除" : "ピン留め"} onClick={() => togglePin.mutate(m)}>
                      <Pin className={cn("size-4", m.is_pinned && "text-primary")} />
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
                      <Pencil className="size-4" />
                    </IconBtn>
                  )}
                  {canDelete && (
                    <IconBtn label="削除" onClick={() => remove.mutate(m.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </IconBtn>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* スマホ: 長押し / PC: 右クリック の操作メニュー */}
      <Sheet open={!!sheetMessage} onOpenChange={(o) => !o && setSheetMessage(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle className="truncate text-sm font-semibold">
              {sheetMessage?.author?.display_name}: {sheetMessage?.content?.slice(0, 40)}
            </SheetTitle>
          </SheetHeader>
          {sheetMessage && (
            <div className="max-h-[60dvh] overflow-y-auto p-2">
              {source.kind === "channel" && canPost && (
                <div className="flex gap-1 px-2 pb-2">
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      className="rounded-md p-2 text-xl hover:bg-accent"
                      onClick={() => {
                        react.mutate({ m: sheetMessage, emoji: e });
                        setSheetMessage(null);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <SheetAction
                icon={Reply}
                label="返信"
                show={canPost}
                onClick={() => {
                  setEditing(null);
                  setReplyTo(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={MessagesSquare}
                label="スレッドを開く"
                show={!!onOpenThread}
                onClick={() => {
                  onOpenThread?.(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={saved.isSaved(sheetMessage.id) ? BookmarkCheck : Bookmark}
                label={saved.isSaved(sheetMessage.id) ? "保存を解除" : "保存"}
                show
                onClick={() => {
                  toggleSave(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Copy}
                label="コピー"
                show
                onClick={() => {
                  copyText(sheetMessage);
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Copy}
                label="リンクをコピー"
                show
                onClick={() => {
                  copyLink();
                  setSheetMessage(null);
                }}
              />
              <SheetAction
                icon={Pin}
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
                label="削除"
                destructive
                show={sheetMessage.user_id === me.data?.id || canModerate}
                onClick={() => {
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

      {reportTarget && (
        <ReportDialog
          open
          onOpenChange={(o) => !o && setReportTarget(null)}
          targetType="message"
          targetId={reportTarget.id}
          communityId={source.kind === "channel" ? source.communityId : null}
          link={linkBase}
          preview={`${reportTarget.author?.display_name ?? ""}: ${reportTarget.content?.slice(0, 120) ?? ""}`}
        />
      )}

      <div className="shrink-0 border-t bg-background p-3">
        {!canPost ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm text-muted-foreground">
            <Lock className="size-4" /> {postDisabledNote ?? "メッセージを送るにはコミュニティに参加してください"}
          </div>
        ) : (
          <div className="relative rounded-xl border bg-card focus-within:ring-1 focus-within:ring-ring">
            {(replyTo || editing) && (
              <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
                {editing ? <Pencil className="size-3" /> : <Reply className="size-3" />}
                <span className="truncate">
                  {editing
                    ? "メッセージを編集中"
                    : `${replyTo?.author?.display_name}さんへの返信「${replyTo?.content?.slice(0, 40)}」`}
                </span>
                <button
                  className="ml-auto"
                  onClick={() => {
                    setReplyTo(null);
                    setEditing(null);
                    setText("");
                  }}
                  aria-label="返信をやめる"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            {file && (
              <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
                <Paperclip className="size-3" /> <span className="truncate">{file.name}</span>
                <button className="ml-auto" onClick={() => setFile(null)} aria-label="添付を外す">
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            {mentionCandidates.length > 0 && (
              <div className="absolute bottom-full left-2 mb-1 w-64 rounded-lg border bg-popover p-1 shadow-lg">
                {mentionCandidates.map((p) => (
                  <button
                    key={p.id}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      setText((t) => t.replace(/@([a-z0-9_]*)$/i, `@${p.username} `));
                      setMentionQuery(null);
                    }}
                  >
                    <UserAvatar
                      name={p.display_name}
                      avatarUrl={p.avatar_url}
                      size="xs"
                      showStatus={p.show_online}
                      status={p.status}
                    />
                    <span className="font-medium">{p.display_name}</span>
                    <span className="text-muted-foreground">@{p.username}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-1 p-1.5">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => fileRef.current?.click()}
                aria-label="ファイルを添付"
              >
                <Paperclip className="size-4" />
              </Button>
              {source.kind === "channel" && (
                <CustomEmojiPicker communityId={source.communityId} onPick={(token) => onChange(`${text}${token} `)} />
              )}
              {source.kind === "channel" && (
                <CreatePollDialog
                  communityId={source.communityId}
                  channelId={source.channelId}
                  onCreate={async (q) => ({ messageId: await insertMessage(`投票: ${q}`) })}
                  trigger={
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="投票を作成">
                      <BarChart3 className="size-4" />
                    </Button>
                  }
                />
              )}
              <Textarea
                value={text}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={threadRootId ? "スレッドに返信" : `#${title} にメッセージを送信`}
                className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0"
                onClick={() => send.mutate()}
                disabled={send.isPending || (!text.trim() && !file)}
                aria-label="送信"
              >
                <Send className="size-4" />
              </Button>
            </div>
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
  show,
  destructive,
}: {
  icon: typeof Reply;
  label: string;
  onClick: () => void;
  show?: boolean;
  destructive?: boolean;
}) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm hover:bg-accent",
        destructive && "text-destructive",
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Highlight({ text, emojis = [] }: { text: string; emojis?: Emoji[] }) {
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
