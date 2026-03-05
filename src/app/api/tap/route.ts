import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { voter_address, project_id, tx_hash } = await req.json();

  if (!voter_address || !project_id || !tx_hash)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (!tx_hash.startsWith("0x"))
    return NextResponse.json({ error: "Bad tx_hash" }, { status: 400 });

  // Round must be live
  const { data: round } = await supabase
    .from("round_config").select("status").eq("id", 1).single();
  if (round?.status !== "live")
    return NextResponse.json({ error: "Round not live" }, { status: 403 });

  // Idempotency
  const { data: existing } = await supabase
    .from("taps").select("id").eq("tx_hash", tx_hash).single();
  if (existing)
    return NextResponse.json({ ok: true, duplicate: true });

  // Project exists?
  const { data: project } = await supabase
    .from("projects").select("id").eq("id", project_id).single();
  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Insert tap
  const { error } = await supabase.from("taps").insert({
    project_id,
    voter_address: voter_address.toLowerCase(),
    tx_hash,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Atomic increment
  await supabase.rpc("increment_tap", { p_project_id: project_id });

  return NextResponse.json({ ok: true }, { status: 201 });
}
