import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const questionId = Number(id);

    if (!id || Number.isNaN(questionId)) {
      return NextResponse.json(
        { error: "Invalid question ID" },
        { status: 400 }
      );
    }

    const { voterId } = await req.json();

    if (!voterId) {
      return NextResponse.json(
        { error: "Voter ID is required" },
        { status: 400 }
      );
    }

    // 1. check existing downvote
    const { data: existing, error: checkError } = await supabase
      .from("question_downvotes")
      .select("voter_id")
      .eq("question_id", questionId)
      .eq("voter_id", voterId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json(
        { error: "Already downvoted" },
        { status: 400 }
      );
    }

    // 2. remove upvote if exists
    await supabase
      .from("votes")
      .delete()
      .eq("question_id", questionId)
      .eq("voter_id", voterId);

    // 3. insert downvote
    const { error: insertError } = await supabase
      .from("question_downvotes")
      .insert({
        question_id: questionId, // int8 OK
        voter_id: voterId,       // text OK
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}