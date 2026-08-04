"use client";

import { useEffect, useRef } from "react";
import styles from "./experience.module.css";

const trackedSections = ["top", "manifesto", "works", "lab", "journal", "contact"];

export default function Experience() {
  const cursorDotRef = useRef<HTMLSpanElement>(null);
  const cursorRingRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const wandPathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const cursorDot = cursorDotRef.current;
    const cursorRing = cursorRingRef.current;
    const progress = progressRef.current;
    const chapter = chapterRef.current;

    root.dataset.motion = prefersReducedMotion ? "reduced" : "ready";
    if (hasFinePointer && !prefersReducedMotion) root.dataset.pointer = "fine";

    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const typeElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-type]"),
    );
    const typingTimers: number[] = [];
    let observer: IntersectionObserver | null = null;
    let typeObserver: IntersectionObserver | null = null;

    if (!prefersReducedMotion) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.setAttribute("data-visible", "true");
              observer?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
      );
      revealElements.forEach((element) => observer?.observe(element));

      typeElements.forEach((element) => {
        const fullText = element.dataset.type || element.textContent || "";
        element.dataset.fullText = fullText;
        element.textContent = "";
      });

      typeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            const fullText = element.dataset.fullText || "";
            element.dataset.typing = "true";
            Array.from(fullText).forEach((character, index) => {
              const timer = window.setTimeout(() => {
                element.textContent = fullText.slice(0, index + 1);
                if (index === Array.from(fullText).length - 1) {
                  element.dataset.typed = "true";
                }
              }, 160 + index * 46);
              typingTimers.push(timer);
            });
            typeObserver?.unobserve(element);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.25 },
      );
      typeElements.forEach((element) => typeObserver?.observe(element));
    }

    let pointerX = -100;
    let pointerY = -100;
    let ringX = -100;
    let ringY = -100;
    let ringScale = 1;
    let cursorFrame = 0;

    const renderCursor = () => {
      ringX += (pointerX - ringX) * 0.16;
      ringY += (pointerY - ringY) * 0.16;
      const targetScale = root.dataset.cursor === "active" ? 1.85 : 1;
      ringScale += (targetScale - ringScale) * 0.13;

      if (cursorDot) {
        cursorDot.style.transform = `translate3d(${pointerX - 7}px, ${pointerY - 8}px, 0)`;
      }
      if (cursorRing) {
        cursorRing.style.transform = `translate3d(${ringX - 27}px, ${ringY - 27}px, 0) scale(${ringScale})`;
      }
      cursorFrame = window.requestAnimationFrame(renderCursor);
    };

    const updatePointer = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      const normalizedX = event.clientX / window.innerWidth - 0.5;
      const normalizedY = event.clientY / window.innerHeight - 0.5;
      const x = normalizedX * 30;
      const y = normalizedY * 30;
      root.style.setProperty("--pointer-x", `${x.toFixed(2)}px`);
      root.style.setProperty("--pointer-y", `${y.toFixed(2)}px`);
      root.style.setProperty("--pointer-lab-x", `${(-x * 0.25).toFixed(2)}px`);
      root.style.setProperty("--pointer-lab-y", `${(-y * 0.25).toFixed(2)}px`);
      root.style.setProperty("--cat-image-x", `${(-normalizedX * 14).toFixed(2)}px`);
      root.style.setProperty("--cat-image-y", `${(-normalizedY * 8).toFixed(2)}px`);
      root.style.setProperty("--cat-image-rotate", `${(normalizedX * 0.8).toFixed(2)}deg`);
      root.dataset.cat = "tracking";
      const originX = window.innerWidth * 0.74;
      const controlX = originX + (event.clientX - originX) * 0.22;
      const controlY = Math.max(48, event.clientY * 0.44);
      wandPathRef.current?.setAttribute(
        "d",
        `M ${originX.toFixed(1)} -16 C ${originX.toFixed(1)} ${controlY.toFixed(1)} ${controlX.toFixed(1)} ${(event.clientY * 0.72).toFixed(1)} ${event.clientX.toFixed(1)} ${event.clientY.toFixed(1)}`,
      );
    };

    const updateScrollState = () => {
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = scrollRange > 0 ? window.scrollY / scrollRange : 0;
      root.dataset.scrolled = window.scrollY > 24 ? "true" : "false";
      root.style.setProperty(
        "--scroll-shift",
        `${Math.min(window.scrollY * 0.035, 48).toFixed(2)}px`,
      );
      if (progress) progress.style.transform = `scaleY(${scrollProgress})`;

      let activeChapter = 0;
      trackedSections.forEach((id, index) => {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top < window.innerHeight * 0.58) {
          activeChapter = index;
        }
      });
      if (chapter) {
        chapter.textContent = `${String(activeChapter + 1).padStart(2, "0")} / ${String(trackedSections.length).padStart(2, "0")}`;
      }
    };

    const interactiveElements = Array.from(
      document.querySelectorAll<HTMLElement>("a, article"),
    );
    const activateCursor = () => {
      root.dataset.cursor = "active";
    };
    const deactivateCursor = () => {
      root.dataset.cursor = "idle";
    };

    if (hasFinePointer && !prefersReducedMotion) {
      window.addEventListener("pointermove", updatePointer, { passive: true });
      interactiveElements.forEach((element) => {
        element.addEventListener("pointerenter", activateCursor);
        element.addEventListener("pointerleave", deactivateCursor);
      });
      cursorFrame = window.requestAnimationFrame(renderCursor);
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    return () => {
      observer?.disconnect();
      typeObserver?.disconnect();
      typingTimers.forEach((timer) => window.clearTimeout(timer));
      window.cancelAnimationFrame(cursorFrame);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      interactiveElements.forEach((element) => {
        element.removeEventListener("pointerenter", activateCursor);
        element.removeEventListener("pointerleave", deactivateCursor);
      });
      delete root.dataset.motion;
      delete root.dataset.scrolled;
      delete root.dataset.pointer;
      delete root.dataset.cursor;
      delete root.dataset.cat;
      root.style.removeProperty("--pointer-x");
      root.style.removeProperty("--pointer-y");
      root.style.removeProperty("--pointer-lab-x");
      root.style.removeProperty("--pointer-lab-y");
      root.style.removeProperty("--cat-image-x");
      root.style.removeProperty("--cat-image-y");
      root.style.removeProperty("--cat-image-rotate");
      root.style.removeProperty("--scroll-shift");
    };
  }, []);

  return (
    <>
      <span ref={cursorDotRef} className={styles.cursorDot} aria-hidden="true" />
      <span ref={cursorRingRef} className={styles.cursorRing} aria-hidden="true" />
      <svg className={styles.wandString} aria-hidden="true">
        <path ref={wandPathRef} d="M 1050 -16 C 1050 120 990 240 900 360" />
      </svg>
      <div className={styles.progress} aria-hidden="true">
        <span ref={chapterRef}>01 / 06</span>
        <i><b ref={progressRef} /></i>
      </div>
    </>
  );
}
