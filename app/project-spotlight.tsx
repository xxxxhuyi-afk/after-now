"use client";

import { useEffect, useRef } from "react";
import styles from "./project-spotlight.module.css";

const BASE_IMAGE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";

const REVEAL_IMAGE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

type Point = { x: number; y: number };

export default function ProjectSpotlight() {
  const stageRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const raw = useRef<Point>({ x: -999, y: -999 });
  const smooth = useRef<Point>({ x: -999, y: -999 });
  const active = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    const reveal = revealRef.current;
    const cursor = cursorRef.current;
    if (!stage || !reveal || !cursor) return;

    let frame = 0;

    const setPointer = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      raw.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      if (!active.current) {
        smooth.current = raw.current;
        active.current = true;
        stage.dataset.active = "true";
      }
    };

    const leave = () => {
      active.current = false;
      stage.dataset.active = "false";
    };

    const animate = () => {
      smooth.current.x += (raw.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (raw.current.y - smooth.current.y) * 0.1;

      const radius = Math.min(260, Math.max(150, stage.clientWidth * 0.21));
      const x = smooth.current.x.toFixed(2);
      const y = smooth.current.y.toFixed(2);
      const mask = `radial-gradient(circle ${radius}px at ${x}px ${y}px, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,.75) 60%, rgba(255,255,255,.4) 75%, rgba(255,255,255,.12) 88%, rgba(255,255,255,0) 100%)`;

      reveal.style.maskImage = mask;
      reveal.style.webkitMaskImage = mask;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = window.requestAnimationFrame(animate);
    };

    stage.addEventListener("pointerenter", setPointer);
    stage.addEventListener("pointermove", setPointer);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("pointercancel", leave);
    frame = window.requestAnimationFrame(animate);

    return () => {
      stage.removeEventListener("pointerenter", setPointer);
      stage.removeEventListener("pointermove", setPointer);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("pointercancel", leave);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={styles.stage}
      data-active="false"
      ref={stageRef}
      aria-label="Move your pointer across the image to reveal the geological layer beneath"
    >
      <div
        className={`${styles.image} ${styles.baseImage}`}
        style={{ backgroundImage: `url(${BASE_IMAGE})` }}
      />
      <div
        className={`${styles.image} ${styles.revealImage}`}
        ref={revealRef}
        style={{ backgroundImage: `url(${REVEAL_IMAGE})` }}
      />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.eyebrow}>
        <span>01 / 地层记忆</span>
        <span>移动鼠标探索</span>
      </div>

      <p className={styles.leftCopy}>
        每一层地貌都保存着时间留下的痕迹，等待被光重新看见。
      </p>

      <div className={styles.cursor} ref={cursorRef} aria-hidden="true">
        <i />
        <span>探索</span>
      </div>
    </div>
  );
}
