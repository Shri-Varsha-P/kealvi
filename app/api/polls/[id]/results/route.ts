import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const pollId = Number(id);

    if (!pollId) {
      return NextResponse.json(
        { error: "Invalid poll id" },
        { status: 400 }
      );
    }

    // get poll options
    const { data: options } = await supabase
      .from("poll_options")
      .select("id, option_text")
      .eq("poll_id", pollId);

    // get votes
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", pollId);

    const voteMap: Record<number, number> = {};

    (votes || []).forEach((v) => {
      voteMap[v.option_id] = (voteMap[v.option_id] || 0) + 1;
    });

    const result = (options || []).map((opt) => ({
      option_id: opt.id,
      option_text: opt.option_text,
      vote_count: voteMap[opt.id] || 0,
    }));

    return NextResponse.json({
      poll_id: pollId,
      total_votes: votes?.length || 0,
      options: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}