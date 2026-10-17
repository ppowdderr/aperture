"use client";

import { useState } from "react";
import { z } from "zod";
import { ruleSchema } from "@/lib/schemas";
import type { ProgrammeYear, Rule, StudentState } from "@/lib/types";

const responseSchema = z.object({ rules: z.array(ruleSchema) }).strict();

export interface RuleConfirmProps {
  programmeCode: string;
  year: ProgrammeYear["year"];
  student: StudentState;
  onConfirm?: (rules: Rule[]) => void;
}

function label(rule: Rule): string {
  switch (rule.kind) {
    case "mustPassBefore":
      return `${rule.course} before Year ${rule.year}`;
    case "conditional":
      return `Take ${rule.course} when the condition applies`;
    case "prerequisite":
      return `${rule.course} requires ${rule.requires.join(", ")}`;
    default:
      return "Degree rule";
  }
}

function updateRule(rule: Rule, patch: Record<string, unknown>): Rule {
  return { ...rule, ...patch } as Rule;
}

export function RuleConfirm({
  programmeCode,
  year,
  student,
  onConfirm,
}: RuleConfirmProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function extract(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/rules/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ programmeCode, year }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Could not read the programme notes.";
        setMessage(detail);
        return;
      }

      const parsed = responseSchema.safeParse(body);
      if (!parsed.success) {
        setMessage("The rule extractor returned an unsupported response.");
        return;
      }
      setRules(parsed.data.rules);
      setAccepted(new Set(parsed.data.rules.map((_, index) => index)));
      setMessage(
        parsed.data.rules.length === 0
          ? "No additional rules were found in these notes."
          : `Found ${parsed.data.rules.length} ${parsed.data.rules.length === 1 ? "rule" : "rules"}. Review the source before applying them.`,
      );
    } catch {
      setMessage("Could not reach the rule extractor. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  function change(index: number, rule: Rule): void {
    setRules((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? rule : item)),
    );
  }

  function confirm(): void {
    const selected = rules.filter((_, index) => accepted.has(index));
    const parsed = ruleSchema.array().safeParse(selected);
    if (!parsed.success) {
      setMessage("Check the edited fields before applying these rules.");
      return;
    }
    const unmet = parsed.data.find(
      (rule) =>
        rule.kind === "mustPassBefore" &&
        student.year >= rule.year &&
        !student.passed.includes(rule.course),
    );
    if (unmet && unmet.kind === "mustPassBefore") {
      setMessage(
        `Mark ${unmet.course} as passed in your degree before applying this rule.`,
      );
      return;
    }
    onConfirm?.(parsed.data);
    setMessage(
      `${parsed.data.length} ${parsed.data.length === 1 ? "rule" : "rules"} applied. Rejected rules were not saved.`,
    );
  }

  return (
    <section className="rounded-md border border-line bg-panel-2 p-4" aria-labelledby="rule-extract-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="rule-extract-title" className="text-[15px] font-medium text-fg">
            Rules hidden in the notes
          </h2>
          <p className="mt-1 text-[13px] text-fg-faint">
            Extract requirements with their source sentence. Nothing is applied until you confirm it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void extract()}
          disabled={busy}
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-[14px] text-fg-muted hover:text-fg disabled:opacity-50"
        >
          {busy ? "Reading notes…" : "Read rules from notes"}
        </button>
      </div>

      <span role="status" aria-live="polite" className="mt-2 block min-h-4 text-[12px] text-fg-faint">
        {message}
      </span>

      {rules.length > 0 && (
        <div className="mt-3 space-y-3">
          {rules.map((rule, index) => (
            <article key={`${label(rule)}-${index}`} className="rounded-md border border-line p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={label(rule)}
                  checked={accepted.has(index)}
                  onChange={(event) => {
                    const next = new Set(accepted);
                    if (event.target.checked) next.add(index);
                    else next.delete(index);
                    setAccepted(next);
                  }}
                  className="mt-1 accent-[var(--color-accent)]"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="text-[14px] text-fg">{label(rule)}</div>
                  {rule.kind === "mustPassBefore" && (
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                      <label className="flex flex-col gap-1 text-[12px] text-fg-faint">
                        Course
                        <input
                          value={rule.course}
                          onChange={(event) =>
                            change(index, updateRule(rule, { course: event.target.value.toUpperCase() }))
                          }
                          className="h-8 rounded-md border border-line bg-panel px-2 font-mono text-[13px] text-fg"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] text-fg-faint">
                        Before year
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={rule.year}
                          onChange={(event) =>
                            change(index, updateRule(rule, { year: Number(event.target.value) }))
                          }
                          className="h-8 rounded-md border border-line bg-panel px-2 text-[13px] text-fg"
                        />
                      </label>
                    </div>
                  )}
                  {rule.kind === "conditional" && (
                    <div className="space-y-2">
                      <label className="flex flex-col gap-1 text-[12px] text-fg-faint">
                        Course
                        <input
                          value={rule.course}
                          onChange={(event) =>
                            change(index, updateRule(rule, { course: event.target.value.toUpperCase() }))
                          }
                          className="h-8 rounded-md border border-line bg-panel px-2 font-mono text-[13px] text-fg"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] text-fg-faint">
                        Condition for {rule.course}
                        <textarea
                          rows={2}
                          value={rule.condition}
                          onChange={(event) =>
                            change(index, updateRule(rule, { condition: event.target.value }))
                          }
                          className="resize-y rounded-md border border-line bg-panel px-2 py-1 text-[13px] text-fg"
                        />
                      </label>
                    </div>
                  )}
                  {rule.kind === "prerequisite" && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-[12px] text-fg-faint">
                        Course
                        <input
                          value={rule.course}
                          onChange={(event) =>
                            change(index, updateRule(rule, { course: event.target.value.toUpperCase() }))
                          }
                          className="h-8 rounded-md border border-line bg-panel px-2 font-mono text-[13px] text-fg"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] text-fg-faint">
                        Requires
                        <input
                          value={rule.requires.join(", ")}
                          onChange={(event) =>
                            change(index, updateRule(rule, {
                              requires: event.target.value
                                .split(",")
                                .map((code) => code.trim().toUpperCase())
                                .filter(Boolean),
                            }))
                          }
                          className="h-8 rounded-md border border-line bg-panel px-2 font-mono text-[13px] text-fg"
                        />
                      </label>
                    </div>
                  )}
                  <blockquote className="border-l border-line pl-3 text-[12px] leading-relaxed text-fg-faint">
                    {rule.source}
                  </blockquote>
                </div>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-accent px-3 py-1.5 text-[14px] font-medium text-bg hover:brightness-110"
          >
            Confirm selected rules
          </button>
        </div>
      )}
    </section>
  );
}
