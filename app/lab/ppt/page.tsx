import styles from "./page.module.css";

export default function PptLabPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/#lab">← AFTER NOW LAB</a>
        <span>PPT OPTIMIZER / 001</span>
      </header>
      <section className={styles.frameWrap}>
        <iframe className={styles.frame} src="/ppt/index.html" title="After Now PPT 优化器" />
      </section>
    </main>
  );
}