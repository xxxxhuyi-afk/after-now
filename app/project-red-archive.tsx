"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./project-red-archive.module.css";

const SCENES = [
  "/project-03-scene-01.png",
  "/project-03-scene-02.png",
  "/project-03-scene-03.png",
  "/project-03-scene-04.png",
  "/project-03-scene-05.png",
  "/project-03-scene-06.png",
];

function wrap(value: number, count: number) {
  return ((value % count) + count) % count;
}

export default function ProjectRedArchive() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const progress = useRef(0);
  const target = useRef(0);
  const frame = useRef(0);
  const dragging = useRef(false);
  const pointerY = useRef(0);
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const lastActive = useRef(0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      const attempt = video.play();
      attempt
        .then(() => setSoundOn(true))
        .catch(() => {
          video.muted = true;
          setSoundOn(false);
          void video.play();
        });
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const render = () => {
      const root = carouselRef.current;
      if (!root) return;

      if (!dragging.current && Math.abs(target.current - progress.current) < 0.015) {
        target.current += 0.00065;
      }

      progress.current += (target.current - progress.current) * 0.075;
      mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
      mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;

      const count = SCENES.length;
      const radius = Math.min(300, Math.max(175, root.clientHeight * 0.32));
      const depth = Math.min(520, Math.max(280, root.clientWidth * 0.72));
      const currentIndex = wrap(Math.round(progress.current), count);

      if (currentIndex !== lastActive.current) {
        lastActive.current = currentIndex;
        setActiveIndex(currentIndex);
      }

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        let offset = index - progress.current;
        while (offset > count / 2) offset -= count;
        while (offset < -count / 2) offset += count;

        const angle = offset * 50 * (Math.PI / 180);
        const y = Math.sin(angle) * radius;
        const z = (Math.cos(angle) - 1) * depth;
        const absOffset = Math.abs(offset);
        const centerFactor = Math.max(0, 1 - absOffset);
        const tiltX = -angle * 0.38 - mouse.current.y * 5 * centerFactor;
        const tiltY = mouse.current.x * 7 * centerFactor;
        const opacity = Math.max(0.08, 1 - absOffset * 0.3);

        card.style.transform = `translate3d(-50%, calc(-50% + ${y.toFixed(2)}px), ${z.toFixed(2)}px) rotateX(${(tiltX * 180 / Math.PI).toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = `${100 - Math.round(absOffset * 10)}`;
        card.style.pointerEvents = absOffset < 1.25 ? "auto" : "none";
      });

      frame.current = window.requestAnimationFrame(render);
    };

    frame.current = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame.current);
  }, [open]);

  const focusScene = (index: number) => {
    const count = SCENES.length;
    const current = wrap(target.current, count);
    let delta = index - current;
    while (delta > count / 2) delta -= count;
    while (delta < -count / 2) delta += count;
    target.current += delta;
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = soundOn;
    setSoundOn(!soundOn);
    if (video.paused) void video.play();
  };

  const modal = open ? (
    <div
      className={styles.modal}
      role="dialog"
      aria-modal="true"
      aria-label="After Now 影像作品详情"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className={styles.modalShell}>
        <header className={styles.modalHeader}>
          <div>
            <span>PROJECT 03 / 2026</span>
            <strong>AFTER NOW — 天台之后</strong>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="关闭作品详情">
            <span>关闭</span>
            <i aria-hidden="true">×</i>
          </button>
        </header>

        <div className={styles.detailGrid}>
          <section className={styles.filmPanel} aria-label="作品影片">
            <video
              ref={videoRef}
              className={styles.film}
              src="/project-03-rooftop.mp4"
              poster="/project-03-cover.png"
              autoPlay
              loop
              playsInline
              controls
              preload="auto"
            />
            <div className={styles.filmMeta}>
              <span>天台跃下片尾.mp4</span>
              <button type="button" onClick={toggleSound}>
                {soundOn ? "声音开启" : "开启声音"}
              </button>
            </div>
          </section>

          <section
            className={styles.carouselPanel}
            aria-label="作品图像画廊"
            ref={carouselRef}
            onWheel={(event) => {
              event.preventDefault();
              target.current += event.deltaY * 0.0022 + event.deltaX * 0.0012;
            }}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              mouse.current.targetX = (event.clientX - rect.left) / rect.width * 2 - 1;
              mouse.current.targetY = (event.clientY - rect.top) / rect.height * 2 - 1;
              if (dragging.current) {
                const delta = event.clientY - pointerY.current;
                pointerY.current = event.clientY;
                target.current -= delta * 0.008;
              }
            }}
            onPointerDown={(event) => {
              dragging.current = true;
              pointerY.current = event.clientY;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={(event) => {
              dragging.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
              target.current = Math.round(target.current);
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
            onPointerLeave={() => {
              mouse.current.targetX = 0;
              mouse.current.targetY = 0;
            }}
          >
            <div className={styles.carouselTopline}>
              <span>VISUAL ARCHIVE</span>
              <span>{String(activeIndex + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}</span>
            </div>
            <div className={styles.carouselScene}>
              {SCENES.map((src, index) => (
                <button
                  className={styles.sceneCard}
                  type="button"
                  key={src}
                  ref={(node) => { cardRefs.current[index] = node; }}
                  onClick={(event) => {
                    event.stopPropagation();
                    focusScene(index);
                  }}
                  aria-label={`查看作品图 ${index + 1}`}
                >
                  <span className={styles.cardDepth} aria-hidden="true" />
                  <span className={styles.cardDepthTwo} aria-hidden="true" />
                  <Image src={src} alt="" fill sizes="(max-width: 900px) 86vw, 36vw" priority={index < 2} />
                </button>
              ))}
            </div>
            <p className={styles.carouselHint}>滚轮 / 上下拖动 / 点击画面</p>
          </section>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button className={styles.preview} type="button" onClick={() => setOpen(true)}>
        <Image
          src="/project-03-cover.png"
          alt="打开 After Now 影像作品"
          fill
          sizes="(max-width: 900px) 100vw, 75vw"
        />
        <span className={styles.previewShade} aria-hidden="true" />
        <span className={styles.previewTopline}>AFTER NOW / VISUAL NARRATIVE</span>
        <span className={styles.previewCta}>观看作品 <i aria-hidden="true">↗</i></span>
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
