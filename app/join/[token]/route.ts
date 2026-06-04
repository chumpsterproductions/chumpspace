import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncProfile } from "@/lib/auth";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const user = await syncProfile();

  if (user == null) {
    const next = `/join/${token}`;
    return NextResponse.redirect(new URL(`/auth/discord?next=${encodeURIComponent(next)}`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from("workspace_invites")
    .select("workspace_id")
    .eq("token", token)
    .single();

  if (invite == null) {
    return NextResponse.redirect(new URL("/dashboard?error=invite-not-found", request.url));
  }

  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", invite.workspace_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existingMembership == null) {
    await supabase.from("workspace_members").insert({
      workspace_id: invite.workspace_id,
      profile_id: user.id,
      role: "member",
    });
  }

  return NextResponse.redirect(new URL(`/dashboard?workspace=${invite.workspace_id}&open=boards`, request.url));
}
