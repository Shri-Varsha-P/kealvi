import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { count: questions } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true });

  const { data: votes } = await supabase
    .from("votes")
    .select("voter_id");

  const { data: pollVotes } = await supabase
    .from("poll_votes")
    .select("voter_id");

  const { data: downvotes } = await supabase
    .from("question_downvotes")
    .select("voter_id");

  const { data: authors } = await supabase
    .from("questions")
    .select("author");

  const uniqueVoters = new Set([
    ...(votes ?? []).map(v => v.voter_id),
    ...(pollVotes ?? []).map(v => v.voter_id),
    ...(downvotes ?? []).map(v => v.voter_id),
  ]);

  const uniqueAuthors = new Set(
    (authors ?? []).map(a => a.author).filter(Boolean)
  );

  return NextResponse.json({
    total_questions: questions || 0,
    total_voters: uniqueVoters.size,
    total_authors: uniqueAuthors.size,
  });
}