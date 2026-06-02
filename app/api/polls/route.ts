import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all polls
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("polls")
      .select(`
        id,
        question,
        created_at,
        poll_options (
          id,
          option_text
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SUPABASE ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET POLLS ERROR:", err);

    return NextResponse.json(
      {
        error: String(err),
      },
      { status: 500 }
    );
  }
}

// CREATE poll
export async function POST(req: Request) {
  try {
    const { question, options } = await req.json();

    const { data: poll, error } = await supabase
      .from("polls")
      .insert([{ question }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const optionRows = options.map((option: string) => ({
      poll_id: poll.id,
      option_text: option,
    }));

    const { error: optionError } = await supabase
      .from("poll_options")
      .insert(optionRows);

    if (optionError) {
      return NextResponse.json(
        { error: optionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pollId: poll.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}