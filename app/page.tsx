import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";

import CreatePoll from "@/components/CreatePoll";
import PollCard from "@/components/PollCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Page() {
  const { questions, hasMore } = await getQuestionsPage(
    0,
    PAGE_SIZE
  );

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-8">
      <h1 className="text-2xl font-medium">
        Live Q&A
      </h1>

      <QuestionsList
        initialQuestions={questions}
        initialHasMore={hasMore}
      />

      <hr />

      <h2 className="text-xl font-semibold">
        Create Poll
      </h2>

      <CreatePoll />

      <hr />

      <h2 className="text-xl font-semibold">
        Poll List
      </h2>

      <PollCard />
    </main>
  );
}