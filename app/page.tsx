import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";
import CreatePoll from "@/components/CreatePoll";
import PollCard from "@/components/PollCard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Page() {
  const { questions: rawQuestions } = await getQuestionsPage(0, PAGE_SIZE);

  const { data: dbQuestions, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, is_pinned, votes(count), question_downvotes(count)")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error("Database loading error on main page:", error);
  }

  // 1. Format your primary database results to align with strict types
  const formattedQuestions = (dbQuestions ?? []).map((q: any) => {
    const upvotes = q.votes?.[0]?.count ?? q.votes?.count ?? 0;
    const downvotes = q.question_downvotes?.[0]?.count ?? q.question_downvotes?.count ?? 0;

    return {
      id: q.id,
      body: q.body || "",
      author: q.author || null,
      created_at: q.created_at,
      is_pinned: !!q.is_pinned,
      votes: upvotes - downvotes,
    };
  });

  // 2. FIXED: Map the fallback array safely to ensure it provides the required boolean field
  const safeRawQuestions = (rawQuestions ?? []).map((q: any) => ({
    id: q.id,
    body: q.body || "",
    author: q.author || null,
    created_at: q.created_at || new Date().toISOString(),
    is_pinned: !!q.is_pinned, // Guarantees the missing key exists for the TypeScript compiler
    votes: q.votes ?? 0,
  }));

  const hasMore = (dbQuestions?.length ?? 0) === PAGE_SIZE;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-10 bg-white min-h-screen text-black">
      <section>
        <h1 className="mb-4 text-2xl font-medium text-black">Live Q&A</h1>
        <QuestionsList
          initialQuestions={formattedQuestions.length > 0 ? formattedQuestions : safeRawQuestions}
          initialHasMore={hasMore}
        />
      </section>

      <hr className="border-gray-200" />

      <section>
        <h2 className="mb-3 text-xl font-semibold text-black">Create Poll</h2>
        <CreatePoll />
      </section>

      <hr className="border-gray-200" />

      <section>
        <h2 className="mb-3 text-xl font-semibold text-black">Active Polls</h2>
        <PollCard />
      </section>
    </main>
  );
}
