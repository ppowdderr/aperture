import { ResultsStandalone } from "@/components/Results";
import { Shell } from "@/components/Shell";
import { WeekGridStandalone } from "@/components/WeekGrid";
import { loadCourses, loadProgramme, loadSlots } from "@/lib/data";
import { solve } from "@/lib/solver";

const PROGRAMME = "UTCMPSI";
const YEAR = 3;

/** Static demo input until #19 wires the degree panel and `/api/solve`: a year-3 student with the earlier compulsory courses passed. */
function demoSolutions() {
  const years = loadProgramme(PROGRAMME);
  const courses = loadCourses(PROGRAMME);
  const slots = loadSlots(PROGRAMME);
  const programme = years.find((y) => y.year === YEAR)!;
  const passed = years.filter((y) => y.year < YEAR).flatMap((y) => y.compulsory);
  const solutions = solve({
    programme,
    courses,
    slots,
    allYears: years,
    student: { programmeCode: PROGRAMME, year: YEAR, passed, background: {} },
    preferences: { blocks: [], maxBackToBackHours: 4, maxGapHours: 3, campusDaysTogether: false, wantKeywords: [], pinned: [], excluded: [] },
  });
  return { solutions, courses, slots };
}

export default function Home() {
  const demo = demoSolutions();
  return (
    <Shell
      degree={
        <Slot ticket={16} name="DegreePanel">
          <dl className="flex flex-wrap gap-x-10 gap-y-2">
            <Field label="Programme">Computer Science (BSc Hons)</Field>
            <Field label="Year">3 of 4</Field>
            <Field label="Passed">0 courses · 0 credits</Field>
          </dl>
        </Slot>
      }
      week={
        <WeekGridStandalone>
        <form className="flex shrink-0 flex-col gap-2" action="#">
          <label htmlFor="wants" className="text-[12px] text-fg-faint">
            What you want, in your own words
          </label>
          <textarea
            id="wants"
            rows={3}
            disabled
            placeholder="No 9ams on Monday or Tuesday, Friday off, something with machine learning or databases, keep King's Buildings days together, no gaps longer than two hours."
            className="min-h-[4.5rem] max-h-40 w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2 placeholder:text-fg-faint disabled:opacity-70 field-sizing-content"
          />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-fg-faint">The grid above is what the solver uses; the text fills it in.</span>
            <button type="button" className="h-9 rounded-md bg-accent px-4 font-medium text-bg hover:brightness-110">
              Solve
            </button>
          </div>
        </form>
        </WeekGridStandalone>
      }
      results={
        <ResultsStandalone solutions={demo.solutions} courses={demo.courses} slots={demo.slots} />
      }
      ledger={
        <Slot ticket={18} name="RulesLedger">
          <p className="text-fg-faint">
            Every rule a result satisfies, with a link to the DRPS line it came from.
          </p>
        </Slot>
      }
    />
  );
}

/** Marks an empty region with the ticket that fills it. Removed as each panel lands. */
function Slot({ ticket, name, children }: { ticket: number; name: string; children: React.ReactNode }) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="min-h-0 flex-1">{children}</div>
      <a
        href={`https://github.com/ppowdderr/aperture/issues/${ticket}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 self-end font-mono text-[11px] text-fg-faint hover:text-fg"
      >
        {name} · #{ticket}
      </a>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-fg-faint">{label}</dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
  );
}
