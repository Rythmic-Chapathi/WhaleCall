type Island = {
  id: string;
  name: string;
  role: string;
  x_pct: number;
  y_pct: number;
};

async function getIslands(): Promise<Island[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/api/islands`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

export default async function Home() {
  const islands = await getIslands();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-10 font-sans">
      <h1 className="text-2xl font-bold">WhaleCall web -- chassis smoke test</h1>
      <p className="text-zinc-600">
        Fetched live from the FastAPI backend at{" "}
        <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code>:
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {islands.map((island) => (
          <li key={island.id} className="rounded border border-zinc-300 bg-white px-4 py-2">
            <strong>{island.name}</strong> -- {island.role} ({island.x_pct}%, {island.y_pct}%)
          </li>
        ))}
      </ul>
    </div>
  );
}
