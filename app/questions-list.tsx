"use client";
import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: number;
  body: string;
  author: string | null;
  votes: number;
  is_pinned: boolean;
  category?: string;
};

export default function QuestionsList({
  initialQuestions = [],
  initialHasMore = false,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /* ================= SEARCH ================= */
useEffect(() => {
  const id = setTimeout(async () => {
    try {
      const params = new URLSearchParams();

      if (query) params.append("q", query);
      if (nameSearch) params.append("name", nameSearch);
      if (categoryFilter) params.append("category", categoryFilter);

      const url =
        params.toString().length > 0
          ? `/api/questions?${params.toString()}`
          : `/api/questions`;

      const res = await fetch(url);
      const data = await res.json();

      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
      setHasMore(!!data?.hasMore);
    } catch {
      setQuestions([]);
    }
  }, 300);

  return () => clearTimeout(id);
}, [query, nameSearch, categoryFilter]);

  /* ================= SORT PIN ================= */
  const sortQuestionsWithPins = (list: Question[]) => {
    return [...list].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });
  };

  /* ================= IMPROVE QUESTION ================= */
  async function improveQuestion() {
  if (!draft.trim()) return;

  setImproving(true);
  setError(null);

  try {
    const res = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      question: draft, // ✅ FIX: must match backend
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to improve question");
      return;
    }

    if (!data?.improved) {
      setError("No improved response received");
      return;
    }

    setDraft(data.improved);
  } catch (err) {
    console.error("Improve error:", err);
    setError("Failed to improve question");
  } finally {
    setImproving(false);
  }
}

  /* ================= SUBMIT ================= */
  async function submit() {
    if (!draft.trim()) return;
    setError(null);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: draft,
          category,
          author: name.trim() || null,
        }),
      });

      const created = await res.json();

      if (!res.ok) {
        setError(created.error || "Failed to post question");
        return;
      }

      if (created?.id != null) {
        setQuestions((qs) =>
          sortQuestionsWithPins([
            {
              id: Number(created.id),
              body: created.body,
              author: created.author || null,
              votes: created.votes || 0,
              is_pinned: !!created.is_pinned,
              category: created.category || category,
            },
            ...qs,
          ])
        );

        setDraft("");
        setCategory("");
        setName("");
      }

    } catch {
      setError("Network error");
    }
  }

  /* ================= VOTE ================= */
  async function upvote(id: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id ? { ...q, votes: q.votes + 1 } : q
      )
    );

    try {
      await fetch(`/api/questions/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId() }),
      });
    } catch {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === id ? { ...q, votes: q.votes - 1 } : q
        )
      );
    }
  }

  async function downvote(id: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id ? { ...q, votes: q.votes - 1 } : q
      )
    );

    try {
      await fetch(`/api/questions/${id}/downvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId() }),
      });
    } catch {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === id ? { ...q, votes: q.votes + 1 } : q
        )
      );
    }
  }

  /* ================= PIN ================= */
  async function togglePin(id: number) {
    setQuestions((qs) =>
      sortQuestionsWithPins(
        qs.map((q) =>
          q.id === id ? { ...q, is_pinned: !q.is_pinned } : q
        )
      )
    );

    try {
      await fetch(`/api/questions/${id}/pin`, { method: "POST" });
    } catch {
      setError("Failed to update pin");
    }
  }

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {hydrated ? "Interactive ✓" : "Loading..."}
      </p>

      {/* INPUTS */}
      <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Your name"
      className="w-full border px-3 py-2 text-black"
      />

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 border px-3 py-2 text-black"
        />

        <button onClick={improveQuestion} disabled={improving}>
          {improving ? "Improving..." : "Improve"}
        </button>

        <button onClick={submit}>Ask</button>
      </div>

      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="w-full border px-3 py-2 text-black"
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search questions..."
        className="w-full border px-3 py-2 text-black"
      />
      <input
      value={nameSearch}
      onChange={(e) => setNameSearch(e.target.value)}
      placeholder="Search by name..."
      className="w-full border px-3 py-2 text-black mt-2"
      />
      <input
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        placeholder="Search by category..."
        className="w-full border px-3 py-2 text-black"
      />

      {/* LIST */}
      <ul className="space-y-3">
        {questions
          .filter((q) =>
            categoryFilter.trim()
              ? (q.category ?? "")
                  .toLowerCase()
                  .includes(categoryFilter.toLowerCase())
              : true
          )
 .map((q) => (
  <li key={q.id} className="border p-3 flex justify-between">
    
    {/* LEFT SIDE: CONTENT */}
    <div>
      <div>{q.body}</div>

      {/* ✅ AUTHOR FIX */}
      <div className="text-xs text-blue-600 mt-1">
        👤 Asked by: {q.author || "Anonymous"}
      </div>

      {/* CATEGORY */}
      {q.category && (
        <div className="text-xs text-gray-500">
          #{q.category}
        </div>
      )}
    </div>

    {/* RIGHT SIDE: ACTIONS */}
    <div className="flex gap-2 items-center">
      
      <button onClick={() => upvote(q.id)}>▲</button>

      <span>{q.votes}</span>

      <button onClick={() => downvote(q.id)}>▼</button>

      <button onClick={() => togglePin(q.id)}>
        {q.is_pinned ? "📌" : "Pin"}
      </button>
    </div>
  </li>
))}
      </ul>
    </div>
  );
}