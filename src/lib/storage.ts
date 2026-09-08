import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function uploadFile(userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data, error } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
