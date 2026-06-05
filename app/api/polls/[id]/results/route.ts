import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const pollId = Number(params.id);

    if (Number.isNaN(pollId) || !params.id) {
      return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
    }

    const { data: optionsData, error: optionsError } = await supabase
      .from("poll_options")
      .select("id, option_text, poll_votes(count)")
      .eq("poll_id", pollId);

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 });
    }

    const results = (optionsData || []).map((opt: any) => {
      const voteCount = opt.poll_votes?.[0]?.count ?? opt.poll_votes?.count ?? 0;
      return {
        option_id: opt.id,
        option_text: opt.option_text,
        vote_count: Number(voteCount),
      };
    });

    const totalVotes = results.reduce((sum, current) => sum + current.vote_count, 0);

    return NextResponse.json({
      poll_id: pollId,
      total_votes: totalVotes,
      options: results
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
