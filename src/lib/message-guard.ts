/** メッセージ送信前の整形・荒らし対策 */
export const MAX_CHARS = 2000;
export const MAX_LINES = 20;

const INVISIBLE = /[\u200B-\u200F\u2060-\u2064\uFEFF\u00AD\u180E]/g;
const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;

export function sanitizeMessage(raw: string) {
  let s = raw.normalize("NFC").replace(/\r\n?/g, "\n");
  s = s.replace(INVISIBLE, "").replace(BIDI, "");
  // 結合文字（Zalgo）は1文字あたり最大2個まで
  s = s.replace(/(\p{M}{2})\p{M}+/gu, "$1");
  // 3つ以上の連続改行は2つに圧縮
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/** 問題があればエラーメッセージを返す */
export function validateMessage(s: string): string | null {
  if (s.length > MAX_CHARS) return `メッセージは${MAX_CHARS}文字までです`;
  if (s.split("\n").length > MAX_LINES) return `改行は${MAX_LINES}行までです`;
  return null;
}

const essence = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

type State = { times: number[]; lastEssence: string; lastAt: number; penalty: number; blockedUntil: number };
const state: State = { times: [], lastEssence: "", lastAt: 0, penalty: 0, blockedUntil: 0 };

/** 連投チェック。送ってよければ null、ダメならエラー文 */
export function checkRate(content: string, now = Date.now()): string | null {
  if (now < state.blockedUntil) {
    return `送信が速すぎます。あと${Math.ceil((state.blockedUntil - now) / 1000)}秒お待ちください`;
  }
  state.times = state.times.filter((t) => now - t < 5000);
  const last = state.times[state.times.length - 1];
  const e = essence(content);
  let reason: string | null = null;
  if (last && now - last < 1500) reason = "送信が速すぎます。少し時間を空けてください";
  else if (state.times.length >= 3) {
    state.penalty = Math.min(state.penalty + 1, 6);
    state.blockedUntil = now + Math.min(3000 * state.penalty, 30000);
    reason = `連投が多すぎます。${Math.ceil((state.blockedUntil - now) / 1000)}秒お待ちください`;
  } else if (e && e === state.lastEssence && now - state.lastAt < 10000) {
    reason = "同じ内容は続けて送れません";
  }
  if (reason) return reason;
  if (last && now - last > 30000) state.penalty = 0;
  state.times.push(now);
  state.lastEssence = e;
  state.lastAt = now;
  return null;
}
