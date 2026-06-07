"use client";

import { useEffect, useState } from "react";

type LeaderboardItem = {
  author: string;
  total_votes: number;
  total_questions: number;
};

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/leaderboard");
        const json = await res.json();

        setData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Leaderboard error:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading leaderboard...</p>;
  }

  if (!data.length) {
    return <p className="text-sm text-gray-500">No leaderboard data yet</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((user, index) => (
        <div
          key={index}
          className="flex justify-between border p-2 rounded bg-white"
        >
          <div className="font-medium">
            #{index + 1} {user.author || "Anonymous"}
          </div>

          <div className="text-sm text-gray-600">
            ⭐ {user.total_votes} votes • 📝 {user.total_questions} questions
          </div>
        </div>
      ))}
    </div>
  );
}