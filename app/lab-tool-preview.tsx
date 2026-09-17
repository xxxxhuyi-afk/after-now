"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

const tools = {
  zaozao: { src: "/zaozao/index.html", title: "小胡造造造", description: "文字与图像 → 立体模型" },
  canvas: { src: "/lab/image-canvas", title: "生图画布", description: "生成图像 · 自由排列 · 保存创作" },
  paper: { src: "/lab/generative-form", title: "纸卷游乐场", description: "拖动纸卷，让图像沿途展开" },
};

export default function LabToolPreview({ tool = "zaozao" }: { tool?: keyof typeof tools }) {
  const preview = tools[tool];
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const card = element?.closest("article");
    if (!element || !card) return;
    const touch = window.matchMedia("(hover: none)");
    const enter = () => setActive(true);
    const leave = () => setActive(touch.matches || card.contains(document.activeElement));
    const blur = (event: FocusEvent) => {
      if (!card.contains(event.relatedTarget as Node | null)) setActive(touch.matches);
    };
    const update = () => setActive(touch.matches);
    update();
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    card.addEventListener("focusin", enter);
    card.addEventListener("focusout", blur);
    touch.addEventListener("change", update);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
      card.removeEventListener("focusin", enter);
      card.removeEventListener("focusout", blur);
      touch.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={ref} className={styles.labToolPreview} data-active={active} aria-hidden="true">
      <div className={styles.labToolViewport}>
        <iframe src={preview.src} loading="lazy" title={`${preview.title}界面预览`} tabIndex={-1}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: 1280, height: 900 }} />
      </div>
      <div className={styles.labToolCaption}>
        <strong>{preview.title}</strong>
        <span>{preview.description}</span>
        <small>点击打开工具 ↗</small>
      </div>
    </div>
  );
}
