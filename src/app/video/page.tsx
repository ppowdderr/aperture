import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aperture · Demo video",
  description: "A 68-second caption-led walkthrough of Aperture.",
};

export default function VideoPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-[17px] font-semibold tracking-tight">
          Aperture
        </Link>
        <nav aria-label="Links" className="flex items-center gap-5 text-[15px] text-fg-muted">
          <Link href="/" className="hover:text-fg">
            Home
          </Link>
          <a
            href="https://github.com/ppowdderr/aperture"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg"
          >
            GitHub
          </a>
          <Link href="/chat" className="rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:brightness-110">
            Start planning
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-fg-faint">
          68-second demo
        </p>
        <h1 className="mt-4 max-w-3xl text-[42px] leading-[1.05] font-semibold tracking-tight md:text-[54px]">
          The week chooses the courses.
        </h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-fg-muted">
          A caption-led walkthrough of the flip, the real timetable clash, and a legal Year 3 plan checked against the
          DRPS. No audio required.
        </p>

        <figure className="mt-10 overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
          <video
            controls
            playsInline
            preload="metadata"
            poster="/video/poster.png"
            aria-label="Aperture 68-second demo video"
            className="aspect-video w-full bg-black"
          >
            <source src="/video/aperture-demo.mp4" type="video/mp4" />
            Your browser does not support the video element.
          </video>
          <figcaption className="border-t border-line px-5 py-4 text-[14px] leading-relaxed text-fg-muted">
            Recreated interface with demo data. Uses the checked-in 2026/27 DRPS catalogue and timetable export, not a live
            feed.
          </figcaption>
        </figure>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="/video/aperture-demo.mp4"
            download
            className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:brightness-110"
          >
            Download MP4
          </a>
          <Link href="/chat" className="rounded-md border border-line px-4 py-2 font-medium hover:border-line-strong">
            Try Aperture
          </Link>
          <a
            href="https://github.com/ppowdderr/aperture/pull/69"
            target="_blank"
            rel="noreferrer"
            className="text-[15px] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Video source and PR
          </a>
        </div>
      </main>
    </div>
  );
}
