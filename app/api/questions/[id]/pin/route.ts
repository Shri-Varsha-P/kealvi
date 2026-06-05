import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = Number(params.id);

    // CRITICAL VALIDATION GUARDIAN: Stop execution completely if ID is not a valid number
    if (Number.isNaN(questionId) || !params.id) {
      return NextResponse.json(
        { error: "PINNED A QUESTION TO TOP." },
        { status: 400 }
      );
    }

    // 1. Fetch current pin state
    const { data: question, error: fetchError } = await supabase
      .from("questions")
      .select("is_pinned")
      .eq("id", questionId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Toggle the pin boolean state
    const nextPinState = !question.is_pinned;

    const { error: updateError } = await supabase
      .from("questions")
      .update({ is_pinned: nextPinState })
      .eq("id", questionId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, is_pinned: nextPinState });
  } catch (err: any) {
    console.error("Pin toggle API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}