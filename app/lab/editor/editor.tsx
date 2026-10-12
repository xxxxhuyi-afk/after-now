"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./editor.module.css";

const editorOrigin = process.env.NEXT_PUBLIC_PHOTOCRAFT_ORIGIN?.replace(/\/$/, "");
const editorUrl = editorOrigin ? `${editorOrigin}/` : null;

export default function Editor() {
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    editorUrl ? "loading" : "unavailable",
  );

  useEffect(() => {
    if (!editorUrl) return;
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

      {editorUrl ? (
        <iframe
          className={styles.frame}
          src={editorUrl}
          title="PhotoCraft image editor"
          allow="fullscreen; clipboard-read; clipboard-write"
          onLoad={() => setStatus("ready")}
        />
      ) : (
        <section className={styles.setup}>
          <p className={styles.eyebrow}>EDITOR / E1</p>
          <h1>编辑器静态包尚未连接。</h1>
          <p>
            请将 PhotoCraft 的 WASM 静态包部署到一个独立域名，然后在部署平台设置
            <code>NEXT_PUBLIC_PHOTOCRAFT_ORIGIN</code> 为该地址，并重新部署本站。
          </p>
          <p className={styles.note}>
            当前版本支持在站内使用真实 PhotoCraft 编辑器；生成图片需要先下载或拖入编辑器。
          </p>
        </section>
      )}
    </main>
  );
}
