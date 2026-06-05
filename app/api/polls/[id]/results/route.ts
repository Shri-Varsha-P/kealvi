import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // Tells Next.js we know params is a Promise
) {
  try {
    // Await the asynchronous promise to safely get the id
    const resolvedParams = await context.params;
    const pollId = Number(resolvedParams.id);

    if (Number.isNaN(pollId) || !resolvedParams.id) {
      return NextResponse.json(
        { error: "Invalid poll ID provided." },
        { status: 400 }
      );
    }

    // Fetch options for this poll along with the aggregate count of matching votes
    const { data: optionsData, error: optionsError } = await supabase
      .from("poll_options")
      .select("id, option_text, poll_votes(count)")
      .eq("poll_id", pollId);

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 });
    }

    // Format the results safely
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
    console.error("Poll aggregation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
