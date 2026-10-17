import type { ReactNode } from "react";

interface ShellProps {
  degree: ReactNode;
  week: ReactNode;
  results: ReactNode;
  ledger: ReactNode;
}

/**
 * One-page layout. Fixed-height app shell; each region scrolls on its own.
 *
 *   ┌──────────── header ─────────────┐
 *   │ degree (full width)             │
 *   │ week / preferences │ results    │
 *   │ rules ledger (full width)       │
 *   └─────────────────────────────────┘
 */
export function Shell({ degree, week, results, ledger }: ShellProps) {
  return (
    <div className="flex h-dvh min-w-[1280px] flex-col bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-semibold tracking-tight">Aperture</span>
          <span className="hidden text-fg-muted lg:inline">
            Describe the week you want; get back the legal course choices that produce it.
          </span>
        </div>
        <nav aria-label="Links" className="flex items-center gap-4 text-fg-muted">
          <a
            href="https://www.drps.ed.ac.uk/26-27/dpt/drpsindex.htm"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg"
          >
            DRPS
          </a>
          <a
            href="https://github.com/ppowdderr/aperture"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main
        className="grid min-h-0 flex-1 gap-3 p-3"
        style={{
          gridTemplateColumns: "minmax(400px, 5fr) minmax(520px, 7fr)",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gridTemplateAreas: `"degree degree" "week results" "ledger ledger"`,
        }}
      >
        <Region area="degree" label="Your degree">
          {degree}
        </Region>
        <Region area="week" label="Your week">
          {week}
        </Region>
        <Region area="results" label="Results">
          {results}
        </Region>
        <Region area="ledger" label="Rules this satisfies">
          {ledger}
        </Region>
      </main>
    </div>
  );
}

function Region({ area, label, children }: { area: string; label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      style={{ gridArea: area }}
      className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-panel"
    >
      <h2 className="shrink-0 px-4 pt-3 pb-1 text-[13px] font-medium text-fg-muted">{label}</h2>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 pt-2">{children}</div>
    </section>
  );
}
