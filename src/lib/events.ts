import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/queries";

/* ---------------- イベント ---------------- */

export type RsvpStatus = "going" | "maybe" | "declined";

export const RSVP_LABEL: Record<RsvpStatus, string> = {
  going: "参加する",
  maybe: "未定",
  declined: "参加しない",
};

export type Rsvp = { id: string; event_id: string; user_id: string; status: RsvpStatus };

export type CommunityEvent = {
  id: string;
  community_id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  url: string | null;
  image_url: string | null;
  capacity: number | null;
  created_by: string | null;
  created_at: string;
  creator: Profile | null;
  rsvps: Rsvp[];
};

export const eventsQuery = (communityId: string) =>
  queryOptions({
    queryKey: ["events", communityId],
    queryFn: async (): Promise<CommunityEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*, creator:profiles!events_created_by_fkey(*), rsvps:event_rsvps(*)")
        .eq("community_id", communityId)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data as unknown as CommunityEvent[];
    },
  });

export const communityTasksQuery = (communityId: string) =>
  queryOptions({
    queryKey: ["tasks-due", communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, priority")
        .eq("community_id", communityId)
        .not("due_date", "is", null);
      if (error) throw error;
      return data;
    },
  });

/* ---------------- 投票 ---------------- */

export type PollOption = { id: string; poll_id: string; label: string; position: number };
export type PollVote = { id: string; poll_id: string; option_id: string; user_id: string };

export type Poll = {
  id: string;
  community_id: string;
  channel_id: string | null;
  message_id: string | null;
  post_id: string | null;
  question: string;
  multiple: boolean;
  closes_at: string | null;
  closed: boolean;
  created_by: string | null;
  created_at: string;
  options: PollOption[];
  votes: PollVote[];
};

const POLL_SELECT = "*, options:poll_options(*), votes:poll_votes(*)";

export const channelPollsQuery = (channelId: string) =>
  queryOptions({
    queryKey: ["polls", "channel", channelId],
    queryFn: async (): Promise<Poll[]> => {
      const { data, error } = await supabase.from("polls").select(POLL_SELECT).eq("channel_id", channelId);
      if (error) throw error;
      return data as unknown as Poll[];
    },
  });

export const communityPollsQuery = (communityId: string) =>
  queryOptions({
    queryKey: ["polls", "community", communityId],
    queryFn: async (): Promise<Poll[]> => {
      const { data, error } = await supabase
        .from("polls")
        .select(POLL_SELECT)
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Poll[];
    },
  });

export function isPollOpen(p: Poll) {
  if (p.closed) return false;
  if (p.closes_at && new Date(p.closes_at).getTime() <= Date.now()) return false;
  return true;
}
