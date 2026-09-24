import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "合境 · 三维空间组合 — After Now Lab",
  description: "从参考图和空间构件出发，组合一个可探索的三维展览空间。",
};

export default function HejingPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="工具导航">
        <Link href="/#lab">← After Now Lab</Link>
        <span>HEJING / 3D SPACE COMPOSER</span>
      </nav>
      <iframe
        className={styles.frame}
        src="/hejing/index.html"
        title="合境三维空间组合工具"
        allow="fullscreen"
      />
    </main>
  );
}
