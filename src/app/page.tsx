import Link from "next/link";

const STEPS = [
  {
    title: "Say what your week should look like",
    body: "Paint the hours you want kept free, avoided or preferred. Set the latest you'll start and the earliest you'll finish. Pin a course you must have; exclude one you won't take.",
  },
  {
    title: "The solver does the degree rules",
    body: "Compulsory courses, option-group credit ranges, 120 credits, semester balance, prerequisites and timetable clashes — read from the Degree Programme Table and the published timetable, checked deterministically.",
  },
  {
    title: "Get back legal years, not a shortlist",
    body: "Up to three course combinations that are valid for your programme and year, drawn on the week, with every rule they satisfy linked to the DRPS line it came from.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <span className="text-[17px] font-semibold tracking-tight">Aperture</span>
        <nav aria-label="Links" className="flex items-center gap-5 text-[15px] text-fg-muted">
          <a href="#how" className="hover:text-fg">
            How it works
          </a>
          <a href="https://github.com/ppowdderr/aperture" target="_blank" rel="noreferrer" className="hover:text-fg">
            GitHub
          </a>
          <Link href="/chat" className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg hover:brightness-110">
            Start planning
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="border-b border-line py-24">
          <p className="text-[15px] text-fg-muted">For University of Edinburgh students · BSc Computer Science 2026/27</p>
          <h1 className="mt-4 max-w-3xl text-[44px] leading-[1.1] font-semibold tracking-tight">
            Describe the week you want. Get back the course choices that make it legal.
          </h1>
          <p className="mt-6 max-w-2xl text-[19px] leading-relaxed text-fg-muted">
            Course choice today works backwards: pick courses, then discover the timetable they produce. Aperture flips it. You
            paint the week you want; it returns the combinations your degree programme actually allows.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <Link href="/chat" className="rounded-md bg-accent px-5 py-2.5 text-[16px] font-medium text-bg hover:brightness-110">
              Start planning
            </Link>
            <span className="text-[15px] text-fg-faint">No account. Your profile stays in your browser, or in a file you export.</span>
          </div>
        </section>

        <section id="how" className="grid gap-10 border-b border-line py-20 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="font-mono text-[13px] text-fg-faint">0{i + 1}</div>
              <h2 className="mt-2 text-[20px] font-medium tracking-tight">{s.title}</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-fg-muted">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-[20px] font-medium tracking-tight">What it will not do</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-fg-muted">
              It doesn&apos;t enrol you or allocate tutorial groups — the university does that. It tells you which combinations
              are worth asking for, and which group of each tutorial makes the week work. When the published timetable itself
              clashes, it says so instead of hiding it.
            </p>
          </div>
          <div>
            <h2 className="text-[20px] font-medium tracking-tight">Where the data comes from</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-fg-muted">
              Degree rules and course details are read from the{" "}
              <a href="https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Degree Regulations and Programmes of Study
              </a>
              ; timetable slots from the university&apos;s course timetable. Every rule a plan satisfies links back to its source line.
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-[14px] text-fg-faint">
        <span>Aperture · EdinburghAI Flip the Script</span>
        <a href="https://github.com/ppowdderr/aperture" target="_blank" rel="noreferrer" className="hover:text-fg">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
