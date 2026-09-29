"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./asset-editor.module.css";

type Props = { src: string; mode: "erase" | "split"; onClose: () => void; onApply: (src: string, label: string, bounds: Rect, sourceSize: { width: number; height: number }, originalSrc?: string) => void };
type Rect = { x: number; y: number; width: number; height: number };

export default function AssetEditor({ src, mode, onClose, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; lastX: number; lastY: number } | null>(null);
  const [brush, setBrush] = useState(36);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) { setError("浏览器无法打开这张图片。"); setBusy(false); return; }
      context.drawImage(image, 0, 0);
      setBusy(false);
    };
    image.onerror = () => { setError("图片读取失败，请重新导入后再试。"); setBusy(false); };
    image.src = src;
    return () => { cancelled = true; };
  }, [src]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * event.currentTarget.width / bounds.width, y: (event.clientY - bounds.top) * event.currentTarget.height / bounds.height };
  };
  const begin = (event: PointerEvent<HTMLCanvasElement>) => {
    if (busy) return;
    setError("");
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    dragRef.current = { ...p, lastX: p.x, lastY: p.y };
    if (mode === "split") setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
    else {
      const context = event.currentTarget.getContext("2d");
      if (context) { context.globalCompositeOperation = "destination-out"; context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = brush * event.currentTarget.width / event.currentTarget.getBoundingClientRect().width; context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(p.x + 0.01, p.y + 0.01); context.stroke(); }
    }
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = point(event);
    if (mode === "split") setSelection({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), width: Math.abs(p.x - drag.x), height: Math.abs(p.y - drag.y) });
    else {
      const context = event.currentTarget.getContext("2d");
      if (context) { context.globalCompositeOperation = "destination-out"; context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = brush * event.currentTarget.width / event.currentTarget.getBoundingClientRect().width; context.beginPath(); context.moveTo(drag.lastX, drag.lastY); context.lineTo(p.x, p.y); context.stroke(); }
      drag.lastX = p.x; drag.lastY = p.y;
    }
  };
  const end = () => { dragRef.current = null; };
  const apply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (mode === "erase") {
      onApply(canvas.toDataURL("image/png"), "擦除图层", { x: 0, y: 0, width: canvas.width, height: canvas.height }, { width: canvas.width, height: canvas.height });
      return;
    }
    if (!selection || selection.width < 8 || selection.height < 8) { setError("先在图片上拖出要拆出的矩形区域。"); return; }
    const output = document.createElement("canvas");
    output.width = Math.round(selection.width); output.height = Math.round(selection.height);
    const context = output.getContext("2d");
    if (!context) { setError("无法创建图片图层，请重试。"); return; }
    context.drawImage(canvas, selection.x, selection.y, selection.width, selection.height, 0, 0, output.width, output.height);
    const originalContext = canvas.getContext("2d");
    if (!originalContext) { setError("无法更新原图图层，请重试。"); return; }
    originalContext.globalCompositeOperation = "destination-out";
    originalContext.clearRect(selection.x, selection.y, selection.width, selection.height);
    originalContext.globalCompositeOperation = "source-over";
    onApply(output.toDataURL("image/png"), "手动拆分图层", selection, { width: canvas.width, height: canvas.height }, canvas.toDataURL("image/png"));
  };
  const reset = () => {
    setBusy(true); setError(""); setSelection(null);
    const image = new Image(); image.onload = () => { const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (canvas && context) { context.globalCompositeOperation = "source-over"; context.clearRect(0, 0, canvas.width, canvas.height); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; context.drawImage(image, 0, 0); } setBusy(false); }; image.onerror = () => { setError("图片读取失败。"); setBusy(false); }; image.src = src;
  };

  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="asset-editor-title" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.dialog}>
      <header><div><small>AFTER NOW / LAYER EDITOR</small><h2 id="asset-editor-title">{mode === "erase" ? "橡皮工具" : "拆分图层"}</h2></div><button onClick={onClose} aria-label="关闭">×</button></header>
      <p>{mode === "erase" ? "在图片上涂抹，擦除部分会变成透明。原图会保留，结果作为新图层加入画布。" : "在图片上拖出矩形区域，选区会从原图切下并成为可单独移动、缩放的图层。"}</p>
      <div className={`${styles.stage} ${mode === "erase" ? styles.eraseStage : ""}`}>
        <div className={styles.canvasFrame}>
          <canvas ref={canvasRef} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
          {mode === "split" && selection && <div className={styles.selection} style={{ left: `${selection.x / (canvasRef.current?.width || 1) * 100}%`, top: `${selection.y / (canvasRef.current?.height || 1) * 100}%`, width: `${selection.width / (canvasRef.current?.width || 1) * 100}%`, height: `${selection.height / (canvasRef.current?.height || 1) * 100}%` }} />}
        </div>
        {busy && <span>正在载入图片…</span>}
        {error && !busy && <span role="status">{error}</span>}
      </div>
      <footer>
        {mode === "erase" ? <label>画笔大小 <input type="range" min="8" max="120" value={brush} onChange={(event) => setBrush(Number(event.target.value))} /> <output>{brush}px</output></label> : <span>{selection?.width ? `选区 ${Math.round(selection.width)} × ${Math.round(selection.height)} px` : "拖动鼠标选择要拆出的区域"}</span>}
        <div><button className={styles.secondary} onClick={reset} disabled={busy}>重置</button><button className={styles.secondary} onClick={onClose}>取消</button><button className={styles.primary} onClick={apply} disabled={busy || Boolean(error)}>{mode === "erase" ? "擦除并加入画布" : "拆为独立图层"}</button></div>
      </footer>
      {mode === "erase" && <small className={styles.note}>这里是透明擦除；自动补背景需要接入支持蒙版的图像修复模型。</small>}
      {mode === "split" && <small className={styles.note}>当前按矩形选区切分；自动识别物体边缘需要接入分割模型。</small>}
    </section>
  </div>;
}
