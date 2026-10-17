"use client";

import dynamic from "next/dynamic";
import { Shell } from "@/components/Shell";

const Home = dynamic(() => import("../home").then((m) => m.Home), {
  ssr: false,
  loading: () => (
    <Shell
      degree={<p className="text-fg-faint">Loading programme…</p>}
      week={<p className="text-fg-faint">Loading…</p>}
      results={<p className="text-fg-faint">Up to three valid years that match your week will appear here.</p>}
      ledger={<p className="text-fg-faint">Every rule a result satisfies, with a link to the DRPS line it came from.</p>}
    />
  ),
});

export default function Page() {
  return <Home />;
}
