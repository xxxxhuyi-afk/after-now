"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./editor.module.css";

const configuredOrigin = process.env.NEXT_PUBLIC_PHOTOCRAFT_ORIGIN?.replace(/\/$/, "");
const editorUrl = configuredOrigin ? `${configuredOrigin}/` : "/photocraft/index.html";

export default function Editor() {
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setStatus((current) => (current === "loading" ? "unavailable" : current));
    }, 60_000);
    return () => window.clearTimeout(timeout);
  }, []);

  const label =
    status === "ready"
      ? "编辑器已装载"
      : status === "loading"
        ? "正在装载编辑器…"
        : "编辑器尚未配置";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>AFTER NOW</Link>
        <div className={styles.title}>
          <span>PHOTOCRAFT</span>
          <span>图像编辑器</span>
        </div>
        <div className={styles.status} aria-live="polite">
          <i className={status === "ready" ? styles.ready : ""} />
          {label}
        </div>
      </header>

      <iframe
        className={styles.frame}
        src={editorUrl}
        title="PhotoCraft image editor"
        allow="fullscreen; clipboard-read; clipboard-write"
        onLoad={() => setStatus("ready")}
      />
    </main>
  );
}
