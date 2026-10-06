/** 深夜帯（日本時間 1:00〜7:00）は利用者が少ないため、自動更新の間隔を広げて通信を節約する */
export function isQuietHours(date = new Date()) {
  const jstHour = (date.getUTCHours() + 9) % 24;
  return jstHour >= 1 && jstHour < 7;
}

/** 通常時の待ち時間を深夜帯だけ倍率で延ばす */
export function throttleDelay(baseMs: number, quietMultiplier = 4) {
  return isQuietHours() ? baseMs * quietMultiplier : baseMs;
}
