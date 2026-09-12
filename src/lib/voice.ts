import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** ボイスチャンネル参加者 */
export type VoiceParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  muted: boolean;
  speaking: boolean;
  self: boolean;
};

type PresenceMeta = { user_id: string; name: string; avatar_url: string | null; muted: boolean };

type SignalPayload = {
  from: string;
  to: string;
  kind: "offer" | "answer" | "candidate";
  sdp?: { type: RTCSdpType; sdp?: string | undefined };
  candidate?: RTCIceCandidateInit;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export type VoiceState = "idle" | "connecting" | "connected" | "error";

export function useVoiceRoom(opts: {
  channelId: string;
  me: { id: string; name: string; avatarUrl: string | null } | null;
}) {
  const { channelId, me } = opts;
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [peers, setPeers] = useState<Record<string, PresenceMeta>>({});
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});

  const rtcRef = useRef(new Map<string, RTCPeerConnection>());
  const audioRef = useRef(new Map<string, HTMLAudioElement>());
  const streamRef = useRef<MediaStream | null>(null);
  const chanRef = useRef<RealtimeChannel | null>(null);
  const analysersRef = useRef(new Map<string, { ctx: AudioContext; raf: number }>());
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const watchLevel = useCallback((id: string, stream: MediaStream) => {
    try {
      const AC: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (const v of buf) sum += v;
        const level = sum / buf.length;
        const isSpeaking = level > 12;
        setSpeaking((prev) => (prev[id] === isSpeaking ? prev : { ...prev, [id]: isSpeaking }));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      analysersRef.current.set(id, { ctx, raf: 0 });
      analysersRef.current.set(id, { ctx, raf });
    } catch {
      /* 音量解析が使えない環境では無視 */
    }
  }, []);

  const cleanup = useCallback(() => {
    for (const pc of rtcRef.current.values()) pc.close();
    rtcRef.current.clear();
    for (const el of audioRef.current.values()) {
      el.srcObject = null;
      el.remove();
    }
    audioRef.current.clear();
    for (const a of analysersRef.current.values()) {
      cancelAnimationFrame(a.raf);
      void a.ctx.close();
    }
    analysersRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (chanRef.current) {
      void supabase.removeChannel(chanRef.current);
      chanRef.current = null;
    }
    setPeers({});
    setSpeaking({});
    setState("idle");
  }, []);

  useEffect(() => cleanup, [cleanup, channelId]);

  const send = useCallback((payload: SignalPayload) => {
    void chanRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const ensurePeer = useCallback(
    (peerId: string, polite: boolean) => {
      let pc = rtcRef.current.get(peerId);
      if (pc) return pc;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      rtcRef.current.set(peerId, pc);
      streamRef.current?.getTracks().forEach((t) => pc!.addTrack(t, streamRef.current!));
      pc.onicecandidate = (e) => {
        if (e.candidate && me) send({ from: me.id, to: peerId, kind: "candidate", candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        let el = audioRef.current.get(peerId);
        if (!el) {
          el = document.createElement("audio");
          el.autoplay = true;
          audioRef.current.set(peerId, el);
          document.body.appendChild(el);
        }
        el.srcObject = stream;
        el.muted = deafened;
        void el.play().catch(() => undefined);
        watchLevel(peerId, stream);
      };
      if (!polite && me) {
        void (async () => {
          const offer = await pc!.createOffer();
          await pc!.setLocalDescription(offer);
          send({ from: me.id, to: peerId, kind: "offer", sdp: { type: offer.type, sdp: offer.sdp } });
        })();
      }
      return pc;
    },
    [deafened, me, send, watchLevel],
  );

  const connect = useCallback(async () => {
    if (!me || state === "connecting" || state === "connected") return;
    setError(null);
    setState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      watchLevel(me.id, stream);

      const chan = supabase.channel(`voice:${channelId}`, {
        config: { presence: { key: me.id } },
      });
      chanRef.current = chan;

      chan.on("presence", { event: "sync" }, () => {
        const s = chan.presenceState<PresenceMeta>();
        const next: Record<string, PresenceMeta> = {};
        for (const [key, metas] of Object.entries(s)) {
          const m = metas[0];
          if (m) next[key] = m;
        }
        setPeers(next);
        for (const peerId of Object.keys(next)) {
          if (peerId === me.id) continue;
          // 片方だけがofferを作るようにIDで役割を決める
          ensurePeer(peerId, me.id < peerId);
        }
        for (const peerId of [...rtcRef.current.keys()]) {
          if (!next[peerId]) {
            rtcRef.current.get(peerId)?.close();
            rtcRef.current.delete(peerId);
            const el = audioRef.current.get(peerId);
            if (el) {
              el.srcObject = null;
              el.remove();
              audioRef.current.delete(peerId);
            }
          }
        }
      });

      chan.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const msg = payload as SignalPayload;
        if (!msg || msg.to !== me.id) return;
        const pc = ensurePeer(msg.from, true);
        try {
          if (msg.kind === "offer" && msg.sdp) {
            await pc.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ from: me.id, to: msg.from, kind: "answer", sdp: { type: answer.type, sdp: answer.sdp } });
          } else if (msg.kind === "answer" && msg.sdp) {
            await pc.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
          } else if (msg.kind === "candidate" && msg.candidate) {
            await pc.addIceCandidate(msg.candidate);
          }
        } catch {
          /* 接続交渉の一時的な失敗は無視 */
        }
      });

      await new Promise<void>((resolve, reject) => {
        chan.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
        });
      });
      await chan.track({ user_id: me.id, name: me.name, avatar_url: me.avatarUrl, muted: false });
      setState("connected");
    } catch (e) {
      cleanup();
      setState("error");
      setError(
        e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")
          ? "マイクの使用が許可されていません。ブラウザの設定を確認してください。"
          : "接続できませんでした。時間をおいて再度お試しください。",
      );
    }
  }, [channelId, cleanup, ensurePeer, me, send, state, watchLevel]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    if (me) void chanRef.current?.track({ user_id: me.id, name: me.name, avatar_url: me.avatarUrl, muted: next });
  }, [me]);

  const toggleDeafen = useCallback(() => {
    setDeafened((prev) => {
      const next = !prev;
      for (const el of audioRef.current.values()) el.muted = next;
      return next;
    });
  }, []);

  const participants = useMemo<VoiceParticipant[]>(
    () =>
      Object.values(peers).map((p) => ({
        userId: p.user_id,
        name: p.name,
        avatarUrl: p.avatar_url,
        muted: p.user_id === me?.id ? muted : p.muted,
        speaking: !!speaking[p.user_id] && !(p.user_id === me?.id ? muted : p.muted),
        self: p.user_id === me?.id,
      })),
    [peers, me?.id, muted, speaking],
  );

  return {
    state,
    error,
    muted,
    deafened,
    participants,
    connect,
    disconnect: cleanup,
    toggleMute,
    toggleDeafen,
  };
}
