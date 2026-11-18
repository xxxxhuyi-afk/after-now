"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { updates } from "./updates";
import styles from "./today-strip.module.css";

const MAX_ITEMS = 3;
const ROTATE_MS = 4500;

export default function TodayStrip() {
  const items = updates.slice(0, MAX_ITEMS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [items.length, paused]);

  if (items.length === 0) return null;

  const current = items[Math.min(index, items.length - 1)];

  return (
    <div
      className={styles.strip}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="最新更新"
    >
      <span className={styles.label}>
        <i className={styles.dot} aria-hidden="true" />
        今日更新
        <time className={styles.date} dateTime={current.date}>
          {current.date}
        </time>
      </span>
      <span className={styles.tag}>{current.tag}</span>
      <Link key={current.date + current.title} className={styles.title} href={current.href}>
        {current.title}
      </Link>
      <Link className={styles.more} href={current.href} aria-label={`查看：${current.title}`}>
        查看 <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
