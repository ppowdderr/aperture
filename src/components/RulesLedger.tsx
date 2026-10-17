import type { Rule } from "../lib/types";

const kindOrder: Rule["kind"][] = [
  "compulsory",
  "creditRange",
  "prerequisite",
  "mustPassBefore",
  "conditional",
];

const kindLabels: Record<Rule["kind"], string> = {
  compulsory: "Compulsory courses",
  creditRange: "Credit ranges",
  prerequisite: "Prerequisites",
  mustPassBefore: "Progression",
  conditional: "Conditional rules",
};

export function formatRule(rule: Rule): string {
  switch (rule.kind) {
    case "compulsory":
      return `You must take ${rule.course}.`;
    case "creditRange":
      if (rule.min === rule.max) {
        return `Choose exactly ${rule.min} credits from Group ${rule.group}.`;
      }
      if (rule.max >= 9999) {
        return `Choose at least ${rule.min} credits from Group ${rule.group}.`;
      }
      return `Choose between ${rule.min} and ${rule.max} credits from Group ${rule.group}.`;
    case "prerequisite":
      return `${rule.course} requires ${rule.requires.join(", ")}.`;
    case "mustPassBefore":
      return `Pass ${rule.course} before Year ${rule.year}.`;
    case "conditional":
      return `Take ${rule.course} only when: ${rule.condition}.`;
  }
}

export interface RulesLedgerProps {
  rules: Rule[];
}

export function RulesLedger({ rules }: RulesLedgerProps) {
  if (rules.length === 0) {
    return (
      <p className="text-fg-faint">
        No rules recorded for this solution.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-fg-faint">
        {rules.length} {rules.length === 1 ? "rule" : "rules"} enforced by this
        solution. Hover a line to read the exact DRPS sentence.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {kindOrder.map((kind) => {
          const group = rules.filter((rule) => rule.kind === kind);
          if (group.length === 0) return null;

          return (
            <section key={kind} className="min-w-0">
              <h3 className="mb-1 text-[12px] font-medium text-fg-muted">
                {kindLabels[kind]}{" "}
                <span className="font-mono text-fg-faint">({group.length})</span>
              </h3>
              <ul className="divide-y divide-line rounded-md border border-line bg-panel-2">
                {group.map((rule, index) => (
                  <li
                    key={`${rule.kind}-${index}`}
                    className="flex items-start gap-3 px-3 py-2"
                  >
                    <span
                      title={rule.source}
                      aria-label={`DRPS source: ${rule.source}`}
                      className="min-w-0 flex-1 cursor-help text-[13px]"
                    >
                      {formatRule(rule)}
                    </span>
                    <a
                      href={rule.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[11px] text-accent hover:underline"
                    >
                      DRPS source ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
