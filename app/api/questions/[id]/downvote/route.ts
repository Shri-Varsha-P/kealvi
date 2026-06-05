import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { voterId } = await req.json();
    const questionId = Number(params.id);

    if (!voterId) {
      return NextResponse.json(
        { error: "Voter ID is required" },
        { status: 400 }
      );
    }

    // 1. CHECK FOR AN EXISTING DOWNVOTE
    const { data: existingDownvote, error: checkError } = await supabase
      .from("question_downvotes")
      .select("voter_id")
      .eq("question_id", questionId)
      .eq("voter_id", voterId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingDownvote) {
      return NextResponse.json(
        { error: "You have already downvoted this question" },
        { status: 400 }
      );
    }

    // 2. SAFETY REMOVAL: Clear active upvotes from 'votes' if they change their mind
    await supabase
      .from("votes")
      .delete()
      .eq("question_id", questionId)
      .eq("voter_id", voterId);

    // 3. RECORD THE DOWNVOTE
    const { error: insertError } = await supabase
      .from("question_downvotes")
      .insert({
        question_id: questionId,
        voter_id: voterId,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already downvoted this question" },
          { status: 400 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Downvote API Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
