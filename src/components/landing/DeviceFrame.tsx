import type { ReactNode } from "react";
import { styles } from "./styles";

interface DeviceFrameProps {
  variant: "laptop" | "phone";
  label: string;
  title?: string;
  children: ReactNode;
}

export function DeviceFrame({ variant, label, title, children }: DeviceFrameProps) {
  if (variant === "phone") {
    return (
      <figure className={`${styles.device} ${styles.phone}`}>
        <div className={styles.phoneScreen}>
          <span aria-hidden className={styles.phoneNotch} />
          {children}
        </div>
        <figcaption className={styles.phoneLabel}>{label}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={`${styles.device} ${styles.laptop}`}>
      <div className={styles.laptopShell}>
        <div className={styles.laptopScreen}>
          <div className={styles.browserBar} aria-hidden>
            <span className={styles.browserDot} />
            <span className={styles.browserDot} />
            <span className={styles.browserDot} />
            <span className={styles.browserTitle}>{title ?? "Aperture"}</span>
          </div>
          {children}
        </div>
      </div>
      <div aria-hidden className={styles.laptopBase} />
      <figcaption className={styles.laptopLabel}>{label}</figcaption>
    </figure>
  );
}
