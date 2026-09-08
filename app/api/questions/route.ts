import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/* =========================
   GET QUESTIONS
   - Returns ALL questions
   - Keeps pinned questions first
   - Supports question search
   - Supports name search
   - Supports category search
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();
    const name = searchParams.get("name")?.trim();
    const category = searchParams.get("category")?.trim();

    let query = supabase
      .from("questions")
      .select(
        "id, body, author, created_at, is_pinned, category, votes(count), question_downvotes(count)"
      )
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    /* =========================
       SEARCH BY QUESTION
    ========================= */
    if (q) {
      query = query.ilike("body", `%${q}%`);
    }

    /* =========================
       SEARCH BY NAME
    ========================= */
    if (name) {
      query = query.ilike("author", `%${name}%`);
    }

    /* =========================
       SEARCH BY CATEGORY
    ========================= */
    if (category) {
      query = query.ilike("category", `%${category}%`);
    }

    /*
      IMPORTANT:
      There is NO .range() here.

      Therefore ALL matching questions
      will be returned instead of only 10.
    */

    const { data, error } = await query;

    if (error) {
      console.error("GET questions error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /* =========================
       FORMAT QUESTIONS
    ========================= */

    const formattedQuestions = (data ?? []).map((q: any) => {
      const upvotes =
        q.votes?.[0]?.count ?? 0;

      const downvotes =
        q.question_downvotes?.[0]?.count ?? 0;

      return {
        id: q.id,
        body: q.body,
        author: q.author,
        created_at: q.created_at,
        is_pinned: !!q.is_pinned,
        category: q.category ?? null,

        // Final vote count
        votes: upvotes - downvotes,
      };
    });

    return NextResponse.json({
      questions: formattedQuestions,

      /*
        Pagination is no longer being used.
      */
      hasMore: false,
    });
  } catch (err: any) {
    console.error("GET questions exception:", err);

    return NextResponse.json(
      {
        error:
          err.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/* =========================
   POST QUESTION
========================= */
export async function POST(req: Request) {
  try {
    const { body, author, category } =
      await req.json();

    const cleanedBody = body?.trim();

    const cleanedAuthor =
      author?.trim() || null;

    const cleanedCategory =
      category?.trim().toLowerCase() || null;

    /* =========================
       VALIDATE QUESTION
    ========================= */

    if (!cleanedBody) {
      return NextResponse.json(
        {
          error:
            "Question cannot be empty",
        },
        { status: 400 }
      );
    }

    /* =========================
       CHECK DUPLICATE QUESTION
    ========================= */

    const {
      data: existing,
      error: checkError,
    } = await supabase
      .from("questions")
      .select("id")
      .eq("body", cleanedBody)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            "QUESTION ALREADY POSTED",
        },
        { status: 400 }
      );
    }

    /* =========================
       INSERT QUESTION
    ========================= */

    const {
      data,
      error,
    } = await supabase
      .from("questions")
      .insert({
        body: cleanedBody,
        author: cleanedAuthor,
        is_pinned: false,
        category: cleanedCategory,
      })
      .select(
        "id, body, author, created_at, is_pinned, category"
      )
      .single();

    if (error) {
      /*
        PostgreSQL duplicate error
      */
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "QUESTION ALREADY POSTED",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /* =========================
       RETURN CREATED QUESTION
    ========================= */

    return NextResponse.json({
      ...data,
      votes: 0,
    });
  } catch (err: any) {
    console.error(
      "POST question exception:",
      err
    );

    return NextResponse.json(
      {
        error:
          err.message ||
          "Internal Server Error",
      },
      { status: 500 }
    );
  }
}