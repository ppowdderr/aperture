import type { LandingContent } from "@/lib/landing-content";
import { styles } from "./styles";

interface RulesPreviewProps {
  content: LandingContent["preview"]["rules"];
  shared: LandingContent["preview"]["shared"];
}

export function RulesPreview({ content, shared }: RulesPreviewProps) {
  return (
    <div className={styles.rulesScreen}>
      <div className={styles.rulesTop}>
        <div>
          <h3 className={styles.rulesTitle}>{content.heading}</h3>
          <p className={styles.rulesIntro}>{content.intro}</p>
        </div>
        <span className={styles.demoTag}>{shared.demoLabel}</span>
      </div>

      <div className={styles.ruleList}>
        {content.items.map((rule, index) => (
          <details key={rule.title} className={styles.rule} open={index === 0}>
            <summary className={styles.ruleSummary}>
              <span aria-hidden className={styles.ruleCheck}>
                ✓
              </span>
              <span className={styles.ruleCopy}>
                <span className={styles.ruleTitle}>{rule.title}</span>
                <span className={styles.ruleSummaryText}>{rule.summary}</span>
              </span>
            </summary>
            <div className={styles.ruleSource}>
              <span className={styles.sourceBadge}>{shared.ruleSourceLabel}</span>
              <p className={styles.sourceText}>{rule.source}</p>
              <a
                href={rule.href}
                target="_blank"
                rel="noreferrer"
                className={styles.sourceLink}
              >
                {shared.openSourceLabel}
              </a>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
