import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import badge from "@/assets/staff-badge.webp.asset.json";

// One small cached query for all staff; avoids per-user lookups.
export const staffQuery = {
  queryKey: ["staff-users"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("staff_users" as never);
    if (error) throw error;
    const map: Record<string, "admin" | "moderator"> = {};
    for (const r of (data ?? []) as { user_id: string; role: "admin" | "moderator" }[]) {
      if (map[r.user_id] !== "admin") map[r.user_id] = r.role;
    }
    return map;
  },
  staleTime: 30 * 60 * 1000,
};

export function StaffBadge({ userId, size = 16 }: { userId?: string | null; size?: number }) {
  const { data } = useQuery(staffQuery);
  const role = userId ? data?.[userId] : undefined;
  if (!role) return null;
  const label = role === "admin" ? "運営・管理者" : "モデレーター";
  return (
    <img
      src={badge.url}
      alt={label}
      title={label}
      width={size}
      height={size}
      className={role === "moderator" ? "inline-block shrink-0 align-middle opacity-80 hue-rotate-[100deg]" : "inline-block shrink-0 align-middle"}
      style={{ width: size, height: size }}
    />
  );
}
