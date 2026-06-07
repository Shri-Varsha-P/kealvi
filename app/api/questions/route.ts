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
    const name = searchParams.get("name")?.trim();
    const parsedOffset = Number(searchParams.get("offset") ?? 0);
    const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;

    let query = supabase
      .from("questions")
      .select(
        "id, body, author, created_at, is_pinned, category, votes(count), question_downvotes(count)"
      )
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // Search filter
    if (q) {
      query = query.ilike("body", `%${q}%`);
    }
    if (name) {
      query = query.ilike("author", `%${name}%`);
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedQuestions = (data ?? []).map((q: any) => {
      const upvotes = q.votes?.[0]?.count ?? 0;
      const downvotes = q.question_downvotes?.[0]?.count ?? 0;

      return {
        id: q.id,
        body: q.body,
        author: q.author,
        created_at: q.created_at,
        is_pinned: !!q.is_pinned,
        category: q.category ?? null,
        votes: upvotes - downvotes,
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
    const { body, author, category } = await req.json();
    const cleanedBody = body?.trim();
    const cleanedAuthor = author?.trim() || null;
    const cleanedCategory = category?.trim().toLowerCase() || null;

    if (!cleanedBody) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    // FIXED: exact match duplicate check
    const { data: existing, error: checkError } = await supabase
      .from("questions")
      .select("id")
      .eq("body", cleanedBody)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json(
        { error: "QUESTION ALREADY POSTED" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        body: cleanedBody,
        author: cleanedAuthor,
        is_pinned: false,
        category: cleanedCategory,
      })
      .select("id, body, author, created_at, is_pinned, category")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "QUESTION ALREADY POSTED" },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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