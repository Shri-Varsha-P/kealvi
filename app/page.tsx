import { supabase } from "@/lib/supabase";
import QuestionsList from "@/app/questions-list";

const PAGE_SIZE = 10;

export default async function Page() {
  // 1. Fetch questions, including your new is_pinned column and aggregate counts
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, is_pinned, votes(count), question_downvotes(count)")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error("Database loading error on main page:", error);
  }

  // 2. Format the array rows so they match the strict 'Question' type signature requirements
  const formattedQuestions = (data ?? []).map((q: any) => {
    const upvotes = q.votes?.[0]?.count ?? q.votes?.count ?? 0;
    const downvotes = q.question_downvotes?.[0]?.count ?? q.question_downvotes?.count ?? 0;

    return {
      id: q.id,
      body: q.body,
      author: q.author,
      created_at: q.created_at,
      is_pinned: !!q.is_pinned, // FIXED: Maps the required is_pinned boolean field down to the component
      votes: upvotes - downvotes,
    };
  });

  const hasMore = (data?.length ?? 0) === PAGE_SIZE;

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-black">Q&A Feed</h1>
      
      <QuestionsList
        initialQuestions={formattedQuestions} // FIXED: Receives the structurally complete questions array
        initialHasMore={hasMore}
      />
    </main>
  );
}
