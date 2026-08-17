"use client";

import { useEffect } from "react";

export default function Experience() {
  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    root.dataset.motion = prefersReducedMotion ? "reduced" : "ready";

    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const typeElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-type]"),
    );
    const typingTimers: number[] = [];
    let initialRevealFrame = 0;
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
      initialRevealFrame = window.requestAnimationFrame(() => {
        revealElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
            element.setAttribute("data-visible", "true");
            observer?.unobserve(element);
          }
        });
      });

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

    const updatePointer = (event: PointerEvent) => {
      const normalizedX = event.clientX / window.innerWidth - 0.5;
      const normalizedY = event.clientY / window.innerHeight - 0.5;
      const x = normalizedX * 30;
      const y = normalizedY * 30;
      root.style.setProperty("--pointer-x", `${x.toFixed(2)}px`);
      root.style.setProperty("--pointer-y", `${y.toFixed(2)}px`);
      root.style.setProperty("--pointer-lab-x", `${(-x * 0.25).toFixed(2)}px`);
      root.style.setProperty("--pointer-lab-y", `${(-y * 0.25).toFixed(2)}px`);
      root.style.setProperty("--cat-image-x", `${(-normalizedX * 5).toFixed(2)}px`);
      root.style.setProperty("--cat-image-y", `${(-normalizedY * 3).toFixed(2)}px`);
      root.style.setProperty("--cat-image-rotate", `${(normalizedX * 0.8).toFixed(2)}deg`);
      root.style.setProperty("--cat-head-x", `${(normalizedX * 7).toFixed(2)}px`);
      root.style.setProperty("--cat-head-y", `${(normalizedY * 4).toFixed(2)}px`);
      root.style.setProperty("--cat-head-rotate", `${(normalizedX * 1.35).toFixed(2)}deg`);
      root.dataset.cat = "tracking";
    };

    const updateScrollState = () => {
      const heroProgress = Math.min(window.scrollY / (window.innerHeight * 0.82), 1);
      root.dataset.scrolled = window.scrollY > 24 ? "true" : "false";
      root.style.setProperty(
        "--scroll-shift",
        `${Math.min(window.scrollY * 0.035, 48).toFixed(2)}px`,
      );
      root.style.setProperty("--hero-title-scale", (1 - heroProgress * 0.08).toFixed(4));
      root.style.setProperty("--hero-media-scale", (1.015 + heroProgress * 0.045).toFixed(4));
      root.style.setProperty("--hero-fade", (1 - heroProgress * 0.72).toFixed(4));
    };

    if (!prefersReducedMotion) {
      window.addEventListener("pointermove", updatePointer, { passive: true });
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    return () => {
      observer?.disconnect();
      typeObserver?.disconnect();
      typingTimers.forEach((timer) => window.clearTimeout(timer));
      window.cancelAnimationFrame(initialRevealFrame);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      delete root.dataset.motion;
      delete root.dataset.scrolled;
      delete root.dataset.cat;
      root.style.removeProperty("--pointer-x");
      root.style.removeProperty("--pointer-y");
      root.style.removeProperty("--pointer-lab-x");
      root.style.removeProperty("--pointer-lab-y");
      root.style.removeProperty("--cat-image-x");
      root.style.removeProperty("--cat-image-y");
      root.style.removeProperty("--cat-image-rotate");
      root.style.removeProperty("--scroll-shift");
      root.style.removeProperty("--hero-title-scale");
      root.style.removeProperty("--hero-media-scale");
      root.style.removeProperty("--hero-fade");
    };
  }, []);

  return null;
}
