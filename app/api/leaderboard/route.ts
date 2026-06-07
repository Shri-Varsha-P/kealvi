import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: questions } = await supabase
    .from("questions")
    .select("author, votes(count), question_downvotes(count)");

  const map: Record<string, { votes: number; questions: number }> = {};

  for (const q of questions ?? []) {
    const author = q.author?.trim();
    if (!author) continue;

    const up = q.votes?.[0]?.count ?? 0;
    const down = q.question_downvotes?.[0]?.count ?? 0;
    const score = up - down;

    if (!map[author]) {
      map[author] = { votes: 0, questions: 0 };
    }

    map[author].votes += score;
    map[author].questions += 1;
  }

  return NextResponse.json(
    Object.entries(map)
      .map(([author, stats]) => ({
        author,
        total_votes: stats.votes,
        total_questions: stats.questions,
      }))
      .sort((a, b) =>
        b.total_votes !== a.total_votes
          ? b.total_votes - a.total_votes
          : b.total_questions - a.total_questions
      )
  );
}