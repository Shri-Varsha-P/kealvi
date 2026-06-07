import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";
import CreatePoll from "@/components/CreatePoll";
import PollCard from "@/components/PollCard";
import Summary from "@/components/Summary";
import Leaderboard from "@/components/Leaderboard";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Page() {
  const { questions: rawQuestions } = await getQuestionsPage(0, PAGE_SIZE);

  const { data: dbQuestions, error } = await supabase
    .from("questions")
    .select(`
      id,
      body,
      author,
      created_at,
      is_pinned,
      category,
      votes(count),
      question_downvotes(count)
    `)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error("Database loading error on main page:", error);
  }

  /* =========================
     FORMAT DB QUESTIONS
  ========================= */
  const formattedQuestions = (dbQuestions ?? []).map((q: any) => {
    const upvotes = q.votes?.[0]?.count ?? 0;
    const downvotes = q.question_downvotes?.[0]?.count ?? 0;

    return {
      id: q.id,
      body: q.body || "",
      author: q.author || null,
      created_at: q.created_at,
      is_pinned: !!q.is_pinned,
      category: q.category ?? null,
      votes: upvotes - downvotes,
    };
  });

  /* =========================
     SAFE FALLBACK DATA
  ========================= */
  const safeRawQuestions = (rawQuestions ?? []).map((q: any) => ({
    id: q.id,
    body: q.body || "",
    author: q.author || null,
    created_at: q.created_at || new Date().toISOString(),
    is_pinned: !!q.is_pinned,
    category: q.category ?? null,
    votes: q.votes ?? 0,
  }));

  const hasMore = (dbQuestions?.length ?? 0) === PAGE_SIZE;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-10 bg-white min-h-screen text-black">

      {/* ================= SUMMARY ================= */}
      <section className="border rounded p-3">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <Summary />
      </section>

      {/* ================= QUESTIONS ================= */}
      <section>
        <h1 className="mb-4 text-2xl font-medium text-black">
          Live Q&A
        </h1>

        <QuestionsList
          initialQuestions={
            formattedQuestions.length > 0
              ? formattedQuestions
              : safeRawQuestions
          }
          initialHasMore={hasMore}
        />
      </section>

      <hr className="border-gray-200" />

      {/* ================= POLL CREATION ================= */}
      <section>
        <h2 className="mb-3 text-xl font-semibold text-black">
          Create Poll
        </h2>
        <CreatePoll />
      </section>

      <hr className="border-gray-200" />

      {/* ================= POLLS ================= */}
      <section>
        <h2 className="mb-3 text-xl font-semibold text-black">
          Active Polls
        </h2>
        <PollCard />
      </section>

      <hr className="border-gray-200" />

      {/* ================= LEADERBOARD (FIXED MISSING PART) ================= */}
      <section className="border rounded p-3">
        <h2 className="text-xl font-semibold mb-2">Leaderboard</h2>
        <Leaderboard />
      </section>

    </main>
  );
}