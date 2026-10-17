"use client";

import { useState } from "react";
import type { LandingContent } from "@/lib/landing-content";
import { styles } from "./styles";

interface DescribePreviewProps {
  content: LandingContent["preview"]["describe"];
  shared: LandingContent["preview"]["shared"];
  brand: string;
}

export function DescribePreview({ content, shared, brand }: DescribePreviewProps) {
  const [selected, setSelected] = useState(0);
  const example = content.examples[selected] ?? content.examples[0];

  return (
    <div className={styles.describeScreen}>
      <div className={styles.phoneHeader}>
        <div className={styles.phoneBrand}>
          <span aria-hidden className={styles.plannerMiniMark} />
          {brand}
        </div>
        <span className={styles.demoTag}>{shared.simulatedLabel}</span>
      </div>

      <div className={styles.phoneBody}>
        <div>
          <h3 className={styles.phoneHeading}>{content.heading}</h3>
          <p className={styles.phoneIntro}>{content.intro}</p>
        </div>

        <div className={styles.promptBubble}>{example.prompt}</div>

        <div>
          <p className={styles.smallLabel}>{shared.exampleHeading}</p>
          <div className={styles.exampleList}>
            {content.examples.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={selected === index}
                className={`${styles.exampleButton} ${
                  selected === index ? styles.exampleButtonActive : ""
                }`}
                onClick={() => setSelected(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={styles.smallLabel}>{shared.appliedHeading}</p>
          <div className={styles.chipStack} aria-live="polite">
            {example.chips.map((chip) => (
              <span key={chip} className={styles.phoneChip}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        <p className={styles.phoneFooterLine}>{shared.readyLabel}</p>
      </div>
    </div>
  );
}
