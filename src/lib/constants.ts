export const APP_NAME = "Nexa";

export const CATEGORIES = [
  "すべて",
  "ゲーム",
  "アニメ",
  "音楽",
  "映画",
  "テクノロジー",
  "プログラミング",
  "AI",
  "クリエイター",
  "イラスト",
  "スポーツ",
  "趣味",
  "雑談",
  "その他",
] as const;

export const CREATE_CATEGORIES = CATEGORIES.filter((c) => c !== "すべて");

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  member: "Member",
};

export const STATUS_LABEL: Record<string, string> = {
  online: "オンライン",
  idle: "退席中",
  dnd: "取り込み中",
  offline: "オフライン",
};

export const STATUS_COLOR: Record<string, string> = {
  online: "bg-online",
  idle: "bg-idle",
  dnd: "bg-dnd",
  offline: "bg-offline",
};

export const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🔥"];
