"use client";

import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Answer = {
  id: number;
  question_id: number;
  body: string;
  author: string | null;
  image_url: string | null;
  created_at: string;
};

type Question = {
  id: number;
  body: string;
  author: string | null;
  votes: number;
  is_pinned: boolean;
  category?: string | null;
};

type AIMode = "simple" | "detailed" | "example";

type AnswerRanking = {
  answer_id: number;
  score: number;
  label: string;
  reason: string;
};

export default function QuestionsList({
  initialQuestions = [],
}: {
  initialQuestions: Question[];
  initialHasMore?: boolean;
}) {
  const [questions, setQuestions] =
    useState<Question[]>(initialQuestions);

  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [nameSearch, setNameSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // ============================================================
  // ANSWERS
  // ============================================================

  const [answers, setAnswers] =
    useState<Record<number, Answer[]>>({});

  const [expandedQuestion, setExpandedQuestion] =
    useState<number | null>(null);

  const [answerDrafts, setAnswerDrafts] =
    useState<Record<number, string>>({});

  const [answerFiles, setAnswerFiles] =
    useState<Record<number, File | null>>({});

  const [answerPreviews, setAnswerPreviews] =
    useState<Record<number, string | null>>({});

  const [loadingAnswers, setLoadingAnswers] =
    useState<number | null>(null);

  const [postingAnswer, setPostingAnswer] =
    useState<number | null>(null);

  // ============================================================
  // AI ANSWER
  // ============================================================

  const [aiAnswers, setAiAnswers] =
    useState<Record<number, string>>({});

  const [aiAnswerMode, setAiAnswerMode] =
    useState<Record<number, AIMode>>({});

  const [showAIMenu, setShowAIMenu] =
    useState<number | null>(null);

  const [loadingAI, setLoadingAI] =
    useState<number | null>(null);

  // ============================================================
  // AI EXPLAIN MY ANSWER
  // ============================================================

  const [aiExplanations, setAiExplanations] =
    useState<Record<number, string>>({});

  const [loadingAIExplanation, setLoadingAIExplanation] =
    useState<number | null>(null);

  // ============================================================
  // AI ANSWER RANKING
  // ============================================================

  const [answerRankings, setAnswerRankings] =
    useState<Record<number, AnswerRanking[]>>({});

  const [loadingAIRanking, setLoadingAIRanking] =
    useState<number | null>(null);

  const [aiRankedQuestions, setAiRankedQuestions] =
    useState<Record<number, boolean>>({});

  // ============================================================
  // HYDRATION
  // ============================================================

  useEffect(() => {
    setHydrated(true);
  }, []);

  // ============================================================
  // SEARCH
  // ============================================================

  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (query.trim()) {
          params.append("q", query.trim());
        }

        if (nameSearch.trim()) {
          params.append("name", nameSearch.trim());
        }

        if (categoryFilter.trim()) {
          params.append(
            "category",
            categoryFilter.trim()
          );
        }

        const url =
          params.toString().length > 0
            ? `/api/questions?${params.toString()}`
            : `/api/questions`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setError(
            data.error ||
              "Failed to load questions"
          );
          return;
        }

        setQuestions(
          Array.isArray(data?.questions)
            ? data.questions
            : []
        );
      } catch (err) {
        console.error(
          "Question loading error:",
          err
        );

        setError(
          "Failed to load questions"
        );
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [query, nameSearch, categoryFilter]);

  // ============================================================
  // SORT PINNED QUESTIONS
  // ============================================================

  function sortQuestionsWithPins(
    list: Question[]
  ) {
    return [...list].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) {
        return -1;
      }

      if (!a.is_pinned && b.is_pinned) {
        return 1;
      }

      return 0;
    });
  }

  // ============================================================
  // IMPROVE QUESTION
  // ============================================================

  async function improveQuestion() {
    if (!draft.trim()) return;

    setImproving(true);
    setError(null);

    try {
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
        setError(
          data.error ||
            "Failed to improve question"
        );
        return;
      }

      if (!data?.improved) {
        setError(
          "No improved response received"
        );
        return;
      }

      setDraft(data.improved);
    } catch (err) {
      console.error(
        "Improve error:",
        err
      );

      setError(
        "Failed to improve question"
      );
    } finally {
      setImproving(false);
    }
  }

  // ============================================================
  // SUBMIT QUESTION
  // ============================================================

  async function submit() {
    if (!draft.trim()) return;

    setError(null);

    try {
      const res = await fetch(
        "/api/questions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            body: draft,
            category,
            author:
              name.trim() || null,
          }),
        }
      );

      const created =
        await res.json();

      if (!res.ok) {
        setError(
          created.error ||
            "Failed to post question"
        );
        return;
      }

      if (created?.id != null) {
        setQuestions((qs) =>
          sortQuestionsWithPins([
            {
              id: Number(created.id),
              body: created.body,
              author:
                created.author ||
                null,
              votes:
                created.votes || 0,
              is_pinned:
                !!created.is_pinned,
              category:
                created.category ||
                category ||
                null,
            },
            ...qs,
          ])
        );

        setDraft("");
        setCategory("");
        setName("");
      }
    } catch {
      setError(
        "Network error"
      );
    }
  }

  // ============================================================
  // UPVOTE
  // ============================================================

  async function upvote(id: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id
          ? {
              ...q,
              votes: q.votes + 1,
            }
          : q
      )
    );

    try {
      const res = await fetch(
        `/api/questions/${id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            voterId: getVoterId(),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Vote failed"
        );
      }
    } catch {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === id
            ? {
                ...q,
                votes: q.votes - 1,
              }
            : q
        )
      );
    }
  }

  // ============================================================
  // DOWNVOTE
  // ============================================================

  async function downvote(id: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id
          ? {
              ...q,
              votes: q.votes - 1,
            }
          : q
      )
    );

    try {
      const res = await fetch(
        `/api/questions/${id}/downvote`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            voterId: getVoterId(),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          "Downvote failed"
        );
      }
    } catch {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === id
            ? {
                ...q,
                votes: q.votes + 1,
              }
            : q
        )
      );
    }
  }

  // ============================================================
  // PIN
  // ============================================================

  async function togglePin(id: number) {
    const previousQuestions =
      questions;

    setQuestions((qs) =>
      sortQuestionsWithPins(
        qs.map((q) =>
          q.id === id
            ? {
                ...q,
                is_pinned:
                  !q.is_pinned,
              }
            : q
        )
      )
    );

    try {
      const res = await fetch(
        `/api/questions/${id}/pin`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Pin failed"
        );
      }
    } catch {
      setQuestions(
        previousQuestions
      );

      setError(
        "Failed to update pin"
      );
    }
  }

  // ============================================================
  // LOAD ANSWERS
  // ============================================================

  async function loadAnswers(
    questionId: number
  ) {
    setLoadingAnswers(questionId);
    setError(null);

    try {
      const res = await fetch(
        `/api/answers?question_id=${questionId}`
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to load answers"
        );
        return;
      }

      const loadedAnswers =
        Array.isArray(data.answers)
          ? data.answers
          : [];

      setAnswers((prev) => ({
        ...prev,
        [questionId]:
          loadedAnswers,
      }));

      // --------------------------------------------------------
      // New answers may have been added since the last AI ranking.
      // Therefore, clear the old ranking when answers are reloaded.
      // --------------------------------------------------------

      setAnswerRankings((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[questionId];

        return updated;
      });

      setAiRankedQuestions((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[questionId];

        return updated;
      });
    } catch {
      setError(
        "Failed to load answers"
      );
    } finally {
      setLoadingAnswers(null);
    }
  }

  // ============================================================
  // TOGGLE ANSWERS
  // ============================================================

  async function toggleAnswers(
    questionId: number
  ) {
    if (
      expandedQuestion ===
      questionId
    ) {
      setExpandedQuestion(null);
      return;
    }

    setExpandedQuestion(
      questionId
    );

    await loadAnswers(
      questionId
    );
  }

  // ============================================================
  // AI ANSWER
  // ============================================================

  async function generateAIAnswer(
    questionId: number,
    question: string,
    mode: AIMode
  ) {
    if (!question.trim()) {
      return;
    }

    setLoadingAI(questionId);
    setError(null);

    try {
      const res = await fetch(
        "/api/ai-answer",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question:
              question.trim(),
            mode,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to generate AI answer"
        );
        return;
      }

      if (!data?.answer) {
        setError(
          "AI did not return an answer"
        );
        return;
      }

      setAiAnswers((prev) => ({
        ...prev,
        [questionId]:
          data.answer,
      }));

      setAiAnswerMode((prev) => ({
        ...prev,
        [questionId]: mode,
      }));

      setShowAIMenu(null);
    } catch (err) {
      console.error(
        "AI answer error:",
        err
      );

      setError(
        "Failed to generate AI answer"
      );
    } finally {
      setLoadingAI(null);
    }
  }

  // ============================================================
  // EXPLAIN MY ANSWER
  // ============================================================

  async function explainAnswer(
    answerId: number,
    question: string,
    answer: string
  ) {
    if (
      !question.trim() ||
      !answer.trim()
    ) {
      return;
    }

    setLoadingAIExplanation(
      answerId
    );

    setError(null);

    try {
      const res = await fetch(
        "/api/ai-explain-answer",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question:
              question.trim(),
            answer:
              answer.trim(),
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to analyze the answer"
        );
        return;
      }

      if (!data?.explanation) {
        setError(
          "AI did not return an explanation"
        );
        return;
      }

      setAiExplanations((prev) => ({
        ...prev,
        [answerId]:
          data.explanation,
      }));
    } catch (err) {
      console.error(
        "AI explanation error:",
        err
      );

      setError(
        "Failed to analyze the answer"
      );
    } finally {
      setLoadingAIExplanation(
        null
      );
    }
  }

  // ============================================================
  // AI RANK ANSWERS
  // ============================================================

  async function rankAnswersWithAI(
    questionId: number,
    question: string
  ) {
    const questionAnswers =
      answers[questionId] || [];

    // Need at least two answers
    if (questionAnswers.length < 2) {
      setError(
        "AI ranking requires at least two answers."
      );
      return;
    }

    // AI ranking currently works only with text answers.
    // PNG-only answers have an empty body.
    const textAnswers =
      questionAnswers.filter(
        (answer) =>
          answer.body?.trim()
      );

    if (textAnswers.length < 2) {
      setError(
        "AI ranking requires at least two text-based answers."
      );
      return;
    }

    setLoadingAIRanking(questionId);
    setError(null);

    try {
      const res = await fetch(
        "/api/ai-rank-answers",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question:
              question.trim(),
            answers:
              textAnswers.map(
                (answer) => ({
                  id: answer.id,
                  body:
                    answer.body,
                  author:
                    answer.author,
                })
              ),
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to rank answers"
        );
        return;
      }

      if (
        !data?.rankings ||
        !Array.isArray(
          data.rankings
        )
      ) {
        setError(
          "AI did not return valid rankings"
        );
        return;
      }

      setAnswerRankings((prev) => ({
        ...prev,
        [questionId]:
          data.rankings,
      }));

      setAiRankedQuestions((prev) => ({
        ...prev,
        [questionId]: true,
      }));
    } catch (err) {
      console.error(
        "AI answer ranking error:",
        err
      );

      setError(
        "Failed to rank answers. Please try again."
      );
    } finally {
      setLoadingAIRanking(null);
    }
  }

  // ============================================================
  // SHOW LATEST ANSWERS
  // ============================================================

  function showLatestAnswers(
    questionId: number
  ) {
    setAiRankedQuestions((prev) => ({
      ...prev,
      [questionId]: false,
    }));
  }

  // ============================================================
  // GET DISPLAYED ANSWERS
  // ============================================================

  function getDisplayedAnswers(
    questionId: number
  ): Answer[] {
    const questionAnswers =
      answers[questionId] || [];

    const isAIRanked =
      aiRankedQuestions[
        questionId
      ];

    const rankings =
      answerRankings[
        questionId
      ];

    // Normal/latest order
    if (
      !isAIRanked ||
      !rankings
    ) {
      return questionAnswers;
    }

    const rankingMap =
      new Map<
        number,
        AnswerRanking
      >(
        rankings.map(
          (ranking) => [
            ranking.answer_id,
            ranking,
          ]
        )
      );

    return [...questionAnswers].sort(
      (a, b) => {
        const rankingA =
          rankingMap.get(a.id);

        const rankingB =
          rankingMap.get(b.id);

        // AI-ranked answers first
        if (
          rankingA &&
          !rankingB
        ) {
          return -1;
        }

        if (
          !rankingA &&
          rankingB
        ) {
          return 1;
        }

        if (
          !rankingA &&
          !rankingB
        ) {
          return 0;
        }

        return (
          (rankingB?.score ?? 0) -
          (rankingA?.score ?? 0)
        );
      }
    );
  }

  // ============================================================
  // GET RANKING FOR ANSWER
  // ============================================================

  function getAnswerRanking(
    questionId: number,
    answerId: number
  ) {
    return answerRankings[
      questionId
    ]?.find(
      (ranking) =>
        ranking.answer_id ===
        answerId
    );
  }

  // ============================================================
  // SELECT PNG
  // ============================================================

  function handleAnswerFileChange(
    questionId: number,
    file: File | null
  ) {
    const oldPreview =
      answerPreviews[questionId];

    if (oldPreview) {
      URL.revokeObjectURL(
        oldPreview
      );
    }

    if (!file) {
      setAnswerFiles((prev) => ({
        ...prev,
        [questionId]: null,
      }));

      setAnswerPreviews((prev) => ({
        ...prev,
        [questionId]: null,
      }));

      return;
    }

    // Check PNG
    if (
      file.type !== "image/png" ||
      !file.name
        .toLowerCase()
        .endsWith(".png")
    ) {
      setError(
        "Only PNG (.png) files are allowed."
      );

      return;
    }

    // 5 MB limit
    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "PNG image must be smaller than 5 MB."
      );

      return;
    }

    setError(null);

    const previewUrl =
      URL.createObjectURL(file);

    setAnswerFiles((prev) => ({
      ...prev,
      [questionId]: file,
    }));

    setAnswerPreviews((prev) => ({
      ...prev,
      [questionId]: previewUrl,
    }));
  }

  // ============================================================
  // REMOVE PNG
  // ============================================================

  function removeAnswerFile(
    questionId: number
  ) {
    const preview =
      answerPreviews[questionId];

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setAnswerFiles((prev) => ({
      ...prev,
      [questionId]: null,
    }));

    setAnswerPreviews((prev) => ({
      ...prev,
      [questionId]: null,
    }));
  }

  // ============================================================
  // POST ANSWER
  // ============================================================

  async function submitAnswer(
    questionId: number
  ) {
    const body =
      answerDrafts[questionId]
        ?.trim() || "";

    const file =
      answerFiles[questionId] ||
      null;

    // Must have either text or image
    if (!body && !file) {
      setError(
        "Please write an answer or attach a PNG image."
      );
      return;
    }

    setPostingAnswer(questionId);
    setError(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "question_id",
        String(questionId)
      );

      formData.append(
        "body",
        body
      );

      formData.append(
        "author",
        name.trim()
      );

      if (file) {
        formData.append(
          "image",
          file
        );
      }

      const res = await fetch(
        "/api/answers",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to post answer"
        );
        return;
      }

      // Add answer immediately
      setAnswers((prev) => ({
        ...prev,
        [questionId]: [
          ...(prev[
            questionId
          ] || []),
          data,
        ],
      }));

      // --------------------------------------------------------
      // IMPORTANT:
      // A newly added answer makes the previous AI ranking
      // outdated. Clear it so the user must rank again.
      // --------------------------------------------------------

      setAnswerRankings((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[questionId];

        return updated;
      });

      setAiRankedQuestions((prev) => {
        const updated = {
          ...prev,
        };

        delete updated[questionId];

        return updated;
      });

      // Clear text
      setAnswerDrafts((prev) => ({
        ...prev,
        [questionId]: "",
      }));

      // Clear file
      removeAnswerFile(
        questionId
      );
    } catch (err) {
      console.error(
        "Answer submission error:",
        err
      );

      setError(
        "Failed to post answer"
      );
    } finally {
      setPostingAnswer(null);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {hydrated
          ? "Interactive ✓"
          : "Loading..."}
      </p>

      {/* ========================================================
          NAME
      ======================================================== */}

      <input
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
        placeholder="Your name"
        className="w-full border px-3 py-2 text-black"
      />

      {/* ========================================================
          QUESTION
      ======================================================== */}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value)
          }
          placeholder="Ask a question..."
          className="flex-1 border px-3 py-2 text-black"
        />

        <button
          onClick={
            improveQuestion
          }
          disabled={improving}
          className="border px-3 py-2"
        >
          {improving
            ? "Improving..."
            : "Improve"}
        </button>

        <button
          onClick={submit}
          className="border px-3 py-2"
        >
          Ask
        </button>
      </div>

      {/* ========================================================
          CATEGORY
      ======================================================== */}

      <input
        value={category}
        onChange={(e) =>
          setCategory(e.target.value)
        }
        placeholder="Category"
        className="w-full border px-3 py-2 text-black"
      />

      {/* ========================================================
          SEARCH
      ======================================================== */}

      <input
        value={query}
        onChange={(e) =>
          setQuery(e.target.value)
        }
        placeholder="Search questions..."
        className="w-full border px-3 py-2 text-black"
      />

      <input
        value={nameSearch}
        onChange={(e) =>
          setNameSearch(
            e.target.value
          )
        }
        placeholder="Search by name..."
        className="w-full border px-3 py-2 text-black mt-2"
      />

      <input
        value={categoryFilter}
        onChange={(e) =>
          setCategoryFilter(
            e.target.value
          )
        }
        placeholder="Search by category..."
        className="w-full border px-3 py-2 text-black"
      />

      {loading && (
        <p className="text-sm text-gray-500">
          Loading questions...
        </p>
      )}

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* ========================================================
          QUESTIONS
      ======================================================== */}

      <ul className="space-y-3">
        {questions.map((q) => {
          const questionAnswers =
            answers[q.id] || [];

          const isExpanded =
            expandedQuestion ===
            q.id;

          const selectedFile =
            answerFiles[q.id] ||
            null;

          const preview =
            answerPreviews[q.id] ||
            null;

          const aiAnswer =
            aiAnswers[q.id] ||
            null;

          const currentAIMode =
            aiAnswerMode[q.id] ||
            "simple";

          const isAIRanked =
            aiRankedQuestions[
              q.id
            ] === true;

          const rankings =
            answerRankings[
              q.id
            ] || [];

          const hasEnoughTextAnswers =
            questionAnswers.filter(
              (answer) =>
                answer.body?.trim()
            ).length >= 2;

          return (
            <li
              key={q.id}
              className="border p-3"
            >
              {/* ==================================================
                  QUESTION HEADER
              ================================================== */}

              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {q.body}
                  </div>

                  <div className="text-xs text-blue-600 mt-1">
                    👤 Asked by:{" "}
                    {q.author ||
                      "Anonymous"}
                  </div>

                  {q.category && (
                    <div className="text-xs text-gray-500">
                      #{q.category}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 items-center ml-4">
                  <button
                    onClick={() =>
                      upvote(q.id)
                    }
                  >
                    ▲
                  </button>

                  <span>
                    {q.votes}
                  </span>

                  <button
                    onClick={() =>
                      downvote(q.id)
                    }
                  >
                    ▼
                  </button>

                  <button
                    onClick={() =>
                      togglePin(q.id)
                    }
                  >
                    {q.is_pinned
                      ? "📌"
                      : "Pin"}
                  </button>
                </div>
              </div>

              {/* ==================================================
                  QUESTION ACTIONS
              ================================================== */}

              <div className="mt-3 flex flex-wrap gap-2">
                {/* ANSWERS */}

                <button
                  onClick={() =>
                    toggleAnswers(
                      q.id
                    )
                  }
                  className="text-sm border px-3 py-1 rounded"
                >
                  💬{" "}
                  {isExpanded
                    ? "Hide Answers"
                    : `View Answers${
                        questionAnswers.length >
                        0
                          ? ` (${questionAnswers.length})`
                          : ""
                      }`}
                </button>

                {/* AI ANSWER */}

                <button
                  onClick={() =>
                    setShowAIMenu(
                      showAIMenu ===
                        q.id
                        ? null
                        : q.id
                    )
                  }
                  disabled={
                    loadingAI ===
                    q.id
                  }
                  className="text-sm border px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  {loadingAI ===
                  q.id
                    ? "🤖 Thinking..."
                    : "🤖 AI Answer"}
                </button>
              </div>

              {/* ==================================================
                  AI MODE MENU
              ================================================== */}

              {showAIMenu ===
                q.id && (
                <div className="mt-2 border rounded-lg p-3 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">
                    Choose how Kealvi AI
                    should explain this
                    question:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        generateAIAnswer(
                          q.id,
                          q.body,
                          "simple"
                        )
                      }
                      disabled={
                        loadingAI ===
                        q.id
                      }
                      className="border rounded px-3 py-1 text-sm hover:bg-white disabled:opacity-50"
                    >
                      🟢 Simple
                    </button>

                    <button
                      onClick={() =>
                        generateAIAnswer(
                          q.id,
                          q.body,
                          "detailed"
                        )
                      }
                      disabled={
                        loadingAI ===
                        q.id
                      }
                      className="border rounded px-3 py-1 text-sm hover:bg-white disabled:opacity-50"
                    >
                      📚 Detailed
                    </button>

                    <button
                      onClick={() =>
                        generateAIAnswer(
                          q.id,
                          q.body,
                          "example"
                        )
                      }
                      disabled={
                        loadingAI ===
                        q.id
                      }
                      className="border rounded px-3 py-1 text-sm hover:bg-white disabled:opacity-50"
                    >
                      💡 Example
                    </button>
                  </div>
                </div>
              )}

              {/* ==================================================
                  AI ANSWER DISPLAY
              ================================================== */}

              {aiAnswer && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-blue-900">
                      🤖 Kealvi AI Answer
                    </h3>

                    <span className="text-xs rounded-full bg-white border px-2 py-1 text-gray-600">
                      {currentAIMode ===
                      "simple"
                        ? "Simple"
                        : currentAIMode ===
                          "detailed"
                        ? "Detailed"
                        : "Example"}
                    </span>
                  </div>

                  {/* AI RESPONSE */}

                  <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                    {aiAnswer}
                  </div>

                  {/* CHANGE MODE */}

                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <p className="text-xs text-gray-500 mb-2">
                      Want another explanation?
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          generateAIAnswer(
                            q.id,
                            q.body,
                            "simple"
                          )
                        }
                        disabled={
                          loadingAI ===
                          q.id
                        }
                        className="text-xs border rounded px-2 py-1 bg-white hover:bg-gray-100 disabled:opacity-50"
                      >
                        🟢 Simple
                      </button>

                      <button
                        onClick={() =>
                          generateAIAnswer(
                            q.id,
                            q.body,
                            "detailed"
                          )
                        }
                        disabled={
                          loadingAI ===
                          q.id
                        }
                        className="text-xs border rounded px-2 py-1 bg-white hover:bg-gray-100 disabled:opacity-50"
                      >
                        📚 Detailed
                      </button>

                      <button
                        onClick={() =>
                          generateAIAnswer(
                            q.id,
                            q.body,
                            "example"
                          )
                        }
                        disabled={
                          loadingAI ===
                          q.id
                        }
                        className="text-xs border rounded px-2 py-1 bg-white hover:bg-gray-100 disabled:opacity-50"
                      >
                        💡 Example
                      </button>
                    </div>
                  </div>

                  {/* DISCLAIMER */}

                  <p className="mt-3 text-xs text-gray-500">
                    🤖 AI-generated answer.
                    Please verify important
                    information.
                  </p>
                </div>
              )}

              {/* ==================================================
                  ANSWERS
              ================================================== */}

              {isExpanded && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold">
                      💬 Answers
                    </h3>

                    {/* ==================================================
                        AI RANKING CONTROLS
                    ================================================== */}

                    {questionAnswers.length >=
                      2 && (
                      <div className="flex flex-wrap gap-2">
                        {hasEnoughTextAnswers ? (
                          <>
                            <button
                              onClick={() =>
                                rankAnswersWithAI(
                                  q.id,
                                  q.body
                                )
                              }
                              disabled={
                                loadingAIRanking ===
                                q.id
                              }
                              className="text-xs border rounded px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                            >
                              {loadingAIRanking ===
                              q.id
                                ? "✨ Ranking..."
                                : isAIRanked
                                ? "✨ Re-Rank with AI"
                                : "✨ AI Ranked"}
                            </button>

                            {isAIRanked && (
                              <button
                                onClick={() =>
                                  showLatestAnswers(
                                    q.id
                                  )
                                }
                                className="text-xs border rounded px-3 py-1 bg-white hover:bg-gray-100"
                              >
                                Latest Order
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">
                            ✨ AI ranking needs
                            at least 2 text
                            answers
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ==================================================
                      AI RANKING STATUS
                  ================================================== */}

                  {isAIRanked &&
                    rankings.length > 0 && (
                      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            ✨
                          </span>

                          <div>
                            <p className="text-sm font-semibold text-purple-900">
                              AI Ranked Answers
                            </p>

                            <p className="text-xs text-purple-700">
                              Answers are ordered from
                              most relevant and useful
                              to least relevant.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {loadingAnswers ===
                  q.id ? (
                    <p className="text-sm text-gray-500">
                      Loading answers...
                    </p>
                  ) : questionAnswers.length ===
                    0 ? (
                    <p className="text-sm text-gray-500 mb-4">
                      No answers yet.
                      Be the first to
                      answer!
                    </p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {getDisplayedAnswers(
                        q.id
                      ).map(
                        (answer, index) => {
                          const ranking =
                            getAnswerRanking(
                              q.id,
                              answer.id
                            );

                          return (
                            <div
                              key={
                                answer.id
                              }
                              className={`border rounded p-3 bg-gray-50 ${
                                ranking &&
                                isAIRanked &&
                                index ===
                                  0
                                  ? "border-purple-300 bg-purple-50"
                                  : ""
                              }`}
                            >
                              {/* ==================================================
                                  AI RANK HEADER
                              ================================================== */}

                              {ranking &&
                                isAIRanked && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm">
                                        {index ===
                                        0
                                          ? "🥇"
                                          : index ===
                                            1
                                          ? "🥈"
                                          : index ===
                                            2
                                          ? "🥉"
                                          : `#${index + 1}`}
                                      </span>

                                      <span className="text-xs font-medium rounded-full border px-2 py-1 bg-white text-purple-700">
                                        ✨{" "}
                                        {
                                          ranking.label
                                        }
                                      </span>
                                    </div>

                                    <span className="text-xs font-semibold text-purple-700">
                                      AI Score:{" "}
                                      {
                                        ranking.score
                                      }
                                      /100
                                    </span>
                                  </div>
                                )}

                              {/* ANSWER TEXT */}

                              {answer.body && (
                                <div className="text-sm whitespace-pre-wrap">
                                  {answer.body}
                                </div>
                              )}

                              {/* ANSWER IMAGE */}

                              {answer.image_url && (
                                <div className="mt-3">
                                  <img
                                    src={
                                      answer.image_url
                                    }
                                    alt="Answer attachment"
                                    className="max-w-full max-h-[500px] rounded border object-contain"
                                  />
                                </div>
                              )}

                              {/* ANSWER INFO */}

                              <div className="text-xs text-gray-500 mt-2">
                                👤{" "}
                                {answer.author ||
                                  "Anonymous"}{" "}
                                {" • "}
                                {new Date(
                                  answer.created_at
                                ).toLocaleString()}
                              </div>

                              {/* ==================================================
                                  AI RANKING REASON
                              ================================================== */}

                              {ranking &&
                                isAIRanked && (
                                  <div className="mt-3 rounded-md border border-purple-100 bg-white p-2">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-semibold text-purple-800">
                                        Why this ranking?
                                      </span>{" "}
                                      {
                                        ranking.reason
                                      }
                                    </p>
                                  </div>
                                )}

                              {/* ==================================================
                                  EXPLAIN MY ANSWER
                              ================================================== */}

                              {answer.body && (
                                <div className="mt-3">
                                  <button
                                    onClick={() =>
                                      explainAnswer(
                                        answer.id,
                                        q.body,
                                        answer.body
                                      )
                                    }
                                    disabled={
                                      loadingAIExplanation ===
                                      answer.id
                                    }
                                    className="text-xs border rounded px-3 py-1 bg-white hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    {loadingAIExplanation ===
                                    answer.id
                                      ? "✨ Analyzing..."
                                      : "✨ Explain My Answer"}
                                  </button>
                                </div>
                              )}

                              {/* ==================================================
                                  AI ANSWER REVIEW
                              ================================================== */}

                              {aiExplanations[
                                answer.id
                              ] && (
                                <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <h4 className="font-semibold text-purple-900">
                                      ✨ Kealvi AI Review
                                    </h4>

                                    <button
                                      onClick={() =>
                                        setAiExplanations(
                                          (prev) => {
                                            const updated = {
                                              ...prev,
                                            };

                                            delete updated[
                                              answer.id
                                            ];

                                            return updated;
                                          }
                                        )
                                      }
                                      className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      Hide
                                    </button>
                                  </div>

                                  <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                    {
                                      aiExplanations[
                                        answer.id
                                      ]
                                    }
                                  </div>

                                  <p className="mt-3 text-xs text-gray-500">
                                    ✨ AI-generated
                                    feedback.
                                    Please verify
                                    important
                                    information.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* ==================================================
                      WRITE ANSWER
                  ================================================== */}

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={
                          answerDrafts[
                            q.id
                          ] || ""
                        }
                        onChange={(e) =>
                          setAnswerDrafts(
                            (prev) => ({
                              ...prev,
                              [q.id]:
                                e.target
                                  .value,
                            })
                          )
                        }
                        placeholder="Write an answer..."
                        className="flex-1 border px-3 py-2 text-black"
                        disabled={
                          postingAnswer ===
                          q.id
                        }
                        onKeyDown={(
                          e
                        ) => {
                          if (
                            e.key ===
                              "Enter" &&
                            !e.shiftKey
                          ) {
                            e.preventDefault();

                            submitAnswer(
                              q.id
                            );
                          }
                        }}
                      />

                      {/* PNG PICKER */}

                      <label
                        className={`border px-3 py-2 rounded cursor-pointer ${
                          postingAnswer ===
                          q.id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        🖼️ PNG

                        <input
                          type="file"
                          accept=".png,image/png"
                          className="hidden"
                          disabled={
                            postingAnswer ===
                            q.id
                          }
                          onChange={(
                            e
                          ) => {
                            const file =
                              e.currentTarget
                                .files?.[0] ||
                              null;

                            handleAnswerFileChange(
                              q.id,
                              file
                            );

                            // Allow selecting
                            // same file again
                            e.currentTarget.value =
                              "";
                          }}
                        />
                      </label>

                      {/* SEND ANSWER */}

                      <button
                        onClick={() =>
                          submitAnswer(
                            q.id
                          )
                        }
                        disabled={
                          postingAnswer ===
                          q.id
                        }
                        className="border px-3 py-2 rounded"
                      >
                        {postingAnswer ===
                        q.id
                          ? "Posting..."
                          : "Answer"}
                      </button>
                    </div>

                    {/* ==================================================
                        IMAGE PREVIEW
                    ================================================== */}

                    {selectedFile &&
                      preview && (
                        <div className="border rounded p-3 bg-gray-50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">
                              Selected PNG
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removeAnswerFile(
                                  q.id
                                )
                              }
                              className="text-sm text-red-600"
                            >
                              ✕ Remove
                            </button>
                          </div>

                          <img
                            src={preview}
                            alt="Selected PNG preview"
                            className="max-w-full max-h-64 rounded border object-contain"
                          />

                          <p className="text-xs text-gray-500 mt-2">
                            {selectedFile.name}{" "}
                            •{" "}
                            {(
                              selectedFile.size /
                              1024 /
                              1024
                            ).toFixed(
                              2
                            )}{" "}
                            MB
                          </p>
                        </div>
                      )}

                    <p className="text-xs text-gray-500">
                      You can answer with
                      text, a PNG image, or
                      both. PNG only,
                      maximum 5 MB.
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}