"use client";

import { useEffect, useState } from "react";

type PollOption = {
  id: number;
  option_text: string;
  vote_count: number; // Added tracking metric field
};

type Poll = {
  id: number;
  question: string;
  total_votes: number; // Added overall count field
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
  localStorage.getItem("voter_id") ??
  (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("voter_id", id);
    return id;
  })();

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

      // Automatically re-fetch results from database so standings refresh instantly
      loadPolls();
    } catch (err) {
      console.error(err);
      alert("Vote failed");
    }
  }

  if (error) {
    return (
      <div className="rounded border border-red-500 p-4">
        <p className="font-semibold text-red-600">Poll Error:</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <div key={poll.id} className="rounded border p-4 bg-white shadow-sm">
          <div className="flex justify-between items-baseline mb-3">
            <h3 className="text-lg font-semibold text-black">
              {poll.question}
            </h3>
            <span className="text-xs text-gray-400 font-medium">
              Total: {poll.total_votes || 0}
            </span>
          </div>

          <div className="space-y-3">
            {poll.poll_options?.map((option) => {
              // Calculate percent split safely without dividing by zero
              const percentage = poll.total_votes > 0 
                ? Math.round((option.vote_count / poll.total_votes) * 100) 
                : 0;

              return (
                <div key={option.id} className="space-y-1">
                  <button
                    onClick={() => vote(poll.id, option.id)}
                    className="flex justify-between items-center w-full rounded border p-2.5 text-left text-sm text-black hover:bg-gray-50 transition-colors font-medium"
                  >
                    <span>{option.option_text}</span>
                    {/* Renders the vote total side-by-side inside the click element button */}
                    <span className="text-gray-400 font-mono text-xs">
                      {option.vote_count || 0} {option.vote_count === 1 ? "vote" : "votes"} ({percentage}%)
                    </span>
                  </button>
                  
                  {/* Visual ratio loading bar beneath each voting block option */}
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
