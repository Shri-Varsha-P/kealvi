import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
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

    const formattedPolls = (data ?? []).map((poll: any) => {
      let pollTotalVotes = 0;

      const formattedOptions = (poll.poll_options ?? []).map((opt: any) => {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { question, options } = await req.json();
    if (!Array.isArray(options) || options.length < 2) {
  return NextResponse.json(
    { error: "At least 2 options are required" },
    { status: 400 }
  );
}

const option1 = options[0]?.trim().toLowerCase();
const option2 = options[1]?.trim().toLowerCase();

if (option1 === option2) {
  return NextResponse.json(
    { error: "Poll options cannot be identical" },
    { status: 400 }
  );
}

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({ question })
      .select()
      .single();

    if (pollError) {
      return NextResponse.json({ error: pollError.message }, { status: 500 });
    }

    const optionRows = options
      .filter((o: string) => o.trim() !== "")
      .map((text: string) => ({
        poll_id: poll.id,
        option_text: text,
      }));

    const { error: optError } = await supabase
      .from("poll_options")
      .insert(optionRows);

    if (optError) {
      return NextResponse.json({ error: optError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
