import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";
import CreatePoll from "@/components/CreatePoll";
import PollCard from "@/components/PollCard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Page() {
  const { questions: rawQuestions } = await getQuestionsPage(0, PAGE_SIZE);

  const { data: dbQuestions } = await supabase
    .from("questions")
    .select("id, body, author, created_at, is_pinned, votes(count), question_downvotes(count)")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const formattedQuestions = (dbQuestions ?? []).map((q: any) => {
    const upvotes = q.votes?.[0]?.count ?? q.votes?.count ?? 0;
    const downvotes = q.question_downvotes?.[0]?.count ?? q.question_downvotes?.count ?? 0;

    return {
      id: q.id,
      body: q.body,
      author: q.author,
      created_at: q.created_at,
      is_pinned: !!q.is_pinned,
      votes: upvotes - downvotes,
    };
  });

  const hasMore = (dbQuestions?.length ?? 0) === PAGE_SIZE;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-10 bg-white min-h-screen text-black">
      <section>
        <h1 className="mb-4 text-2xl font-medium text-black">Live Q&A</h1>
        <QuestionsList
          initialQuestions={formattedQuestions.length > 0 ? formattedQuestions : rawQuestions}
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
