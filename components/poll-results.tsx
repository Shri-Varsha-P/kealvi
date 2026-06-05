"use client";
import { useState, useEffect } from "react";

type PollOptionResult = {
  option_id: number;
  option_text: string;
  vote_count: number;
};

type PollResultsData = {
  poll_id: number;
  total_votes: number;
  options: PollOptionResult[];
};

export default function PollResults({ pollId }: { pollId: number }) {
  const [results, setResults] = useState<PollResultsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchPollResults() {
    try {
      const res = await fetch(`/api/polls/${pollId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error("Failed fetching results:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pollId) fetchPollResults();
  }, [pollId]);

  if (loading) return <p className="text-xs text-gray-400">Loading standings...</p>;
  if (!results) return null;

  return (
    <div className="p-3 border rounded-lg bg-gray-50/50 space-y-2 mt-2">
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span className="font-bold text-gray-700">Live Vote Count</span>
        <span>Total: {results.total_votes}</span>
      </div>

      <ul className="space-y-2">
        {results.options.map((opt) => {
          const percentage = results.total_votes > 0 
            ? Math.round((opt.vote_count / results.total_votes) * 100) 
            : 0;

          return (
            <li key={opt.option_id} className="text-sm">
              <div className="flex justify-between text-black font-medium">
                <span>{opt.option_text}</span>
                {/* Displays the exact vote count next to the option name */}
                <span className="text-gray-500 font-mono text-xs">
                  {opt.vote_count} {opt.vote_count === 1 ? "person" : "people"} ({percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${percentage}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
