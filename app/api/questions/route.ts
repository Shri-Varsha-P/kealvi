import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const PAGE_SIZE = 10;

/* =========================
   GET QUESTIONS (WITH PIN ORDERING)
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const parsedOffset = Number(searchParams.get("offset") ?? 0);
     // If frontend accidentally sends "NaN" or bad data, safely force it back to 0
    const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;


    // Build base query selecting fields along with subquery counts from relationship tables
    let query = supabase
      .from("questions")
      .select("id, body, author, created_at, is_pinned, votes(count), question_downvotes(count)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // Safely inject filter constraints if user types in search box
    if (q) {
      query = query.ilike("body", `%${q}%`);
    }

    // Apply pagination window constraints securely
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Safely flatten structural responses from relationship aggregate counts
    const formattedQuestions = (data ?? []).map((q: any) => {
      // Supabase counts return as an single-element array inside objects: [{ count: x }]
      // This maps them to clean numbers while using safe valid syntax
      const upvotes = q.votes?.[0]?.count ?? 0;
      const downvotes = q.question_downvotes?.[0]?.count ?? 0;


      return {
        id: q.id,
        body: q.body,
        author: q.author,
        created_at: q.created_at,
        is_pinned: !!q.is_pinned,
        votes: upvotes - downvotes, // Aggregate total score
      };
    });

    return NextResponse.json({
      questions: formattedQuestions,
      hasMore: (data?.length ?? 0) === PAGE_SIZE,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* =========================
   POST QUESTION
========================= */
export async function POST(req: Request) {
  try {
    const { body, author } = await req.json();
    const cleanedBody = body?.trim();

    // Block empty strings immediately
    if (!cleanedBody) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    // 1. DUPLICATE PROTECTION LAYER: Case-insensitive scan
    const { data: existing, error: checkError } = await supabase
      .from("questions")
      .select("id")
      .ilike("body", cleanedBody)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json(
        { error: "QUESTION ALREADY POSTED" },
        { status: 400 }
      );
    }

    // 2. SAFE INSERTION
    const { data, error } = await supabase
      .from("questions")
      .insert({
        body: cleanedBody,
        author: author ?? null,
        is_pinned: false,
      })
      .select("id, body, author, created_at, is_pinned")
      .single();

    if (error) {
      // Fallback unique constraint protection block checks
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "QUESTION ALREADY POSTED" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Return the response mapping zero baseline votes to frontend
    return NextResponse.json({
      ...data,
      votes: 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
