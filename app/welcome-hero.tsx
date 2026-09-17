"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./welcome-hero.module.css";

export default function WelcomeHero() {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (media.matches) { video.current?.pause(); setPaused(true); } };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <section className={styles.hero} id="top" aria-labelledby="welcome-title">
    <video ref={video} className={styles.video} autoPlay loop muted playsInline preload="metadata" aria-hidden="true">
      <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
    </video>
    <nav className={styles.nav} aria-label="主导航">
      <a className={styles.logo} href="#top">After-Now</a>
      <div className={styles.links}><a href="#top" aria-current="page">首页</a><a href="#lab">工具与 Skill</a><a href="#works">作品</a><a href="#manifesto">关于我</a><a href="#contact">联系</a></div>
      <a className={styles.glass} href="/lab/image-canvas">进入画布 ↗</a>
    </nav>
    <div className={styles.content}>
      <p className={styles.eyebrow}>欢迎来到 AFTER-NOW / 此刻之后</p>
      <h1 id="welcome-title"><span style={{ fontSize: "0.55em" }}>欢迎来到</span><br /><em>After-Now.</em></h1>
      <p className={styles.description}>让想法成为作品。<br />从一个工具、一种方法、一次创作开始。</p>
      <a className={`${styles.glass} ${styles.cta}`} href="#lab">开始创作 ↗</a>
    </div>
    <footer className={styles.footer}><a href="#lab">探索工具与工作台 ↓</a><button className={styles.glass} onClick={async () => { if (!video.current) return; if (paused) { try { await video.current.play(); setPaused(false); } catch { setPaused(true); } } else { video.current.pause(); setPaused(true); } }} aria-label={paused ? "播放背景视频" : "暂停背景视频"}>{paused ? "播放背景" : "暂停背景"}</button></footer>
  </section>;
}

