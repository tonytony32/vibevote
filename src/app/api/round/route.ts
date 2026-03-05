import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [{ data: config }, { data: feed }] = await Promise.all([
    supabase.from("round_config").select("*").eq("id", 1).single(),
    supabase.from("tap_feed").select("*"),
  ]);
  return NextResponse.json({ config, feed });
}

export async function POST(req: NextRequest) {
  const { action } = await req.json();
  const now = new Date().toISOString();

  if (action === "start") {
    await supabase.from("round_config").update({
      status: "live", started_at: now, ended_at: null, updated_at: now,
    }).eq("id", 1);
    return NextResponse.json({ ok: true, status: "live" });
  }

  if (action === "end") {
    await supabase.from("round_config").update({
      status: "ended", ended_at: now, updated_at: now,
    }).eq("id", 1);
    return NextResponse.json({ ok: true, status: "ended" });
  }

  if (action === "reset") {
    // Reset scores + round
    await supabase.from("taps").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("projects").update({ tap_count: 0, total_crc: 0 }).neq("id", "x");
    await supabase.from("round_config").update({
      status: "waiting", started_at: null, ended_at: null, updated_at: now,
    }).eq("id", 1);
    return NextResponse.json({ ok: true, status: "waiting" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
