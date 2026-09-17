import Link from "next/link";
import styles from "./printing-roll.module.css";

export default function PrintingRoll() {
  return <main className={styles.experiment}>
    <header className={styles.header}>
      <Link href="/#lab" className={styles.back}>← 返回 Lab</Link>
      <div><p>L—01 / AFTER NOW LAB</p><h1>Paper Playground / 纸卷游乐场</h1></div>
      <span className={styles.credit}>纸卷打印实验 · @thebuggeddev</span>
    </header>
    <iframe className={styles.frame} src="/experiments/printing-roll.html" title="可交互的三维纸卷打印实验" sandbox="allow-scripts" />
    <footer className={styles.toolbar}>移动鼠标或拖动引导方向 · 点击画面暂停 / 继续</footer>
  </main>;
}
