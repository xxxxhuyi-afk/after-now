"use client";

import { useEffect, useRef } from "react";
import styles from "./motion-canvas.module.css";

type Point = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  column: number;
  row: number;
};

export default function MotionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const pointer = { x: window.innerWidth * 0.68, y: window.innerHeight * 0.46 };
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let spacing = 84;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      height = rect.height;
      spacing = width < 640 ? 70 : 84;
      columns = Math.ceil(width / spacing) + 2;
      rows = Math.ceil(height / spacing) + 2;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const points: Point[] = [];
      const phase = time * 0.00042;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const baseX = (column - 1) * spacing;
          const baseY = (row - 1) * spacing;
          const waveX = Math.sin(phase * 1.35 + row * 0.72 + column * 0.18) * 8;
          const waveY = Math.cos(phase + column * 0.62 + row * 0.21) * 7;
          const deltaX = pointer.x - baseX;
          const deltaY = pointer.y - baseY;
          const distance = Math.hypot(deltaX, deltaY);
          const influence = Math.max(0, 1 - distance / 230);

          points.push({
            x: baseX + waveX - deltaX * influence * 0.055,
            y: baseY + waveY - deltaY * influence * 0.055,
            baseX,
            baseY,
            column,
            row,
          });
        }
      }

      context.save();
      context.globalCompositeOperation = "screen";
      context.lineWidth = 0.65;

      points.forEach((point, index) => {
        const right = point.column < columns - 1 ? points[index + 1] : null;
        const below = point.row < rows - 1 ? points[index + columns] : null;
        const pointerDistance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
        const brightness = Math.max(0, 1 - pointerDistance / 310);
        context.strokeStyle = `rgba(105, 124, 255, ${0.045 + brightness * 0.14})`;

        if (right) {
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(right.x, right.y);
          context.stroke();
        }

        if (below) {
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(below.x, below.y);
          context.stroke();
        }

        if ((point.column + point.row) % 3 === 0) {
          context.fillStyle = `rgba(225, 232, 255, ${0.12 + brightness * 0.34})`;
          context.beginPath();
          context.arc(point.x, point.y, 0.75 + brightness * 1.2, 0, Math.PI * 2);
          context.fill();
        }
      });

      const pointerGlow = context.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        190,
      );
      pointerGlow.addColorStop(0, "rgba(217, 255, 82, 0.11)");
      pointerGlow.addColorStop(0.35, "rgba(78, 99, 255, 0.08)");
      pointerGlow.addColorStop(1, "rgba(78, 99, 255, 0)");
      context.fillStyle = pointerGlow;
      context.fillRect(pointer.x - 190, pointer.y - 190, 380, 380);

      for (let index = 0; index < 3; index += 1) {
        const travel = (phase * (0.24 + index * 0.035) + index * 0.31) % 1;
        const x = width * (0.12 + travel * 0.82);
        const y = height * (0.2 + index * 0.22) + Math.sin(phase * 2 + index) * 42;
        context.fillStyle = index === 1 ? "rgba(217, 255, 82, 0.78)" : "rgba(94, 116, 255, 0.74)";
        context.shadowColor = index === 1 ? "#d9ff52" : "#4e63ff";
        context.shadowBlur = 14;
        context.beginPath();
        context.arc(x, y, index === 1 ? 1.4 : 1.8, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();

      if (!reducedMotion) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    if (reducedMotion) {
      draw(0);
    } else {
      frame = window.requestAnimationFrame(draw);
      window.addEventListener("pointermove", updatePointer, { passive: true });
    }
    window.addEventListener("resize", resize, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
