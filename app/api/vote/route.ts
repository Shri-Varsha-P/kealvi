import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { pollId, optionId, voterId } = await req.json();

  const { error } = await supabase
    .from("poll_votes")
    .insert([
      {
        poll_id: pollId,
        option_id: optionId,
        voter_id: voterId,
      },
    ]);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}