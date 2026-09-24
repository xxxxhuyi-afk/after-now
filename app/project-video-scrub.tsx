"use client";

import { useEffect, useRef } from "react";
import styles from "./project-video-scrub.module.css";

const BACKGROUND_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260724_061251_5b1af666-7df5-4284-abea-a19a14d1cc10.mp4";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export default function ProjectVideoScrub() {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const state = {
      targetTime: 0,
      currentTime: 0,
      seeking: false,
      lastSeek: 0,
    };
    let frame = 0;

    const updateTarget = () => {
      if (!video.duration || reducedMotion) return;
      const rect = stage.getBoundingClientRect();
      const travel = window.innerHeight + rect.height;
      const progress = clamp((window.innerHeight - rect.top) / travel);
      state.targetTime = progress * video.duration;
    };

    const onMetadata = () => {
      video.pause();
      video.currentTime = 0.001;
      state.currentTime = 0.001;
      updateTarget();
    };

    const onSeeked = () => {
      state.seeking = false;
    };

    const tick = (now: number) => {
      if (!reducedMotion && video.duration) {
        state.currentTime += (state.targetTime - state.currentTime) * 0.1;
        if (
          !state.seeking &&
          Math.abs(state.currentTime - video.currentTime) > 0.02 &&
          now - state.lastSeek > 30
        ) {
          state.seeking = true;
          state.lastSeek = now;
          video.currentTime = clamp(state.currentTime, 0, video.duration - 0.01);
        }

        const progress = state.currentTime / video.duration;
        const wipe = clamp((progress - 0.3) / 0.7);
        const centered = clamp(progress / 0.6);
        const shift = -80 * (1 - centered);
        stage.style.setProperty("--wipe", wipe.toFixed(4));
        stage.style.setProperty("--shift", `${shift.toFixed(2)}px`);
        stage.style.setProperty("--progress", progress.toFixed(4));
      }
      frame = window.requestAnimationFrame(tick);
    };

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("seeked", onSeeked);
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget, { passive: true });
    updateTarget();
    frame = window.requestAnimationFrame(tick);

    return () => {
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.stage} ref={stageRef} aria-label="滚动控制的 VANTA 影像作品">
      <video
        className={styles.backgroundVideo}
        ref={videoRef}
        src={BACKGROUND_VIDEO}
        muted
        playsInline
        preload="metadata"
      />
    </div>
  );
}
