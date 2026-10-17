import Link from "next/link";
import { LANDING_CONTENT, type LandingLink } from "@/lib/landing-content";
import "./landing.css";
import { DescribePreview } from "./DescribePreview";
import { DeviceFrame } from "./DeviceFrame";
import { PlanPreview } from "./PlanPreview";
import { Reveal } from "./Reveal";
import { RulesPreview } from "./RulesPreview";
import { styles } from "./styles";

function LandingAnchor({
  link,
  className,
}: {
  link: LandingLink;
  className?: string;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function LandingPage() {
  const content = LANDING_CONTENT;
  const shared = content.preview.shared;

  return (
    <div className={styles.landing}>
      <a href="#main" className={styles.skipLink}>
        {content.accessibility.skipLink}
      </a>

      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link
            href="/"
            className={styles.brand}
            aria-label={content.brand.markLabel}
          >
            <span aria-hidden className={styles.mark} />
            <span>{content.brand.name}</span>
          </Link>

          <nav aria-label={content.accessibility.navLabel} className={styles.navLinks}>
            {content.nav.links.map((link) => (
              <a key={link.label} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className={styles.navActions}>
            <LandingAnchor
              link={content.nav.github}
              className={styles.githubLink}
            />
            <LandingAnchor
              link={content.nav.cta}
              className={`${styles.primaryButton} ${styles.navCta}`}
            />
          </div>

          <details className={styles.mobileNav}>
            <summary>{content.nav.mobileMenuLabel}</summary>
            <nav
              aria-label={content.accessibility.navLabel}
              className={styles.mobileLinks}
            >
              {content.nav.links.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
              <LandingAnchor link={content.nav.github} />
            </nav>
          </details>
        </div>
      </header>

      <main id="main" aria-label={content.accessibility.mainLabel} className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{content.hero.label}</p>
            <h1
              id="hero-title"
              className={styles.heroTitle}
              aria-label={content.hero.headline.join(" ")}
            >
              {content.hero.headline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className={styles.heroBody}>{content.hero.body}</p>
            <div className={styles.heroActions}>
              <LandingAnchor
                link={content.hero.primaryCta}
                className={styles.primaryButton}
              />
              <LandingAnchor
                link={content.hero.secondaryCta}
                className={styles.secondaryButton}
              />
            </div>
          </div>

          <div className={styles.heroVisual}>
            <span aria-hidden className={styles.iris} />
            <DeviceFrame
              variant="laptop"
              title={`${content.brand.name} · ${shared.yearLabel}`}
              label={shared.demoLabel}
            >
              <PlanPreview
                scenarios={content.preview.hero}
                shared={shared}
                initialScenarioId="friday-free"
              />
            </DeviceFrame>
          </div>
        </section>

        <Reveal>
          <section id="flip" className={styles.section} aria-labelledby="flip-title">
            <div className={styles.flipGrid}>
              <div className={styles.flipCopy}>
                <h2 id="flip-title" className={styles.sectionTitle}>
                  {content.flip.heading}
                </h2>
                <p className={styles.flipDetail}>{content.flip.detail}</p>
              </div>

              <div className={styles.flipStatements}>
                <article className={styles.flipStatement}>
                  <span className={styles.flipLabel}>{content.flip.oldLabel}</span>
                  <p className={`${styles.flipText} ${styles.flipOldText}`}>
                    {content.flip.oldText}
                  </p>
                </article>
                <article
                  className={`${styles.flipStatement} ${styles.flipStatementNew}`}
                >
                  <span className={styles.flipLabel}>{content.flip.newLabel}</span>
                  <p className={`${styles.flipText} ${styles.flipNewText}`}>
                    {content.flip.newText}
                  </p>
                </article>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="how" className={styles.section} aria-labelledby="how-title">
            <div className={styles.sectionHeader}>
              <h2 id="how-title" className={styles.sectionTitle}>
                {content.how.heading}
              </h2>
              <p className={styles.sectionIntro}>{content.how.intro}</p>
            </div>

            <div className={styles.steps}>
              <article className={styles.step}>
                <div className={styles.stepCopy}>
                  <h3 className={styles.stepTitle}>{content.how.steps[0].title}</h3>
                  <p className={styles.stepBody}>{content.how.steps[0].body}</p>
                  <span className={styles.stepDemo}>
                    {content.how.steps[0].demoLabel}
                  </span>
                </div>
                <div className={styles.stepVisual}>
                  <DeviceFrame variant="phone" label={shared.simulatedLabel}>
                    <DescribePreview
                      content={content.preview.describe}
                      shared={shared}
                      brand={content.brand.name}
                    />
                  </DeviceFrame>
                </div>
              </article>

              <article className={`${styles.step} ${styles.stepReverse}`}>
                <div className={styles.stepCopy}>
                  <h3 className={styles.stepTitle}>{content.how.steps[1].title}</h3>
                  <p className={styles.stepBody}>{content.how.steps[1].body}</p>
                  <span className={styles.stepDemo}>
                    {content.how.steps[1].demoLabel}
                  </span>
                </div>
                <div className={styles.stepVisual}>
                  <DeviceFrame
                    variant="laptop"
                    title={content.preview.rules.heading}
                    label={shared.demoLabel}
                  >
                    <RulesPreview
                      content={content.preview.rules}
                      shared={shared}
                    />
                  </DeviceFrame>
                </div>
              </article>

              <article className={`${styles.step} ${styles.stepWide}`}>
                <div className={styles.stepCopy}>
                  <h3 className={styles.stepTitle}>{content.how.steps[2].title}</h3>
                  <p className={styles.stepBody}>{content.how.steps[2].body}</p>
                  <span className={styles.stepDemo}>
                    {content.how.steps[2].demoLabel}
                  </span>
                </div>
                <div className={styles.stepVisual}>
                  <DeviceFrame
                    variant="laptop"
                    title={`${content.brand.name} · ${shared.planListLabel}`}
                    label={shared.demoLabel}
                  >
                    <PlanPreview
                      scenarios={content.preview.hero}
                      shared={shared}
                      initialScenarioId="campus-days"
                      showScenarios={false}
                    />
                  </DeviceFrame>
                </div>
              </article>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className={styles.section} aria-labelledby="stats-title">
            <div className={styles.sectionHeader}>
              <h2 id="stats-title" className={styles.sectionTitle}>
                {content.stats.heading}
              </h2>
              <p className={styles.sectionIntro}>{content.stats.intro}</p>
            </div>
            <div className={styles.statsGrid}>
              {content.stats.items.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <span className={styles.statSource}>{stat.source}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="stack" className={styles.section} aria-labelledby="stack-title">
            <div className={styles.sectionHeader}>
              <h2 id="stack-title" className={styles.sectionTitle}>
                {content.stack.heading}
              </h2>
              <p className={styles.sectionIntro}>{content.stack.intro}</p>
            </div>
            <div className={styles.stackGrid}>
              {content.stack.items.map((item) => (
                <article key={item.name} className={styles.stackItem}>
                  <span className={styles.stackTag}>{item.tag}</span>
                  <h3 className={styles.stackName}>{item.name}</h3>
                  <p className={styles.stackWhy}>{item.why}</p>
                </article>
              ))}
            </div>
            <p className={styles.aiNote}>{content.stack.aiNote}</p>
          </section>
        </Reveal>

        <Reveal>
          <section id="limits" className={styles.section} aria-labelledby="limits-title">
            <div className={styles.sectionHeader}>
              <h2 id="limits-title" className={styles.sectionTitle}>
                {content.limits.heading}
              </h2>
              <p className={styles.sectionIntro}>{content.limits.intro}</p>
            </div>
            <div className={styles.limitsGrid}>
              {content.limits.items.map((item) => (
                <article key={item.title} className={styles.limitItem}>
                  <h3 className={styles.limitTitle}>{item.title}</h3>
                  <p className={styles.limitText}>{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.main} ${styles.footerInner}`}>
          <div>
            <p className={styles.footerStatement}>{content.footer.statement}</p>
            <p className={styles.footerDetail}>{content.footer.detail}</p>
          </div>
          <nav aria-label={content.footer.linksLabel} className={styles.footerLinks}>
            {content.footer.links.map((link) => (
              <LandingAnchor
                key={link.label}
                link={link}
                className={styles.footerLink}
              />
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
