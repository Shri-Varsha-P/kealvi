"use client";

import { useState } from "react";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [loading, setLoading] = useState(false);

  async function createPoll() {
    /* =========================
       BASIC VALIDATION
    ========================= */

    const cleanedQuestion = question.trim();
    const cleanedOption1 = option1.trim();
    const cleanedOption2 = option2.trim();

    if (
      !cleanedQuestion ||
      !cleanedOption1 ||
      !cleanedOption2
    ) {
      alert("Please fill all fields");
      return;
    }

    /* =========================
       CHECK IDENTICAL OPTIONS
    ========================= */

    const normalizedOption1 =
      cleanedOption1
        .toLowerCase()
        .replace(/\s+/g, " ");

    const normalizedOption2 =
      cleanedOption2
        .toLowerCase()
        .replace(/\s+/g, " ");

    if (normalizedOption1 === normalizedOption2) {
      alert("Poll options cannot be identical");
      return;
    }

    try {
      setLoading(true);

      /* =========================
         CREATE POLL
      ========================= */

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanedQuestion,
          options: [
            cleanedOption1,
            cleanedOption2,
          ],
        }),
      });

      const data = await response.json();

      /* =========================
         HANDLE ERRORS
      ========================= */

      if (!response.ok) {
        /*
          Duplicate poll
        */
        if (response.status === 409) {
          alert(
            "This poll already exists with the same question and options."
          );
          return;
        }

        /*
          Other validation/API errors
        */
        alert(
          data.error ||
            "Failed to create poll"
        );

        return;
      }

      /* =========================
         SUCCESS
      ========================= */

      alert("Poll created successfully");

      setQuestion("");
      setOption1("");
      setOption2("");

      /*
        Refresh the page so the new poll
        appears immediately.
      */
      window.location.reload();
    } catch (error) {
      console.error(
        "Poll creation error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create poll"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">

      {/* ================= QUESTION ================= */}

      <input
        className="w-full rounded border p-2"
        placeholder="Poll Question"
        value={question}
        onChange={(e) =>
          setQuestion(e.target.value)
        }
        disabled={loading}
      />

      {/* ================= OPTION 1 ================= */}

      <input
        className="w-full rounded border p-2"
        placeholder="Option 1"
        value={option1}
        onChange={(e) =>
          setOption1(e.target.value)
        }
        disabled={loading}
      />

      {/* ================= OPTION 2 ================= */}

      <input
        className="w-full rounded border p-2"
        placeholder="Option 2"
        value={option2}
        onChange={(e) =>
          setOption2(e.target.value)
        }
        disabled={loading}
      />

      {/* ================= CREATE BUTTON ================= */}

      <button
        onClick={createPoll}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading
          ? "Creating..."
          : "Create Poll"}
      </button>

    </div>
  );
}