"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./editor.module.css";

type Device = "desktop" | "mobile";
type Layout = { x?: number; y?: number; fontSize?: number; width?: number; textAlign?: "left" | "center" | "right" };
type Draft = { version: 1; desktop: Record<string, Layout>; mobile: Record<string, Layout> };
const KEY = "after-now-editor-v0.1";
const targets = [
  { id: "title", label: "Manifesto 主标题", selector: "#manifesto-title" },
  { id: "description", label: "中文说明", selector: "#manifesto p:first-of-type" },
  { id: "english", label: "英文说明", selector: '#manifesto p[lang="en"]' },
];
const empty = (): Draft => ({ version: 1, desktop: {}, mobile: {} });
const limits = { x: [-1200, 1200], y: [-1200, 1200], fontSize: [8, 240], width: [40, 1600] };
function validated(value: unknown): Draft {
  const result = empty();
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) throw new Error("Invalid draft");
  for (const device of ["desktop", "mobile"] as const) {
    const entries = (value as Draft)[device];
    if (!entries || typeof entries !== "object") throw new Error("Invalid device");
    for (const { id } of targets) {
      const item = entries[id];
      if (!item || typeof item !== "object") continue;
      const clean: Layout = {};
      for (const key of ["x", "y", "fontSize", "width"] as const) {
        const n = item[key];
        if (typeof n === "number" && Number.isFinite(n)) clean[key] = Math.min(limits[key][1], Math.max(limits[key][0], n));
      }
      if (["left", "center", "right"].includes(item.textAlign ?? "")) clean.textAlign = item.textAlign;
      result[device][id] = clean;
    }
  }
  return result;
}

export default function Editor() {
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<() => void>(() => {});
  const [device, setDevice] = useState<Device>("desktop");
  const [selected, setSelected] = useState("title");
  const [draft, setDraft] = useState<Draft>(empty);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("正在加载预览…");
  const [dirty, setDirty] = useState(false);
  const [measurements, setMeasurements] = useState<Record<string, Layout>>({});
  const current = useRef({ draft, device });
  useEffect(() => { current.current = { draft, device }; }, [draft, device]);

  useEffect(() => {
    const timer = window.setTimeout(() => { try {
      const saved = localStorage.getItem(KEY);
      if (saved) { setDraft(validated(JSON.parse(saved))); setStatus("已载入本机草稿"); }
    } catch { setStatus("草稿无法读取，已使用原始布局；可重新保存。"); } }, 0);
    return () => { window.clearTimeout(timer); cleanup.current(); };
  }, []);

  const update = useCallback((id: string, patch: Layout) => {
    setDraft(previous => {
      const mode = current.current.device;
      return { ...previous, [mode]: { ...previous[mode], [id]: { ...previous[mode][id], ...patch } } };
    });
    setDirty(true);
    setStatus("有未保存的修改");
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const connect = useCallback(() => {
    cleanup.current();
    const doc = frame.current?.contentDocument;
    const win = frame.current?.contentWindow;
    if (!doc || !win) return;
    const disposers: (() => void)[] = [];
    const measured: Record<string, Layout> = {};
    for (const target of targets) {
      const element = doc.querySelector<HTMLElement>(target.selector);
      if (!element) continue;
      const computed = win.getComputedStyle(element);
      measured[target.id] = { fontSize: parseFloat(computed.fontSize), width: element.getBoundingClientRect().width, textAlign: computed.textAlign as Layout["textAlign"] };
      element.style.cursor = "grab";
      element.style.touchAction = "none";
      element.style.userSelect = "none";
      element.style.outlineOffset = "6px";
      element.tabIndex = 0;
      element.setAttribute("aria-label", `${target.label}，拖动或使用方向键移动`);
      let drag: { pointer: number; x: number; y: number; startX: number; startY: number } | null = null;
      const down = (event: PointerEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setSelected(target.id);
        const layout = current.current.draft[current.current.device][target.id] ?? {};
        drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: layout.x ?? 0, startY: layout.y ?? 0 };
        element.setPointerCapture(event.pointerId);
      };
      const move = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.pointer) return;
        update(target.id, { x: Math.round(Math.max(-1200, Math.min(1200, drag.startX + event.clientX - drag.x))), y: Math.round(Math.max(-1200, Math.min(1200, drag.startY + event.clientY - drag.y))) });
      };
      const up = () => { drag = null; };
      const focus = () => setSelected(target.id);
      const key = (event: KeyboardEvent) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const layout = current.current.draft[current.current.device][target.id] ?? {};
        const step = event.shiftKey ? 10 : 1;
        update(target.id, { x: Math.max(-1200, Math.min(1200, (layout.x ?? 0) + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))), y: Math.max(-1200, Math.min(1200, (layout.y ?? 0) + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))) });
      };
      element.addEventListener("pointerdown", down);
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", up);
      element.addEventListener("lostpointercapture", up);
      element.addEventListener("focus", focus);
      element.addEventListener("keydown", key);
      disposers.push(() => {
        element.removeEventListener("pointerdown", down); element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up); element.removeEventListener("pointercancel", up);
        element.removeEventListener("lostpointercapture", up); element.removeEventListener("focus", focus); element.removeEventListener("keydown", key);
      });
    }
    cleanup.current = () => disposers.forEach(dispose => dispose());
    setMeasurements(measured);
    setReady(true);
    doc.getElementById("manifesto")?.scrollIntoView({ behavior: "instant" });
    setStatus(previous => previous === "正在加载预览…" ? "点击文字选中，拖动调整位置" : previous);
  }, [update]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => {
      const doc = frame.current?.contentDocument;
      if (doc?.documentElement.dataset.editorReady === "true" && doc.getElementById("manifesto-title")) connect();
    }, 100);
    return () => window.clearInterval(timer);
  }, [connect, device, ready]);

  useEffect(() => {
    if (!ready) return;
    const doc = frame.current?.contentDocument;
    for (const target of targets) {
      const element = doc?.querySelector<HTMLElement>(target.selector);
      if (!element) continue;
      const layout = draft[device][target.id] ?? {};
      element.style.translate = layout.x !== undefined || layout.y !== undefined ? `${layout.x ?? 0}px ${layout.y ?? 0}px` : "";
      element.style.fontSize = layout.fontSize === undefined ? "" : `${layout.fontSize}px`;
      element.style.width = layout.width === undefined ? "" : `${layout.width}px`;
      element.style.maxWidth = layout.width === undefined ? "" : "none";
      element.style.textAlign = layout.textAlign ?? "";
      element.style.outline = target.id === selected ? "2px solid #b6fb50" : "1px dashed #929a86";
    }
  }, [draft, device, selected, ready]);

  const layout = draft[device][selected] ?? {};
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(draft)); setDirty(false); setStatus("已保存 Desktop + Mobile 草稿，仅此浏览器可见"); }
    catch { setStatus("保存失败：浏览器存储不可用，请导出草稿备份。"); }
  };
  const reset = () => {
    setDraft(empty()); setDirty(true); setStatus("已恢复两种设备的原始布局；点击 Save Draft 保存重置结果");
  };
  const exportDraft = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "after-now-draft.json"; link.click(); URL.revokeObjectURL(url);
  };

  return <main className={styles.editor}>
    <header className={styles.header}><div><b>AFTER NOW</b><span>EDITOR / v0.1</span></div><a href="/" target="_blank" rel="noreferrer">查看只读首页 ↗</a></header>
    <div className={styles.workspace}>
      <aside className={styles.panel}>
        <p className={styles.eyebrow}>DESIGN MODE</p><h1>调整此刻。</h1><p>点击预览中的文字，直接拖动。两种设备分别调整。</p>
        <div className={styles.devices}>{(["desktop", "mobile"] as const).map(mode => <button key={mode} aria-pressed={device === mode} onClick={() => { if (mode !== device) { setReady(false); setDevice(mode); } }}>{mode === "desktop" ? "Desktop" : "Mobile"}</button>)}</div>
        <label>选中元素<select value={selected} onChange={event => { setSelected(event.target.value); frame.current?.contentDocument?.querySelector(targets.find(t => t.id === event.target.value)!.selector)?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>{targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <fieldset disabled={!ready} className={styles.fields}>
          {(["x", "y", "fontSize", "width"] as const).map(key => <label key={`${device}-${selected}-${key}`}>{({ x: "X 偏移 / px", y: "Y 偏移 / px", fontSize: "字号 / px", width: "宽度 / px" })[key]}<input type="number" min={limits[key][0]} max={limits[key][1]} step="1" value={layout[key] ?? ""} placeholder={String(Math.round(measurements[selected]?.[key] ?? 0))} onChange={event => { const raw = event.target.value; update(selected, { [key]: raw === "" ? undefined : Math.max(limits[key][0], Math.min(limits[key][1], Number(raw))) }); }} /></label>)}
          <label>文字对齐<select value={layout.textAlign ?? ""} onChange={event => update(selected, { textAlign: (event.target.value || undefined) as Layout["textAlign"] })}><option value="">跟随原始样式</option><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label>
        </fieldset>
        <p className={styles.hint}>空值跟随原始样式。方向键移动 1px，Shift + 方向键移动 10px。Reset 重置两种设备。</p>
        <button className={styles.save} onClick={save} disabled={!ready}>Save Draft{dirty ? " •" : ""}</button>
        <div className={styles.actions}><button onClick={reset}>Reset</button><button onClick={exportDraft}>导出草稿</button></div>
        <p role="status" className={styles.status}>{status}</p>
        <p className={styles.hint}>草稿保存在本机浏览器。不会写入首页或发布到网站。</p>
      </aside>
      <section className={styles.canvas} aria-label="网站预览"><div className={styles.canvasLabel}>{device === "desktop" ? "DESKTOP / 1440 PX" : "MOBILE / 390 PX"}<span>MANIFESTO · LIVE CANVAS</span></div><iframe key={device} ref={frame} title={`${device} 首页编辑预览`} src="/edit/preview#manifesto" className={styles.frame} style={{ width: device === "desktop" ? 1440 : 390 }} /></section>
    </div>
  </main>;
}
