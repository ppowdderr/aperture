"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type {
  LandingContent,
  PreviewBlock,
  PreviewPlan,
  PreviewScenario,
  PreviewSemester,
} from "@/lib/landing-content";
import { styles } from "./styles";

const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const SPAN = DAY_END - DAY_START;

interface PlanPreviewProps {
  scenarios: readonly PreviewScenario[];
  shared: LandingContent["preview"]["shared"];
  initialScenarioId?: string;
  showScenarios?: boolean;
}

function preferredMotionDuration(): number {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return 0;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 360;
}

function blockStyle(block: PreviewBlock): CSSProperties {
  const start = Math.max(block.start, DAY_START);
  const end = Math.min(block.end, DAY_END);
  return {
    left: `calc(${block.day * 20}% + 1px)`,
    width: "calc(20% - 3px)",
    top: `calc(${((start - DAY_START) / SPAN) * 100}% + 1px)`,
    height: `calc(${((end - start) / SPAN) * 100}% - 2px)`,
  };
}

function timeLabelStyle(minutes: number): CSSProperties {
  return { top: `${((minutes - DAY_START) / SPAN) * 100}%` };
}

function tabIndexForKey(
  event: KeyboardEvent<HTMLDivElement>,
  current: number,
  count: number,
): number | null {
  if (event.key === "ArrowRight") return (current + 1) % count;
  if (event.key === "ArrowLeft") return (current - 1 + count) % count;
  if (event.key === "Home") return 0;
  if (event.key === "End") return count - 1;
  return null;
}

export function PlanPreview({
  scenarios,
  shared,
  initialScenarioId,
  showScenarios = true,
}: PlanPreviewProps) {
  const initialScenario = Math.max(
    0,
    scenarios.findIndex((scenario) => scenario.id === initialScenarioId),
  );
  const [scenarioIndex, setScenarioIndex] = useState(initialScenario);
  const [planIndex, setPlanIndex] = useState(0);
  const [semester, setSemester] = useState<PreviewSemester>(1);
  const [selectedCourse, setSelectedCourse] = useState(
    scenarios[initialScenario]?.plans[0]?.courses[0]?.code ?? "",
  );
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planPanelId = useId();
  const timetablePanelId = useId();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scenario = scenarios[scenarioIndex] ?? scenarios[0];
  const plan = scenario.plans[planIndex] ?? scenario.plans[0];
  const semesterIndex = semester === 1 ? 0 : 1;
  const blocks = plan.blocks[semester];
  const credits = plan.courses.reduce((total, course) => total + course.credits, 0);

  function chooseScenario(nextIndex: number) {
    if (nextIndex === scenarioIndex || pending) return;
    const next = scenarios[nextIndex];
    if (!next) return;
    if (timer.current) clearTimeout(timer.current);

    const apply = () => {
      setScenarioIndex(nextIndex);
      setPlanIndex(0);
      setSemester(1);
      setSelectedCourse(next.plans[0]?.courses[0]?.code ?? "");
      setPending(false);
    };
    const duration = preferredMotionDuration();
    if (duration === 0) {
      apply();
      return;
    }
    setPending(true);
    timer.current = setTimeout(apply, duration);
  }

  function choosePlan(nextIndex: number, nextPlan: PreviewPlan) {
    setPlanIndex(nextIndex);
    setSelectedCourse(nextPlan.courses[0]?.code ?? "");
  }

  function onPlanKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tabIndexForKey(event, planIndex, scenario.plans.length);
    if (next === null) return;
    event.preventDefault();
    const nextPlan = scenario.plans[next];
    choosePlan(next, nextPlan);
    event.currentTarget
      .querySelectorAll<HTMLElement>("[role='tab']")
      .item(next)
      ?.focus();
  }

  return (
    <section
      aria-label={shared.demoLabel}
      aria-busy={pending}
      className={styles.planner}
    >
      <div className={styles.plannerTop}>
        <div className={styles.plannerIdentity}>
          <span aria-hidden className={styles.plannerMiniMark} />
          <span className={styles.plannerYear}>{shared.yearLabel}</span>
        </div>
        <span className={styles.demoTag}>{shared.demoLabel}</span>
      </div>

      {showScenarios && (
        <div className={styles.scenarioTabs} aria-label={shared.weekRequestLabel}>
          {scenarios.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={index === scenarioIndex}
              title={item.prompt}
              className={`${styles.scenarioButton} ${
                index === scenarioIndex ? styles.scenarioButtonActive : ""
              }`}
              onClick={() => chooseScenario(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.plannerBody}>
        <div className={styles.chipRow}>
          {scenario.chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
            </span>
          ))}
        </div>

        <div className={styles.plannerMain}>
          <div
            id={planPanelId}
            role="tabpanel"
            aria-label={`${plan.label} ${shared.courseListLabel}`}
            className={styles.planPanel}
          >
            <div
              role="tablist"
              aria-label={shared.planListLabel}
              className={styles.planTabs}
              onKeyDown={onPlanKeyDown}
            >
              {scenario.plans.map((item, index) => (
                <button
                  key={item.label}
                  role="tab"
                  type="button"
                  aria-selected={index === planIndex}
                  aria-controls={planPanelId}
                  tabIndex={index === planIndex ? 0 : -1}
                  className={`${styles.planTab} ${
                    index === planIndex ? styles.planTabActive : ""
                  }`}
                  onClick={() => choosePlan(index, item)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className={styles.panelHeading}>
              {shared.courseListLabel} · {plan.courses.length} · {credits}{" "}
              {shared.creditsShort}
            </p>
            <ul className={styles.courseList} aria-label={shared.courseListLabel}>
              {plan.courses.map((course) => (
                <li key={course.code}>
                  <button
                    type="button"
                    aria-pressed={course.code === selectedCourse}
                    className={`${styles.courseButton} ${
                      course.code === selectedCourse ? styles.courseButtonActive : ""
                    }`}
                    onClick={() => setSelectedCourse(course.code)}
                  >
                    <span aria-hidden className={styles.courseCode} />
                    <span className={styles.courseName}>{course.title}</span>
                    <span className={styles.courseCredits}>{course.credits}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.planNote}>{scenario.note}</p>
          </div>

          <div
            id={timetablePanelId}
            role="tabpanel"
            aria-label={shared.semesterNames[semesterIndex]}
            className={styles.timetablePanel}
          >
            <div className={styles.timetableHeader}>
              <p className={styles.panelHeading} style={{ margin: 0 }}>
                {shared.timetableLabel}
              </p>
              <div
                role="tablist"
                aria-label={shared.semesterLabel}
                className={styles.semesterTabs}
                onKeyDown={(event) => {
                  const nextSemester = tabIndexForKey(event, semesterIndex, 2);
                  if (nextSemester === null) return;
                  event.preventDefault();
                  setSemester(nextSemester === 0 ? 1 : 2);
                  event.currentTarget
                    .querySelectorAll<HTMLElement>("[role='tab']")
                    .item(nextSemester)
                    ?.focus();
                }}
              >
                {shared.semesterNames.map((name, index) => {
                  const value = index === 0 ? 1 : 2;
                  return (
                    <button
                      key={name}
                      role="tab"
                      type="button"
                      aria-selected={semester === value}
                      aria-controls={timetablePanelId}
                      tabIndex={semester === value ? 0 : -1}
                      className={`${styles.semesterButton} ${
                        semester === value ? styles.semesterButtonActive : ""
                      }`}
                      onClick={() => setSemester(value)}
                    >
                      {shared.semesterShortNames[index]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.calendar}>
              <div />
              <div className={styles.dayLabels}>
                {shared.days.map((day) => (
                  <span key={day} className={styles.dayLabel}>
                    {day}
                  </span>
                ))}
              </div>
              <div className={styles.timeLabels} aria-hidden>
                {[480, 600, 720, 840, 960, 1080].map((minutes) => (
                  <span
                    key={minutes}
                    className={styles.timeLabel}
                    style={timeLabelStyle(minutes)}
                  >
                    {minutes / 60}
                  </span>
                ))}
              </div>
              <div className={styles.gridCanvas}>
                {blocks.map((block, index) => {
                  const selected = block.code === selectedCourse;
                  return (
                    <span
                      key={`${block.code}-${block.day}-${block.start}-${index}`}
                      className={`${styles.block} ${
                        selected ? styles.blockSelected : styles.blockDimmed
                      }`}
                      style={blockStyle(block)}
                      title={`${block.code} ${shared.semesterNames[semesterIndex]}`}
                    >
                      {block.code.slice(4)}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className={styles.liveStatus} role="status" aria-live="polite">
              {pending ? shared.loadingLabel : shared.readyLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
