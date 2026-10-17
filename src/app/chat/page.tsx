"use client";

import dynamic from "next/dynamic";

// Client-only: the planner seeds state from localStorage, which would mismatch a server render.
const ChatHome = dynamic(() => import("../chat-home").then((module) => module.ChatHome), {
  ssr: false,
  loading: () => <div className="flex min-h-dvh items-center justify-center bg-bg text-[15px] text-fg-muted">Loading…</div>,
});

export default function ChatPage() {
  return <ChatHome />;
}
