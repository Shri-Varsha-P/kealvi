"use client";

import { useState } from "react";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [loading, setLoading] = useState(false);

  async function createPoll() {
    if (!question || !option1 || !option2) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          options: [option1, option2],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create poll");
      }

      alert("Poll created successfully");

      setQuestion("");
      setOption1("");
      setOption2("");

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to create poll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <input
        className="w-full rounded border p-2"
        placeholder="Poll Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Option 1"
        value={option1}
        onChange={(e) => setOption1(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="Option 2"
        value={option2}
        onChange={(e) => setOption2(e.target.value)}
      />

      <button
        onClick={createPoll}
        disabled={loading}
        className="rounded bg-black px-4 py-2 text-white"
      >
        {loading ? "Creating..." : "Create Poll"}
      </button>
    </div>
  );
}