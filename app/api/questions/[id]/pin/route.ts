import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // FIXED: Declared params as a Promise for Next.js 15/16 compatibility
) {
  try {
    // FIXED: Await the asynchronous params promise before reading the properties
    const resolvedParams = await params;
    const questionId = Number(resolvedParams.id);

    // CRITICAL VALIDATION GUARDIAN: Check using the successfully resolved params properties
    if (Number.isNaN(questionId) || !resolvedParams.id) {
      return NextResponse.json({ success: false }, { status: 400 });
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
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
