import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ja } from "date-fns/locale";

export function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ja });
}

export function chatTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `昨日 ${format(d, "HH:mm")}`;
  return format(d, "M/d HH:mm");
}

export function shortDate(iso: string) {
  return format(new Date(iso), "yyyy/M/d");
}

export function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}
