"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./slides.css";

/** The repo's CSS pipeline emits this stylesheet globally, so every selector is explicitly prefixed. */
const styles = new Proxy({} as Record<string, string>, {
  get: (_target, property) => `slides-${String(property)}`,
});

interface SlideDefinition {
  title: string;
  render: () => ReactNode;
}

interface S1Slot {
  code: string;
  day: 0 | 1 | 2 | 3 | 4;
  start: number;
  end: number;
  activity: string;
  tone: number;
}

type MotionStyle = CSSProperties & {
  "--delay"?: string;
};

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const DAY_SPAN = DAY_END - DAY_START;

const s1Plan: S1Slot[] = [
  { code: "09051", day: 0, start: 1030, end: 1080, activity: "Lecture", tone: 0 },
  { code: "09051", day: 1, start: 790, end: 900, activity: "Workshop", tone: 0 },
  { code: "09051", day: 2, start: 1030, end: 1080, activity: "Tutorial", tone: 0 },
  { code: "09051", day: 3, start: 790, end: 900, activity: "Workshop", tone: 0 },
  { code: "09051", day: 4, start: 540, end: 590, activity: "Lecture", tone: 0 },
  { code: "10022", day: 0, start: 790, end: 840, activity: "Lecture", tone: 1 },
  { code: "10022", day: 0, start: 850, end: 930, activity: "Tutorial", tone: 1 },
  { code: "10022", day: 4, start: 790, end: 840, activity: "Lecture", tone: 1 },
  { code: "10052", day: 0, start: 970, end: 1020, activity: "Lecture", tone: 2 },
  { code: "10052", day: 3, start: 970, end: 1020, activity: "Lecture", tone: 2 },
  { code: "10052", day: 4, start: 670, end: 780, activity: "Tutorial", tone: 2 },
  { code: "10067", day: 0, start: 600, end: 650, activity: "Lecture", tone: 3 },
  { code: "10067", day: 1, start: 670, end: 720, activity: "Tutorial", tone: 3 },
  { code: "10067", day: 2, start: 600, end: 650, activity: "Lecture", tone: 3 },
  { code: "10067", day: 4, start: 600, end: 650, activity: "Lecture", tone: 3 },
];

const planCourses = [
  ["INFR09032", "System Design Project", "20", "S2"],
  ["INFR09051", "Informatics Large Practical", "20", "S1"],
  ["INFR10022", "Professional Issues (Level 10)", "10", "S1"],
  ["INFR10052", "Algorithms and Data Structures", "10", "S1"],
  ["INFR10065", "Compiling Techniques", "20", "S2"],
  ["INFR10067", "Computer Security", "20", "S1"],
  ["INFR10074", "Computer Communications and Networks", "20", "S2"],
] as const;

const delay = (ms: number): MotionStyle => ({ "--delay": `${ms}ms` });

function ApertureMark({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? styles.markCompact : styles.mark}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Aperture"
    >
      <circle className={styles.markRing} cx="50" cy="50" r="43" />
      <g className={styles.markBlades}>
        <path d="M50 18 78 34 50 50Z" />
        <path d="M78 34 78 66 50 50Z" />
        <path d="M78 66 50 82 50 50Z" />
        <path d="M50 82 22 66 50 50Z" />
        <path d="M22 66 22 34 50 50Z" />
        <path d="M22 34 50 18 50 50Z" />
      </g>
      <circle className={styles.markCore} cx="50" cy="50" r="12" />
    </svg>
  );
}

function SlideFrame({
  slide,
  index,
  state,
  direction,
}: {
  slide: SlideDefinition;
  index: number;
  state: "active" | "leaving";
  direction: 1 | -1;
}) {
  return (
    <section
      className={`${styles.slide} ${state === "active" ? styles.slideActive : styles.slideLeaving}`}
      data-direction={direction}
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${index + 1} of 6: ${slide.title}`}
      aria-hidden={state === "leaving" ? true : undefined}
      inert={state === "leaving"}
    >
      {slide.render()}
    </section>
  );
}

function SlideHeader({ index, section, note }: { index: string; section: string; note?: string }) {
  return (
    <header className={styles.slideHeader}>
      <div className={styles.kicker}>
        <span className={styles.kickerIndex}>{index}</span>
        <span>{section}</span>
      </div>
      {note && <p className={styles.headerNote}>{note}</p>}
    </header>
  );
}

function TitleSlide() {
  return (
    <div className={styles.titleSlide}>
      <div className={styles.coverHalo} aria-hidden />
      <div className={styles.coverBrand}>
        <div className={styles.coverMark}>
          <ApertureMark />
        </div>
        <div>
          <p className={styles.brandName}>APERTURE</p>
          <p className={styles.brandMeta}>EDINBURGH · FLIP THE SCRIPT</p>
        </div>
      </div>

      <div className={styles.coverStatement}>
        <p className={`${styles.coverEyebrow} ${styles.rise}`} style={delay(180)}>
          WEEK-FIRST DEGREE PLANNING
        </p>
        <h1 className={styles.coverTitle} aria-label="The week chooses the courses.">
          {["The", "week", "chooses", "the", "courses."].map((word, index) => (
            <span
              key={`${word}-${index}`}
              className={`${styles.coverWord} ${index === 1 ? styles.coverWordAccent : ""}`}
              style={delay(260 + index * 95)}
              aria-hidden
            >
              {word}
            </span>
          ))}
        </h1>
        <p className={`${styles.coverSub} ${styles.rise}`} style={delay(820)}>
          Describe the week you want; get back the legal course choices that produce it.
        </p>
      </div>

      <div className={`${styles.coverFoot} ${styles.rise}`} style={delay(1020)}>
        <span>BSc Computer Science (Hons) · 2026/27</span>
        <span className={styles.coverFootRule} aria-hidden />
        <span>Week in. Legal year out.</span>
      </div>
    </div>
  );
}

function InversionSlide() {
  return (
    <>
      <SlideHeader index="01" section="THE INVERSION" note="Not a smarter filter. A different control surface." />
      <h2 className={`${styles.title} ${styles.rise}`} style={delay(70)}>
        The controls move upstream.
      </h2>

      <div className={styles.inversionBody}>
        <div className={`${styles.assumptionCard} ${styles.rise}`} style={delay(180)}>
          <span className={styles.cardLabel}>OLD ASSUMPTION</span>
          <p className={styles.oldStatement}>
            Pick courses. Discover the week. <em>Live with it.</em>
          </p>
          <div className={styles.flowRow} aria-label="Course choice leads to a discovered timetable">
            <span className={styles.flowNodeMuted}>COURSE CHOICE</span>
            <span className={`${styles.flowArrow} ${styles.flowArrowWarm}`} aria-hidden />
            <span className={styles.flowNodeMuted}>DISCOVERED WEEK</span>
            <span className={styles.flowNoteWarm}>clash found late</span>
          </div>
        </div>

        <div className={`${styles.inversionTurn} ${styles.pop}`} style={delay(430)} aria-hidden>
          <span>↓</span>
          <small>INVERT</small>
        </div>

        <div className={`${styles.flipCard} ${styles.rise}`} style={delay(560)}>
          <span className={styles.cardLabelAccent}>THE FLIP</span>
          <p className={styles.flipStatement}>
            Paint the week. Solve for a <span>legal year.</span>
          </p>
          <div className={styles.flowRow} aria-label="Desired week leads to a legal course set">
            <span className={styles.flowNodeAccent}>DESIRED WEEK</span>
            <span className={`${styles.flowArrow} ${styles.flowArrowCool}`} aria-hidden />
            <span className={styles.flowNodeAccent}>LEGAL COURSE SET</span>
            <span className={styles.flowNoteCool}>fit proven</span>
          </div>
        </div>
      </div>

      <p className={`${styles.thesis} ${styles.rise}`} style={delay(980)}>
        The timetable becomes the prompt. <span>Degree law becomes code.</span>
      </p>
    </>
  );
}

function ClashSlide() {
  const left = ((790 - 780) / 120) * 100;
  const workshopWidth = ((900 - 790) / 120) * 100;
  const databaseWidth = ((840 - 790) / 120) * 100;

  return (
    <>
      <SlideHeader index="02" section="THE PAIN" note="2026/27 semester 1 · Tuesday · exported timetable" />
      <h2 className={`${styles.title} ${styles.clashTitle} ${styles.rise}`} style={delay(70)}>
        A clash you only meet <span className={styles.warmText}>after choosing.</span>
      </h2>

      <div className={`${styles.clashPanel} ${styles.rise}`} style={delay(170)}>
        <div className={styles.timelineHead}>
          <span>13:00</span>
          <span>13:30</span>
          <span>14:00</span>
          <span>14:30</span>
          <span>15:00</span>
        </div>
        <div className={styles.timelineGrid} aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((line) => (
            <i key={line} />
          ))}
        </div>

        <div className={styles.classRow}>
          <div className={styles.classLabel}>
            <span className={styles.classCode}>INFR09051</span>
            <strong>Informatics Large Practical</strong>
            <small>Computer Workshop · compulsory</small>
          </div>
          <div className={styles.classTrack}>
            <div
              className={`${styles.classBar} ${styles.classBarCompulsory}`}
              style={{ left: `${left}%`, width: `${workshopWidth}%`, ...delay(400) }}
            >
              <span>13:10–15:00</span>
              <small>weeks 2 · 4 · 8 · 10</small>
            </div>
          </div>
        </div>

        <div className={styles.classRow}>
          <div className={styles.classLabel}>
            <span className={styles.classCode}>INFR10080</span>
            <strong>Introduction to Databases</strong>
            <small>Lecture · Group A option</small>
          </div>
          <div className={styles.classTrack}>
            <div
              className={`${styles.classBar} ${styles.classBarOption}`}
              style={{ left: `${left}%`, width: `${databaseWidth}%`, ...delay(700) }}
            >
              <span>13:10–14:00</span>
              <small>weeks 1–11</small>
            </div>
          </div>
        </div>

        <div
          className={`${styles.collisionPin} ${styles.pop}`}
          style={{ left: `calc(24% + ${left}% + ${databaseWidth}% / 2)`, ...delay(1120) }}
          aria-label="50 minute overlap"
        >
          <span>50 MIN</span>
          <i aria-hidden />
        </div>
      </div>

      <div className={`${styles.clashCopy} ${styles.rise}`} style={delay(1220)}>
        <p>
          The degree requires one. <span>You wanted the other.</span>
        </p>
        <p>The old workflow only explains the collision once you have committed.</p>
      </div>
    </>
  );
}

function MiniSchedule() {
  const paintedTop = ((900 - DAY_START) / DAY_SPAN) * 100;
  const paintedHeight = ((1080 - 900) / DAY_SPAN) * 100;

  return (
    <div className={styles.miniSchedule}>
      <div className={styles.scheduleDays} aria-hidden>
        {["MON", "TUE", "WED", "THU", "FRI"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={styles.scheduleCanvas}>
        <div className={styles.scheduleLines} aria-hidden>
          {[9, 12, 15, 18].map((hour) => (
            <span key={hour} style={{ top: `${((hour * 60 - DAY_START) / DAY_SPAN) * 100}%` }}>
              {String(hour).padStart(2, "0")}
            </span>
          ))}
        </div>
        <div className={styles.scheduleArea}>
          <div
            className={`${styles.paintedFree} ${styles.paintedFreeGrow}`}
            style={{
              left: "20%",
              top: `${paintedTop}%`,
              height: `${paintedHeight}%`,
              ...delay(720),
            }}
          >
            <span>YOUR TIME</span>
          </div>
          {s1Plan.map((slot, index) => {
            const top = ((slot.start - DAY_START) / DAY_SPAN) * 100;
            const height = ((slot.end - slot.start) / DAY_SPAN) * 100;
            return (
              <div
                key={`${slot.code}-${slot.day}-${slot.start}-${slot.activity}`}
                className={`${styles.scheduleBlock} ${styles.scheduleBlockGrow}`}
                title={`${slot.code} ${slot.activity}`}
                data-tone={slot.tone}
                style={{
                  left: `calc(${slot.day * 20}% + 2px)`,
                  top: `${top}%`,
                  height: `${height}%`,
                  ...delay(520 + index * 28),
                }}
              >
                <span>{slot.code}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductSlide() {
  return (
    <>
      <SlideHeader index="03" section="THE PRODUCT" note="Reconstructed from a real Year 3 solve" />
      <div className={`${styles.productHead} ${styles.rise}`} style={delay(70)}>
        <h2 className={styles.titleSmall}>The week is the input.</h2>
        <div className={styles.queryChip}>
          <span className={styles.queryDot} aria-hidden />
          <span className={styles.typedQuery}>Keep Tuesday after 15:00 free</span>
          <span className={styles.typedCaret} aria-hidden />
        </div>
      </div>

      <div className={styles.productGrid}>
        <div className={`${styles.weekCard} ${styles.rise}`} style={delay(180)}>
          <div className={styles.cardTopline}>
            <div>
              <span className={styles.cardLabel}>YOUR WEEK</span>
              <p>Semester 1 · selected tutorial groups</p>
            </div>
            <span className={styles.freeTag}>TUES 15:00+ FREE</span>
          </div>
          <MiniSchedule />
          <div className={`${styles.gridLegend} ${styles.fade}`} style={delay(1100)}>
            <span><i className={styles.legendCourse} />classes</span>
            <span><i className={styles.legendFree} />painted free time</span>
          </div>
        </div>

        <div className={`${styles.planCard} ${styles.pop}`} style={delay(930)}>
          <div className={styles.planHead}>
            <div>
              <span className={styles.cardLabel}>PLAN 1</span>
              <p className={styles.planFit}>
                <span aria-hidden>✓</span> Fits your week
              </p>
            </div>
            <span className={styles.planScore}>0 MISSES</span>
          </div>

          <div className={styles.planMetrics}>
            <div><strong>7</strong><span>courses</span></div>
            <div><strong>120</strong><span>credits</span></div>
            <div><strong>60 / 60</strong><span>semester split</span></div>
          </div>

          <ul className={styles.courseList} aria-label="Courses in this plan">
            {planCourses.map(([code, title, credits, semester], index) => (
              <li key={code} className={styles.courseRow} style={delay(1100 + index * 55)}>
                <span className={styles.courseCode}>{code}</span>
                <span className={styles.courseTitle}>{title}</span>
                <span className={styles.courseMeta}>{credits} cr · {semester}</span>
              </li>
            ))}
          </ul>

          <div className={`${styles.ruleLedger} ${styles.rise}`} style={delay(1600)}>
            <div className={styles.ruleLine}>
              <span className={styles.ruleCheck}>✓</span>
              <span>4 compulsory courses</span>
              <a href="https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-3" target="_blank" rel="noreferrer">
                DRPS ↗
              </a>
            </div>
            <div className={styles.ruleLine}>
              <span className={styles.ruleCheck}>✓</span>
              <span>Group A · exactly 50 credits</span>
              <a href="https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm#dpt-year-3" target="_blank" rel="noreferrer">
                DRPS ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StackSlide() {
  const layers = [
    {
      number: "01",
      label: "DESCRIBE",
      title: "Plain English becomes typed preferences.",
      body: "DeepSeek proposes a patch. Zod validates every field before it reaches the interface.",
      tags: ["DeepSeek", "zod", "React"],
    },
    {
      number: "02",
      label: "SOLVE",
      title: "Rules stay hard. Preferences stay soft.",
      body: "A deterministic TypeScript search enumerates legal years, then scores the week you asked for.",
      tags: ["TypeScript", "branch-and-bound", "Vitest"],
    },
    {
      number: "03",
      label: "PROVE",
      title: "Every plan points back to degree law.",
      body: "Compulsory courses and credit ranges carry the exact DRPS source, so the result can be checked.",
      tags: ["DRPS", "source links", "Next.js"],
    },
  ];

  return (
    <>
      <SlideHeader index="04" section="THE STACK" note="One runtime from interface to evidence" />
      <h2 className={`${styles.title} ${styles.stackTitle} ${styles.rise}`} style={delay(70)}>
        The stack serves the inversion.
      </h2>
      <p className={`${styles.stackLead} ${styles.rise}`} style={delay(160)}>
        Next.js carries the product. The solver, not the model, carries the truth.
      </p>

      <div className={styles.layerGrid}>
        {layers.map((layer, index) => (
          <article
            key={layer.number}
            className={`${styles.layerCard} ${styles.rise}`}
            style={delay(260 + index * 120)}
          >
            <div className={styles.layerTop}>
              <span className={styles.layerNumber}>{layer.number}</span>
              <span className={styles.layerLabel}>{layer.label}</span>
            </div>
            <h3>{layer.title}</h3>
            <p>{layer.body}</p>
            <div className={styles.layerTags}>
              {layer.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </article>
        ))}
      </div>

      <div className={`${styles.stackBottom} ${styles.rise}`} style={delay(780)}>
        <div className={styles.stackStats}>
          <div><strong>68</strong><span>courses</span></div>
          <div><strong>570</strong><span>timetable slots</span></div>
          <div><strong>135</strong><span>legal Year 3 sets</span></div>
        </div>
        <div className={styles.stackChips} aria-label="Application stack">
          <span>Next.js 16</span>
          <span>React 19</span>
          <span>MongoDB Atlas</span>
          <span>2026/27 JSON fallback</span>
        </div>
      </div>

      <div className={`${styles.honestyBar} ${styles.rise}`} style={delay(990)}>
        <p>The model edits preferences. <span>The solver decides legality.</span></p>
        <small>Built with Codex + human direction.</small>
      </div>
    </>
  );
}

function LimitsSlide() {
  return (
    <>
      <SlideHeader index="05" section="THE BOUNDARY" note="No live feed. No enrolment. No hidden mock." />
      <h2 className={`${styles.title} ${styles.limitsTitle} ${styles.rise}`} style={delay(70)}>
        Real enough to trust. <span>Small enough to be honest.</span>
      </h2>

      <div className={styles.limitsGrid}>
        <article className={`${styles.limitCard} ${styles.rise}`} style={delay(240)}>
          <span className={styles.limitLabel}>REAL NOW</span>
          <ul>
            <li>2026/27 DRPS catalogue and checked-in timetable</li>
            <li>68 courses · 570 slots · 135 legal Year 3 sets</li>
            <li>Deterministic degree and clash checking</li>
            <li>Source-linked rules a student can inspect</li>
          </ul>
        </article>

        <article className={`${styles.limitCardWarm} ${styles.rise}`} style={delay(360)}>
          <span className={styles.limitLabelWarm}>DEMO BOUNDARY</span>
          <ul>
            <li>One programme: BSc Computer Science 2026/27</li>
            <li>Checked-in export, not a live timetable feed</li>
            <li>Tutorial groups are requests, not allocations</li>
            <li>Slide visuals reconstruct a real solved plan</li>
          </ul>
        </article>

        <article className={`${styles.limitCard} ${styles.rise}`} style={delay(480)}>
          <span className={styles.limitLabel}>NEXT</span>
          <ul>
            <li>Live catalogue and timetable refresh</li>
            <li>More DPT prose as typed, source-linked rules</li>
            <li>Additional programmes and schedules</li>
            <li>Central tutorial-group allocation</li>
          </ul>
        </article>
      </div>

      <div className={`${styles.closeStatement} ${styles.rise}`} style={delay(720)}>
        <p>Start with the life. <span>Check the law.</span></p>
        <div>
          <ApertureMark compact />
          <small>Built with Codex · Product AI parses preferences only</small>
        </div>
      </div>
    </>
  );
}

const SLIDES: SlideDefinition[] = [
  { title: "Aperture", render: () => <TitleSlide /> },
  { title: "The controls move upstream", render: () => <InversionSlide /> },
  { title: "A clash you only meet after choosing", render: () => <ClashSlide /> },
  { title: "The week is the input", render: () => <ProductSlide /> },
  { title: "The stack serves the inversion", render: () => <StackSlide /> },
  { title: "Real enough to trust", render: () => <LimitsSlide /> },
];

export function SlidesDeck() {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [visit, setVisit] = useState(0);
  const indexRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((delta: 1 | -1) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, indexRef.current + delta));
    if (next === indexRef.current) return;

    if (exitTimer.current) clearTimeout(exitTimer.current);
    setPrevious(indexRef.current);
    setDirection(delta);
    setIndex(next);
    setVisit((value) => value + 1);
    indexRef.current = next;
    exitTimer.current = setTimeout(() => setPrevious(null), 380);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const oldRootOverflow = root.style.overflow;
    const oldBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = oldRootOverflow;
      body.style.overflow = oldBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const fit = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const scale = Math.min(width / 1600, height / 900);
      stageRef.current?.style.setProperty("--stage-scale", String(scale));
    };
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  const current = SLIDES[index];
  const progress = ((index + 1) / SLIDES.length) * 100;

  return (
    <main className={styles.root} aria-label="Aperture pitch deck">
      <div className={styles.viewport}>
        <div ref={stageRef} className={styles.stage}>
          {previous !== null && (
            <SlideFrame
              key={`leaving-${previous}-${visit}`}
              slide={SLIDES[previous]}
              index={previous}
              state="leaving"
              direction={direction}
            />
          )}
          <SlideFrame
            key={`active-${index}-${visit}`}
            slide={current}
            index={index}
            state="active"
            direction={direction}
          />

          <div className={styles.chrome} aria-hidden>
            <div className={styles.chromeBrand}>
              <ApertureMark compact />
              <span>APERTURE</span>
            </div>
            <span className={styles.navHint}>← → navigate</span>
            <span className={styles.counter}>
              {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>
          <div className={styles.progressTrack} aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">
        Slide {index + 1} of {SLIDES.length}: {current.title}.
      </p>
    </main>
  );
}
