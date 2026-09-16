"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./showroom-model.module.css";

type Point3 = [number, number, number];
type ScreenPoint = { x: number; y: number; z: number };

const MODES = ["空间", "动线", "光照", "材质", "声场"];

export default function ShowroomModel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const viewRef = useRef({
    yaw: -0.34,
    pitch: 0.14,
    targetYaw: -0.34,
    targetPitch: 0.14,
    zoom: 1,
    targetZoom: 1,
  });
  const lightRef = useRef(72);
  const [activeMode, setActiveMode] = useState("空间");
  const [light, setLight] = useState(72);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 1;
    let height = 1;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const project = (point: Point3): ScreenPoint => {
      const view = viewRef.current;
      const [x, y, z] = point;
      const cy = Math.cos(view.yaw);
      const sy = Math.sin(view.yaw);
      const cp = Math.cos(view.pitch);
      const sp = Math.sin(view.pitch);
      const x1 = x * cy - z * sy;
      const z1 = x * sy + z * cy;
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const camera = 12.5 + z2;
      const scale = Math.min(width, height) * 0.82 * view.zoom / camera;
      return {
        x: width * 0.47 + x1 * scale,
        y: height * 0.52 - y1 * scale,
        z: z2,
      };
    };

    const line = (
      from: Point3,
      to: Point3,
      color: string,
      lineWidth = 1,
    ) => {
      const a = project(from);
      const b = project(to);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.stroke();
    };

    const polygon = (
      points: Point3[],
      fill: string,
      stroke: string,
      lineWidth = 1,
    ) => {
      const projected = points.map(project);
      context.beginPath();
      projected.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = lineWidth;
      context.stroke();
    };

    const box = (
      cx: number,
      cy: number,
      cz: number,
      sx: number,
      sy: number,
      sz: number,
      alpha = 0.12,
    ) => {
      const x0 = cx - sx / 2;
      const x1 = cx + sx / 2;
      const y0 = cy - sy / 2;
      const y1 = cy + sy / 2;
      const z0 = cz - sz / 2;
      const z1 = cz + sz / 2;
      const faces: Point3[][] = [
        [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
        [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]],
        [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
      ];
      faces
        .map((face) => ({ face, z: face.reduce((sum, p) => sum + project(p).z, 0) / face.length }))
        .sort((a, b) => a.z - b.z)
        .forEach(({ face }, index) => {
          polygon(
            face,
            `rgba(216,255,82,${alpha + index * 0.025})`,
            `rgba(226,255,142,${0.34 + index * 0.08})`,
          );
        });
    };

    const draw = () => {
      const view = viewRef.current;
      view.yaw += (view.targetYaw - view.yaw) * 0.075;
      view.pitch += (view.targetPitch - view.pitch) * 0.075;
      view.zoom += (view.targetZoom - view.zoom) * 0.08;

      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(
        width * 0.46,
        height * 0.48,
        0,
        width * 0.46,
        height * 0.48,
        Math.max(width, height) * 0.72,
      );
      const lightAmount = lightRef.current / 100;
      glow.addColorStop(0, `rgba(131,183,45,${0.18 + lightAmount * 0.18})`);
      glow.addColorStop(0.48, "rgba(25,51,23,.22)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = "#050805";
      context.fillRect(0, 0, width, height);
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (let x = -5; x <= 5; x += 1) {
        line([x, -2, -4.5], [x, -2, 4.5], "rgba(216,255,82,.16)");
      }
      for (let z = -4; z <= 4; z += 1) {
        line([-5.5, -2, z], [5.5, -2, z], "rgba(216,255,82,.16)");
      }

      polygon(
        [[-5.5, -2, 4.5], [5.5, -2, 4.5], [5.5, 3, 4.5], [-5.5, 3, 4.5]],
        "rgba(116,151,52,.055)",
        "rgba(216,255,82,.22)",
      );
      polygon(
        [[-5.5, -2, -4.5], [-5.5, -2, 4.5], [-5.5, 3, 4.5], [-5.5, 3, -4.5]],
        "rgba(116,151,52,.035)",
        "rgba(216,255,82,.16)",
      );
      polygon(
        [[5.5, -2, -4.5], [5.5, -2, 4.5], [5.5, 3, 4.5], [5.5, 3, -4.5]],
        "rgba(116,151,52,.035)",
        "rgba(216,255,82,.16)",
      );

      box(-2.7, -1.35, 0.9, 1.7, 1.3, 1.4, 0.09);
      box(0.1, -1.1, 1.7, 2.2, 1.8, 1.3, 0.11);
      box(2.8, -1.5, -0.1, 1.4, 1, 1.2, 0.08);
      box(-0.2, -1.55, -2.2, 1.1, 0.9, 1.1, 0.08);

      const panels: Array<[number, number, number, number, number]> = [
        [-3.2, 0.35, 4.42, 1.5, 2.2],
        [-0.8, 0.5, 4.42, 1.45, 1.8],
        [1.55, 0.2, 4.42, 1.6, 2.35],
        [3.65, 0.55, 4.42, 1.2, 1.55],
      ];
      panels.forEach(([x, y, z, w, h], index) => {
        polygon(
          [[x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z]],
          `rgba(216,255,82,${0.1 + index * 0.02})`,
          "rgba(230,255,164,.55)",
          1.2,
        );
      });

      line([-5.5, 3, 4.5], [5.5, 3, 4.5], "rgba(216,255,82,.5)", 1.2);
      line([-5.5, -2, -4.5], [-5.5, 3, -4.5], "rgba(216,255,82,.24)");
      line([5.5, -2, -4.5], [5.5, 3, -4.5], "rgba(216,255,82,.24)");

      frameRef.current = window.requestAnimationFrame(draw);
    };

    frameRef.current = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const resetView = () => {
    viewRef.current.targetYaw = -0.34;
    viewRef.current.targetPitch = 0.14;
    viewRef.current.targetZoom = 1;
  };

  return (
    <section className={styles.showroom} aria-label="After Now 绿色展厅模型">
      <canvas
        className={styles.canvas}
        ref={canvasRef}
        aria-label="可拖拽旋转与缩放的三维展厅线框模型"
        role="img"
        onPointerDown={(event) => {
          dragRef.current = { active: true, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag.active) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          drag.x = event.clientX;
          drag.y = event.clientY;
          viewRef.current.targetYaw += dx * 0.006;
          viewRef.current.targetPitch = Math.max(-0.35, Math.min(0.55, viewRef.current.targetPitch + dy * 0.004));
        }}
        onPointerUp={(event) => {
          dragRef.current.active = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { dragRef.current.active = false; }}
        onWheel={(event) => {
          event.preventDefault();
          viewRef.current.targetZoom = Math.max(0.72, Math.min(1.38, viewRef.current.targetZoom - event.deltaY * 0.0008));
        }}
      />

      <div className={styles.topLeft}>
        <div className={styles.brandLine}>
          <button type="button" onClick={resetView} aria-label="重置展厅视角">←</button>
          <span><i aria-hidden="true" />After Now Exhibition</span>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="展厅查看模式">
          {MODES.map((mode) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === mode}
              className={activeMode === mode ? styles.activeTab : undefined}
              key={mode}
              onClick={() => setActiveMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        <dl className={styles.liveInfo}>
          <div><dt>当前观察模式</dt><dd>{activeMode}分析 / LIVE</dd></div>
          <div><dt>模型状态</dt><dd>展厅 01 · 已同步</dd></div>
        </dl>
      </div>

      <div className={styles.topRight}>
        <span>拖动旋转<br />滚轮缩放</span>
        <button type="button" onClick={resetView}>重置视角 ↗</button>
      </div>

      <div className={styles.stats} aria-label="展厅数据">
        <span><i>03</i>展区</span>
        <span><i>12</i>作品</span>
        <span><i>01</i>动线</span>
      </div>

      <aside className={styles.rail}>
        <article className={styles.glassCard}>
          <span className={styles.cardIndex}>MODEL 01</span>
          <h3>未来档案馆<br />Future Archive</h3>
          <p>一座以光、路径与数字记忆构成的实验性展厅。</p>
          <div className={styles.metrics}>
            <span><strong>480</strong> m²</span>
            <span><strong>3.6</strong> m</span>
            <span><strong>12</strong> works</span>
          </div>
        </article>

        <article className={`${styles.glassCard} ${styles.controlCard}`}>
          <div className={styles.cardTitleRow}>
            <span>ENVIRONMENT</span>
            <span>{light}%</span>
          </div>
          <label htmlFor="showroom-light">展厅光照强度</label>
          <input
            id="showroom-light"
            type="range"
            min="18"
            max="100"
            value={light}
            onChange={(event) => {
              const value = Number(event.target.value);
              lightRef.current = value;
              setLight(value);
            }}
          />
          <div className={styles.controlValues}>
            <span>色温<strong>5300K</strong></span>
            <span>雾化<strong>12%</strong></span>
            <span>对比<strong>1.24</strong></span>
          </div>
        </article>

        <article className={`${styles.glassCard} ${styles.noteCard}`}>
          <div className={styles.cardTitleRow}>
            <span>VISITOR PATH</span>
            <span>01 / 03</span>
          </div>
          <ol>
            <li><span>01</span>抵达与身份识别</li>
            <li><span>02</span>沉浸式作品廊道</li>
            <li><span>03</span>阅读与回望区域</li>
          </ol>
        </article>
      </aside>

      <p className={styles.hint}>INTERACTIVE EXHIBITION MODEL / 拖动模型探索空间</p>
    </section>
  );
}
