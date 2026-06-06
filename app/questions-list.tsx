"use client";
import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: number; 
  body: string;
  author: string | null;
  votes: number;
  is_pinned: boolean; // Updated model specification field 
};

export default function QuestionsList({
  initialQuestions = [],
  initialHasMore = false,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const url = query
          ? `/api/questions?q=${encodeURIComponent(query)}`
          : `/api/questions`;
        const res = await fetch(url);
        const data = await res.json();
        
        setQuestions(Array.isArray(data?.questions) ? data.questions : []);
        setHasMore(!!data?.hasMore);
      } catch (error) {
        console.error("Failed to fetch questions:", error);
        setQuestions([]);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  // Sorting helper so local state movements mirror database pinning behavior instantly
  const sortQuestionsWithPins = (list: Question[]) => {
    return [...list].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0; // Keep current layout placement if pin parameters align
    });
  };
    async function improveQuestion() {
  if (!draft.trim()) return;

  try {
    setImproving(true);
    setError(null);

    const res = await fetch("/api/improve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: draft,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to improve question");
      return;
    }

    setDraft(data.improved);
  } catch (err) {
    console.error(err);
    setError("Failed to improve question");
  } finally {
    setImproving(false);
  }
}
    async function submit() {
    if (!draft.trim()) return;
    setError(null);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      
      const created = await res.json();

      if (!res.ok) {
        setError(created.error === "QUESTION ALREADY POSTED" ? "QUESTION ALREADY POSTED" : created.error || "Failed to post question.");
        return;
      }

      // FIXED LOGIC PATH: Only append the item if the backend returned a real database ID
      if (created && created.id !== undefined && created.id !== null && !Number.isNaN(Number(created.id))) {
        setQuestions((qs) => sortQuestionsWithPins([
          { 
            id: Number(created.id), // Force explicit numeric conversion
            body: created.body, 
            author: created.author || null, 
            votes: created.votes || 0,
            is_pinned: !!created.is_pinned
          }, 
          ...(qs || [])
        ]));
        setDraft(""); // Reset input field only on verified database success
      } else {
        setError("Database failed to assign a valid ID. Please refresh the page.");
      }
    } catch (error) {
      console.error("Failed to submit question:", error);
      setError("A network error occurred. Please try again.");
    }
  }


  async function upvote(id: number) {
    setQuestions((qs) =>
      (qs || []).map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))
    );

    try {
      const res = await fetch(`/api/questions/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId() }),
      });

      if (!res.ok) {
        setQuestions((qs) =>
          (qs || []).map((q) => (q.id === id ? { ...q, votes: q.votes - 1 } : q))
        );
      }
    } catch (error) {
      console.error("Voting failed, rolling back:", error);
      setQuestions((qs) =>
        (qs || []).map((q) => (q.id === id ? { ...q, votes: q.votes - 1 } : q))
      );
    }
  }

  async function downvote(id: number) {
    setQuestions((qs) =>
      (qs || []).map((q) => (q.id === id ? { ...q, votes: q.votes - 1 } : q))
    );

    try {
      const res = await fetch(`/api/questions/${id}/downvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId() }),
      });

      if (!res.ok) {
        setQuestions((qs) =>
          (qs || []).map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))
        );
      }
    } catch (error) {
      console.error("Downvoting failed, rolling back:", error);
      setQuestions((qs) =>
        (qs || []).map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))
      );
    }
  }

  /* ====================================
     NEW: PIN PINNING STATE TOGGLE CALLER
  ==================================== */
  async function togglePin(id: number) {
    // SECURITY CHECK: If the question id does not exist yet or is invalid, stop immediately
    if (!id || Number.isNaN(Number(id))) {
      setError("Cannot pin a question without a valid ID. Please refresh.");
      return;
    }

    // Optimistic UI state mapping transformation swap
    setQuestions((qs) => 
      sortQuestionsWithPins(
        (qs || []).map((q) => (q.id === id ? { ...q, is_pinned: !q.is_pinned } : q))
      )
    );

    try {
      const res = await fetch(`/api/questions/${id}/pin`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update pin location.");
        // Rollback state values if network execution sequence fails
        setQuestions((qs) => 
          sortQuestionsWithPins(
            (qs || []).map((q) => (q.id === id ? { ...q, is_pinned: !q.is_pinned } : q))
          )
        );
      }
    } catch (err) {
      console.error("Pin toggle operation error:", err);
      setQuestions((qs) => 
        sortQuestionsWithPins(
          (qs || []).map((q) => (q.id === id ? { ...q, is_pinned: !q.is_pinned } : q))
        )
      );
    }
  }


  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?offset=${(questions || []).length}`);
      const data = await res.json();
      setQuestions((qs) => [...(qs || []), ...(Array.isArray(data?.questions) ? data.questions : [])]);
      setHasMore(!!data?.hasMore);
    } catch (error) {
      console.error("Failed to load more questions:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {hydrated ? "Interactive ✓" : "Loading interactivity…"}
      </p>

      {error && (
        <div className="p-3 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-md">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-2">
  <input
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    placeholder="Ask a question…"
    className="flex-1 rounded-md border px-3 py-2 text-black"
  />

 <button
  onClick={improveQuestion}
  disabled={improving}
  className="rounded-md border px-4 py-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
>
  {improving ? "Improving..." : "Improve"}
</button>

  <button
    onClick={submit}
    className="rounded-md border px-4 py-2 hover:bg-gray-50"
  >
    Ask
  </button>
</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search questions…"
        className="w-full rounded-md border px-3 py-2 text-black"
      />

      <ul className="space-y-3">
        {questions?.map((q, index) => {
          const stableKey = q?.id !== undefined && q?.id !== null ? q.id : `fallback-key-${index}`;
          
          return (
            <li
              key={stableKey}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                q.is_pinned ? "bg-amber-50/50 border-amber-300" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {/* UPVOTE / DOWNVOTE CONTROLLER ARROWS */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => upvote(q.id)}
                    className="rounded-md border px-2 py-0.5 text-xs font-mono hover:bg-green-50 text-black"
                    title="Upvote"
                  >
                    ▲
                  </button>
                  <span className="font-mono text-sm font-bold text-black px-1">
                    {q?.votes || 0}
                  </span>
                  <button
                    onClick={() => downvote(q.id)}
                    className="rounded-md border px-2 py-0.5 text-xs font-mono hover:bg-red-50 text-black"
                    title="Downvote"
                  >
                    ▼
                  </button>
                </div>
                
                <span className="text-black pl-2 font-medium">
                  {q?.body}
                </span>
              </div>

              {/* DYNAMIC PIN TOGGLER COMPONENT ACTION */}
              <button
                onClick={() => togglePin(q.id)}
                className={`text-sm px-2.5 py-1 rounded border opacity-70 hover:opacity-100 transition-all font-medium ${
                  q.is_pinned 
                    ? "bg-amber-100 border-amber-400 text-amber-700" 
                    : "bg-gray-50 border-gray-300 text-gray-500"
                }`}
                title={q.is_pinned ? "Unpin Question" : "Pin Question"}
              >
                {q.is_pinned ? "📌 Pinned" : "📍 Pin"}
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="rounded-md border px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}