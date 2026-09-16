"use client";

import { useEffect, useRef } from "react";
import styles from "./halo-hero.module.css";

export default function HaloHero() {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reserveRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const title = titleRef.current;
    const reserve = reserveRef.current;
    if (!hero || !title || !reserve) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let titleMinScale = 1;
    let frame = 0;

    const update = () => {
      frame = 0;
      const range = Math.max(1, hero.offsetHeight - window.innerHeight);
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - hero.offsetTop) / range),
      );
      const titleScale = 1 - (1 - titleMinScale) * progress;

      hero.style.setProperty("--halo-progress", progress.toFixed(4));
      hero.style.setProperty("--halo-title-scale", titleScale.toFixed(4));
      hero.style.setProperty(
        "--halo-image-scale",
        (1 + progress * 0.035).toFixed(4),
      );
      hero.style.setProperty(
        "--halo-image-y",
        `${(-progress * 0.8).toFixed(3)}%`,
      );
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const measure = () => {
      const titleHeight = title.offsetHeight;
      titleMinScale = titleHeight > 0
        ? Math.min(1, reserve.offsetHeight / titleHeight)
        : 1;
      requestUpdate();
    };

    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);

    if (!reduceMotion.matches) {
      window.addEventListener("scroll", requestUpdate, { passive: true });
    }
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      className={styles.hero}
      id="top"
      ref={heroRef}
      aria-labelledby="halo-title"
    >
      <div className={styles.sticky}>
        <div className={styles.stage} aria-hidden="true">
          <div className={styles.portrait} />
        </div>

        <div className={styles.overlay}>
          <div className={styles.overlayTop}>
            <h1 className={styles.title} id="halo-title" ref={titleRef}>
              After Now
            </h1>
            <a className={styles.reserve} href="#reading-room" ref={reserveRef}>
              Enter archive
            </a>
          </div>

          <div className={styles.overlayBottom}>
            <p className={styles.note}>
              Scroll to enter<br />
              <span>the archive.</span>
            </p>
            <ul className={styles.specs}>
              <li>Independent practice</li>
              <li>Shanghai · 2026</li>
            </ul>
            <div className={styles.about}>
              <p className={styles.aboutLabel}>此刻之后 / About</p>
              <p className={styles.aboutText}>
                未来不是抵达的地方，而是此刻正在生成的东西。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
