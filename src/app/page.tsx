import { supabase } from "@/lib/supabase";
import { VibeVoteApp } from "@/components/VibeVoteApp";

export const revalidate = 0;

export default async function Home() {
  const [{ data: projects }, { data: config }, { data: feed }] = await Promise.all([
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("round_config").select("*").eq("id", 1).single(),
    supabase.from("tap_feed").select("*"),
  ]);

  return (
    <VibeVoteApp
      initialProjects={projects ?? []}
      initialConfig={config}
      initialFeed={feed ?? []}
    />
  );
}
