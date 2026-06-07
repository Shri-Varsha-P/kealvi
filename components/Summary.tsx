"use client";

import { useEffect, useState } from "react";

export default function Summary() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/summary");
      const json = await res.json();
      setData(json);
    }

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <p>Loading summary...</p>;

  return (
    <div className="border p-3 rounded space-y-1 text-sm">
      <p>📝 Total Questions: {data.total_questions}</p>
      <p>🧑 Total Authors: {data.total_authors}</p>
      <p>🗳 Total Voters: {data.total_voters}</p>
    </div>
  );
}