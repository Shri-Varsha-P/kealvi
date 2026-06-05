import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/* =========================================================
   GET ALL POLLS WITH THEIR OPTIONS & AGGREGATE VOTE COUNTS
========================================================= */
export async function GET() {
  try {
    // Fetch polls, their embedded options, and the count of votes cast for each option
    const { data, error } = await supabase
      .from("polls")
      .select(`
        id,
        question,
        poll_options (
          id,
          option_text,
          poll_votes(count)
        )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the counts safely for the front-end PollCard mapping matrix
    const formattedPolls = (data ?? []).map((poll: any) => {
      let pollTotalVotes = 0;

      const formattedOptions = (poll.poll_options ?? []).map((opt: any) => {
        // Safe bracket indexing layout structure avoiding Turbopack build bugs
        const count = opt.poll_votes?.[0]?.count ?? opt.poll_votes?.count ?? 0;
        pollTotalVotes += Number(count);

        return {
          id: opt.id,
          option_text: opt.option_text,
          vote_count: Number(count)
        };
      });

      return {
        id: poll.id,
        question: poll.question,
        total_votes: pollTotalVotes,
        poll_options: formattedOptions
      };
    });

    return NextResponse.json(formattedPolls);
  } catch (err: any) {
    console.error("Main polls list aggregation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
