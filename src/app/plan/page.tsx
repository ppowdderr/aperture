"use client";

import dynamic from "next/dynamic";

// Client-only: the planner seeds state from localStorage, which would mismatch a server render.
const Home = dynamic(() => import("../home").then((m) => m.Home), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center bg-bg text-[15px] text-fg-faint">Loading…</div>,
});

export default function PlanPage() {
  return <Home />;
}
