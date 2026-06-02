"use client";

import { useEffect, useState } from "react";

type PollOption = {
  id: number;
  option_text: string;
};

type Poll = {
  id: number;
  question: string;
  poll_options: PollOption[];
};

export default function PollCard() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPolls();
  }, []);

  async function loadPolls() {
    try {
      const response = await fetch("/api/polls");

      const data = await response.json();

      if (!response.ok) {
        console.error("API ERROR:", data);
        setError(data.error || "Failed to load polls");
        return;
      }

      setPolls(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load polls");
    }
  }

  async function vote(pollId: number, optionId: number) {
    const voterId =
      localStorage.getItem("voter_id") ?? crypto.randomUUID();

    localStorage.setItem("voter_id", voterId);

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId,
          optionId,
          voterId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Vote failed");
        return;
      }

      alert("Vote submitted");
    } catch (err) {
      console.error(err);
      alert("Vote failed");
    }
  }

  if (error) {
    return (
      <div className="rounded border border-red-500 p-4">
        <p className="font-semibold text-red-600">
          Poll Error:
        </p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <div
          key={poll.id}
          className="rounded border p-4"
        >
          <h3 className="mb-3 text-lg font-semibold">
            {poll.question}
          </h3>

          <div className="space-y-2">
            {poll.poll_options?.map((option) => (
              <button
                key={option.id}
                onClick={() => vote(poll.id, option.id)}
                className="block w-full rounded border p-2 text-left"
              >
                {option.option_text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}