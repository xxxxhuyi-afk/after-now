"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import Link from "next/link";
import styles from "./canvas.module.css";

type Item = { id: string; kind: "prompt" | "image"; src?: string; prompt: string; x: number; y: number; width: number; from?: string; pending?: boolean; aspectRatio?: string };
type Viewport = { x: number; y: number; zoom: number };
type Action =
  | { kind: "pan"; pointer: number; startX: number; startY: number; viewX: number; viewY: number }
  | { kind: "node"; pointer: number; id: string; startX: number; startY: number; nodeX: number; nodeY: number }
  | { kind: "connect"; pointer: number; id: string };
const storageKey = "after-now-image-canvas-v2";
const initialPrompt = "一座安静的湖畔未来建筑，清晨薄雾，极简建筑摄影";
const starterItems: Item[] = [
  { id: "starter-prompt", kind: "prompt", prompt: initialPrompt, x: 180, y: 190, width: 310 },
  { id: "starter-image", kind: "image", prompt: "等待生成图片", x: 720, y: 210, width: 330, from: "starter-prompt", pending: true, aspectRatio: "16 / 9" },
];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Canvas() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [style, setStyle] = useState("after");
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [localServiceAvailable, setLocalServiceAvailable] = useState(false);
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [quota, setQuota] = useState<{ remaining: number; userLimit: number; globalRemaining: number } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("正在读取账号…");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("拖动画布中的节点，滚轮缩放；选中描述节点后可开始生图。");
  const [view, setView] = useState<Viewport>({ x: 70, y: 54, zoom: 0.88 });
  const [ready, setReady] = useState(false);
  const [connectPoint, setConnectPoint] = useState<{ x: number; y: number; id: string } | null>(null);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const pointerAction = useRef<Action | null>(null);
  const intentionallyEmpty = useRef(false);
  const undoStack = useRef<Item[][]>([]);
  const redoStack = useRef<Item[][]>([]);
  const previousItems = useRef<Item[] | null>(null);
  const historyMove = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const accountAction = async (action: "login" | "signup" | "logout") => {
    setAuthBusy(true);
    try {
      const response = await fetch("/api/canvas-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email, password: loginPassword }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUser(data.user); setQuota(data.quota ?? null); setLoginPassword("");
      setAuthMessage(data.message ?? (action === "logout" ? "已退出登录。" : "登录成功。"));
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : "操作失败，请重试。"); }
    finally { setAuthBusy(false); }
  };
  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/canvas-auth", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setLocalMode(Boolean(data.local)); setLocalServiceAvailable(Boolean(data.serviceAvailable));
      setUser(data.user); setQuota(data.quota ?? null);
      setAuthMessage(data.local ? (data.serviceAvailable ? "本机开源模型已连接，图片在本机生成。" : "本地模型服务未启动。请先启动本地生图服务。") : !data.configured ? "访客生图服务尚未连接。仍可导入图片体验画布。" : data.user ? "" : "登录后即可生图。新账号需要验证邮箱。");
    } catch { setAuthMessage("账号信息暂时无法读取，请刷新重试。"); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/canvas-auth", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(); return data; })
      .then((data) => { setLocalMode(Boolean(data.local)); setLocalServiceAvailable(Boolean(data.serviceAvailable)); setUser(data.user); setQuota(data.quota ?? null); setAuthMessage(data.local ? (data.serviceAvailable ? "本机开源模型已连接，图片在本机生成。" : "本地模型服务未启动。请先启动本地生图服务。") : !data.configured ? "访客生图服务尚未连接。仍可导入图片体验画布。" : data.user ? "" : "登录后即可生图。新账号需要验证邮箱。"); })
      .catch(() => { if (!controller.signal.aborted) setAuthMessage("账号信息暂时无法读取，请刷新重试。"); });
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (["16:9", "9:16", "4:3", "3:4", "1:1", "3:2", "2:3"].includes(parsed.ratio)) setRatio(parsed.ratio);
        if (Array.isArray(parsed.items) && parsed.items.every((item: Item) => typeof item.id === "string" && (item.kind === "prompt" || item.kind === "image") && typeof item.prompt === "string" && Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.width))) {
          intentionallyEmpty.current = parsed.items.length === 0 && parsed.intentionallyEmpty === true;
          setItems(parsed.items.length === 0 && !intentionallyEmpty.current ? starterItems : parsed.items);
        }
        else setItems(starterItems);
        if (parsed.view && Number.isFinite(parsed.view.zoom)) setView({ x: Number(parsed.view.x) || 0, y: Number(parsed.view.y) || 0, zoom: clamp(parsed.view.zoom, .25, 1.8) });
      } else {
        const legacy = localStorage.getItem("after-now-image-canvas-v1");
        if (legacy) {
          const oldItems = JSON.parse(legacy);
          if (Array.isArray(oldItems)) setItems([...starterItems, ...oldItems.filter((item) => typeof item.src === "string").map((item, index) => ({ ...item, kind: "image" as const, x: 1180 + (index % 2) * 360, y: 180 + Math.floor(index / 2) * 340 }))]);
          else setItems(starterItems);
        } else setItems(starterItems);
      }
    } catch { setItems(starterItems); }
    setReady(true);
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!ready) return; const timer = window.setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify({ items, view, ratio, intentionallyEmpty: intentionallyEmpty.current })); } catch { setMessage("画布内容过多，图片不会自动保存在浏览器；请及时下载重要图片。"); } }, 500); return () => window.clearTimeout(timer); }, [items, view, ratio, ready]);
  useEffect(() => {
    if (!ready) return;
    const previous = previousItems.current;
    previousItems.current = items;
    if (!previous) return;
    if (historyMove.current) { historyMove.current = false; return; }
    undoStack.current = [...undoStack.current.slice(-39), previous];
    redoStack.current = [];
  }, [items, ready]);
  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => { if (!(event.target as HTMLElement).closest("[data-canvas-context-menu]")) setContextMenu(null); };
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
      if ((event.ctrlKey || event.metaKey) && !(event.target as HTMLElement).closest("textarea,input,[contenteditable='true']")) {
        if (event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
        if (event.key.toLowerCase() === "v") { event.preventDefault(); void pasteFromClipboard(); }
      }
    };
    window.addEventListener("pointerdown", dismiss); window.addEventListener("keydown", keys);
    return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", keys); };
  });

  const current = items.find((item) => item.id === selected) ?? null;
  const canGenerate = localMode ? localServiceAvailable : Boolean(user && quota && quota.remaining > 0 && quota.globalRemaining > 0);
  const currentPromptNode = current?.kind === "prompt" ? current : items.find((item) => item.kind === "prompt") ?? null;
  const activePrompt = currentPromptNode?.prompt ?? "";
  const addNode = (kind: "prompt" | "image") => {
    const id = crypto.randomUUID();
    const promptNode = kind === "prompt" ? null : currentPromptNode;
    const next: Item = { id, kind, prompt: kind === "prompt" ? "" : "等待生成图片", x: 240 + (items.length % 3) * 70, y: 560 + (items.length % 3) * 70, width: kind === "prompt" ? 310 : 330, ...(promptNode ? { from: promptNode.id } : {}), ...(kind === "image" ? { pending: true, aspectRatio: ratio.replace(":", " / ") } : {}) };
    intentionallyEmpty.current = false; setItems((all) => [...all, next]); setSelected(id); setShowNodeMenu(false);
    setMessage(kind === "prompt" ? "新描述节点已添加。" : "图片节点已添加，可以运行生成。");
  };
  const undo = () => { const previous = undoStack.current.pop(); if (!previous) { setMessage("没有可撤销的操作。"); return; } redoStack.current.push(items); historyMove.current = true; previousItems.current = previous; intentionallyEmpty.current = previous.length === 0; setItems(previous); setMessage("已撤销。按 Ctrl+Shift+Z 可重做。"); };
  const redo = () => { const next = redoStack.current.pop(); if (!next) { setMessage("没有可重做的操作。"); return; } undoStack.current.push(items); historyMove.current = true; previousItems.current = next; intentionallyEmpty.current = next.length === 0; setItems(next); setMessage("已重做。"); };
  const addImage = (src: string, description: string, from?: string, aspectRatio?: string) => {
    const id = crypto.randomUUID();
    const node: Item = { id, kind: "image", src, prompt: description, x: 1120 + (items.filter((item) => item.kind === "image").length % 2) * 370, y: 190 + Math.floor(items.filter((item) => item.kind === "image").length / 2) * 360, width: 330, ...(from ? { from } : {}), ...(aspectRatio ? { aspectRatio } : {}) };
    intentionallyEmpty.current = false; setItems((previous) => [...previous, node]); setSelected(id);
  };
  const generate = async () => {
    const source = currentPromptNode;
    if (!source?.prompt.trim()) { setMessage("先在描述节点里写下画面内容。"); return; }
    setBusy(true); setMessage("正在生成图片，请稍候…");
    try {
      const response = await fetch("/api/image-canvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: source.prompt, ratio, style }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
      const blob = await response.blob();
      const imageId = localMode ? response.headers.get("x-canvas-image-id") : null;
      const src = imageId ? `/api/image-canvas/output?id=${encodeURIComponent(imageId)}` : await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      const pending = items.find((item) => item.kind === "image" && item.pending && item.from === source.id);
      const cssRatio = ratio.replace(":", " / ");
      if (pending) setItems((all) => all.map((item) => item.id === pending.id ? { ...item, src, prompt: source.prompt, pending: false, aspectRatio: cssRatio } : item));
      else addImage(src, source.prompt, source.id, cssRatio);
      setMessage("图片已生成并连入画布。可以继续修改描述或再生成一版。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败，请重试。"); }
    finally { setBusy(false); void refreshAccount(); }
  };
  const importImage = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage("请导入小于 5 MB 的图片。"); return; }
    if (!file.type.startsWith("image/")) { setMessage("请选择 PNG、JPEG 或 WebP 图片。"); return; }
    const reader = new FileReader(); reader.onload = () => { addImage(String(reader.result), file.name, currentPromptNode?.id); setMessage("图片已放入画布，可以移动和下载。"); }; reader.readAsDataURL(file);
  };
  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) throw new Error("当前浏览器不支持读取剪贴板，请使用 Ctrl+V 粘贴。");
      const entries = await navigator.clipboard.read();
      for (const entry of entries) {
        const type = entry.types.find((value) => value.startsWith("image/"));
        if (type) { const blob = await entry.getType(type); const reader = new FileReader(); reader.onload = () => importImage(new File([blob], `clipboard.${type.split("/")[1]}`, { type })); reader.readAsDataURL(blob); setContextMenu(null); return; }
      }
      const text = await navigator.clipboard.readText();
      if (text.trim()) { const id = crypto.randomUUID(); const node: Item = { id, kind: "prompt", prompt: text.trim(), x: 260, y: 250, width: 310 }; setItems((all) => [...all, node]); setSelected(id); setMessage("剪贴板文字已作为描述节点添加。"); }
      else setMessage("剪贴板里没有可粘贴的文字或图片。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取剪贴板失败，请尝试 Ctrl+V。"); }
    setContextMenu(null);
  };
  const beginNodeDrag = (event: PointerEvent<HTMLElement>, item: Item) => {
    if ((event.target as HTMLElement).closest("button,textarea,input,select,a")) return;
    event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelected(item.id);
    pointerAction.current = { kind: "node", pointer: event.pointerId, id: item.id, startX: event.clientX, startY: event.clientY, nodeX: item.x, nodeY: item.y };
  };
  const beginPan = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button,.canvasNode,.nodeMenu,.zoomControls")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerAction.current = { kind: "pan", pointer: event.pointerId, startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y };
    setSelected(null);
  };
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    const action = pointerAction.current; if (!action || action.pointer !== event.pointerId) return;
    if (action.kind === "pan") setView((old) => ({ ...old, x: action.viewX + event.clientX - action.startX, y: action.viewY + event.clientY - action.startY }));
    if (action.kind === "node") setItems((all) => all.map((item) => item.id === action.id ? { ...item, x: action.nodeX + (event.clientX - action.startX) / view.zoom, y: action.nodeY + (event.clientY - action.startY) / view.zoom } : item));
    if (action.kind === "connect") { const rect = viewportRef.current?.getBoundingClientRect(); if (rect) setConnectPoint({ id: action.id, x: (event.clientX - rect.left - view.x) / view.zoom, y: (event.clientY - rect.top - view.y) / view.zoom }); }
  };
  const handleUp = (event: PointerEvent<HTMLElement>) => {
    const action = pointerAction.current; if (!action || action.pointer !== event.pointerId) return;
    if (action.kind === "connect") {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-node-id][data-port='input']") as HTMLElement | null;
      const targetId = target?.dataset.nodeId;
      if (targetId && targetId !== action.id) { setItems((all) => all.map((item) => item.id === targetId ? { ...item, from: action.id } : item)); setMessage("画布节点已连接。"); }
      setConnectPoint(null);
    }
    pointerAction.current = null;
  };
  const beginConnection = (event: PointerEvent<HTMLButtonElement>, item: Item) => {
    event.stopPropagation(); viewportRef.current?.setPointerCapture(event.pointerId);
    pointerAction.current = { kind: "connect", pointer: event.pointerId, id: item.id };
    const rect = viewportRef.current?.getBoundingClientRect(); if (rect) setConnectPoint({ id: item.id, x: (event.clientX - rect.left - view.x) / view.zoom, y: (event.clientY - rect.top - view.y) / view.zoom });
  };
  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("textarea,input,select")) return;
    event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); const px = event.clientX - rect.left, py = event.clientY - rect.top;
    setView((old) => { const zoom = clamp(old.zoom * Math.exp(-event.deltaY * .001), .25, 1.8); return { zoom, x: px - (px - old.x) * zoom / old.zoom, y: py - (py - old.y) * zoom / old.zoom }; });
  };
  const zoomBy = (factor: number) => setView((old) => { const zoom = clamp(old.zoom * factor, .25, 1.8); return { ...old, zoom, x: old.x - (850 - old.x) * (zoom / old.zoom - 1), y: old.y - (480 - old.y) * (zoom / old.zoom - 1) }; });
  const fitView = () => {
    if (!items.length || !viewportRef.current) { setView({ x: 70, y: 54, zoom: .88 }); return; }
    const rect = viewportRef.current.getBoundingClientRect(); const minX = Math.min(...items.map((item) => item.x)), minY = Math.min(...items.map((item) => item.y));
    const maxX = Math.max(...items.map((item) => item.x + item.width)), maxY = Math.max(...items.map((item) => item.y + 320));
    const zoom = clamp(Math.min((rect.width - 180) / (maxX - minX + 100), (rect.height - 160) / (maxY - minY + 100)), .35, 1.15);
    setView({ zoom, x: 90 - minX * zoom, y: 90 - minY * zoom });
  };
  const applyAssistant = () => {
    if (!assistantText.trim() || !currentPromptNode) { setMessage("先选择一个描述节点，再输入想补充的画面要求。"); return; }
    const addition = assistantText.trim();
    setItems((all) => all.map((item) => item.id === currentPromptNode.id ? { ...item, prompt: `${item.prompt}${item.prompt.trim() ? "，" : ""}${addition}` } : item));
    setAssistantText(""); setMessage("补充内容已加入描述节点，请确认后生成。");
  };
  const removeCurrent = () => { if (!current) return; const next = items.filter((item) => item.id !== current.id).map((item) => item.from === current.id ? { ...item, from: undefined } : item); intentionallyEmpty.current = next.length === 0; setItems(next); setSelected(null); };
  const saveCanvas = () => { try { localStorage.setItem(storageKey, JSON.stringify({ items, view, ratio, intentionallyEmpty: intentionallyEmpty.current })); setMessage("画布已保存在当前浏览器。"); } catch { setMessage("浏览器存储空间不足，请下载重要图片后移除部分图片。"); } };
  const edges = items.filter((item) => item.from).map((item) => ({ target: item, source: items.find((source) => source.id === item.from) })).filter((edge): edge is { target: Item; source: Item } => Boolean(edge.source));
  const nodePortY = (item: Item) => { if (item.kind === "prompt") return 125; const [width, height] = item.aspectRatio?.split("/").map(Number) ?? [4, 3]; const imageHeight = (item.width - 18) * height / width; return 43 + (item.src ? imageHeight : Math.max(190, imageHeight)) / 2; };
  const pathBetween = (source: Item, target: Item) => { const x1 = source.x + source.width, y1 = source.y + nodePortY(source), x2 = target.x, y2 = target.y + nodePortY(target), bend = Math.max(60, (x2 - x1) * .5); return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`; };

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/#lab" aria-label="返回 After Now 实验室"><span className={styles.brandMark}>A</span><span><strong>AFTER NOW</strong><small>IMAGE WORKSPACE</small></span></Link>
      <div className={styles.projectTitle}><span className={styles.liveDot} />图像创作画布 <span className={styles.projectDivider}>/</span> 未命名项目</div>
      <div className={styles.headerActions}><span className={styles.saveState}>● 自动保存</span><button onClick={saveCanvas}>保存画布</button><details className={styles.profile}><summary>{user ? user.email.slice(0, 1).toUpperCase() : "访"}</summary><div>{user ? <><p>{user.email}</p><button onClick={() => accountAction("logout")}>退出登录</button></> : <p>在右侧登录以使用生图额度。</p>}</div></details></div>
    </header>
    <div className={styles.workspace}>
      <section className={styles.canvasArea} aria-label="无限创作画布" onContextMenu={(event) => { if ((event.target as HTMLElement).closest("textarea,input,button,a")) return; event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setContextMenu({ x: Math.min(event.clientX - rect.left, rect.width - 285), y: Math.min(event.clientY - rect.top, rect.height - 365) }); setShowNodeMenu(false); }}>
        <nav className={styles.rail} aria-label="画布工具">
          <button aria-label="添加创作节点" title="添加创作节点" onClick={() => setShowNodeMenu((value) => !value)}>＋</button>
          <button aria-label="导入图片" title="导入图片" onClick={() => imageInputRef.current?.click()}>图片</button>
          <button aria-label="自动整理画布" title="整理画布" onClick={fitView}>整理</button>
          <button aria-label="保存画布" title="保存画布" onClick={saveCanvas}>存档</button>
        </nav>
        {showNodeMenu && <div className={styles.nodeMenu}><small>添加到画布</small><button onClick={() => addNode("prompt")}>文字描述节点</button><button onClick={() => { setShowNodeMenu(false); imageInputRef.current?.click(); }}>导入图片节点</button><button onClick={() => addNode("image")}>空白图片节点</button></div>}
        {contextMenu && <div className={styles.contextMenu} data-canvas-context-menu style={{ left: Math.max(8, contextMenu.x), top: Math.max(8, contextMenu.y) }} role="menu">
          <button role="menuitem" onClick={() => { setContextMenu(null); imageInputRef.current?.click(); }}>上传</button>
          <button role="menuitem" disabled title="资产库功能尚未开放">保存到我的资产</button>
          <button role="menuitem" onClick={() => { setContextMenu(null); addNode("prompt"); }}>添加节点</button>
          <hr />
          <button role="menuitem" disabled={!undoStack.current.length} onClick={undo}>撤销 <kbd>Ctrl Z</kbd></button>
          <button role="menuitem" disabled={!redoStack.current.length} onClick={redo}>重做 <kbd>Ctrl Shift Z</kbd></button>
          <hr />
          <button role="menuitem" onClick={() => void pasteFromClipboard()}>粘贴 <kbd>Ctrl V</kbd></button>
        </div>}
        <div ref={viewportRef} className={styles.viewport} onPointerDown={beginPan} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp} onWheel={handleWheel}>
          <div className={styles.infiniteGrid} />
          <div className={styles.world} style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})` }}>
            <svg className={styles.edges} width="3200" height="2400" aria-hidden="true">
              {edges.map(({ source, target }) => <path key={`${source.id}-${target.id}`} d={pathBetween(source, target)} />)}
              {connectPoint && (() => { const source = items.find((item) => item.id === connectPoint.id); const portY = source ? nodePortY(source) : 0; return source ? <path className={styles.draftEdge} d={`M ${source.x + source.width} ${source.y + portY} C ${source.x + source.width + 80} ${source.y + portY}, ${connectPoint.x - 80} ${connectPoint.y}, ${connectPoint.x} ${connectPoint.y}`} /> : null; })()}
            </svg>
            {items.map((item) => <article key={item.id} data-node-id={item.id} data-node-type={item.kind} className={`${styles.node} ${item.kind === "prompt" ? styles.promptNode : styles.imageNode} ${selected === item.id ? styles.selectedNode : ""}`} style={{ left: item.x, top: item.y, width: item.width }} onPointerDown={(event) => beginNodeDrag(event, item)}>
              <div className={styles.nodeHeader}><span className={`${styles.nodeTypeDot} ${item.kind === "image" ? styles.imageTypeDot : ""}`} />{item.kind === "prompt" ? "画面描述" : "图像结果"}<span className={styles.nodeStatus}>{item.pending ? "等待生成" : item.src ? "已完成" : "素材"}</span><button className={styles.nodeMore} aria-label="删除此节点" onClick={(event) => { event.stopPropagation(); const next = items.filter((node) => node.id !== item.id); intentionallyEmpty.current = next.length === 0; setItems(next); if (selected === item.id) setSelected(null); }}>×</button></div>
              {item.kind === "prompt" ? <div className={styles.promptSurface}><small>IMAGE PROMPT</small><textarea aria-label="画面描述" value={item.prompt} placeholder="写下你想生成的画面…" onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setItems((all) => all.map((node) => node.id === item.id ? { ...node, prompt: event.target.value } : node))} /><button onClick={(event) => { event.stopPropagation(); setSelected(item.id); void generate(); }} disabled={busy || !canGenerate}>{busy ? "生成中…" : "生成图片 ↗"}</button></div> : <div className={styles.imageSurface}>
              {item.src ? <img src={item.src} alt={item.prompt || "生成的图像"} draggable={false} style={item.aspectRatio ? { aspectRatio: item.aspectRatio } : undefined} onLoad={(event) => { if (!item.aspectRatio) { const value = `${event.currentTarget.naturalWidth} / ${event.currentTarget.naturalHeight}`; setItems((all) => all.map((node) => node.id === item.id ? { ...node, aspectRatio: value } : node)); } }} /> : <div className={styles.imagePlaceholder} style={{ aspectRatio: item.aspectRatio ?? "4 / 3" }}><span>{item.pending ? "生成结果将出现在这里" : "导入或生成一张图片"}</span></div>}
                <footer><span>{item.prompt || "未命名图像"}</span>{item.src && <a href={item.src} download={`after-now-${item.id}.png`} onPointerDown={(event) => event.stopPropagation()}>下载 ↓</a>}</footer>
              </div>}
              <button className={`${styles.port} ${styles.inputPort}`} style={{ top: nodePortY(item) }} data-port="input" data-node-id={item.id} aria-label="连接输入" title="连接输入" onPointerDown={(event) => event.stopPropagation()} />
              <button className={`${styles.port} ${styles.outputPort}`} style={{ top: nodePortY(item) }} data-port="output" data-node-id={item.id} aria-label="拖动连接到其他节点" title="拖动到另一个节点以连接" onPointerDown={(event) => beginConnection(event, item)} />
            </article>)}
            {!items.length && <div className={styles.emptyCanvas}><h2>从一个想法开始</h2><p>添加描述节点或导入图片，组成你的创作流程。</p><button onClick={() => addNode("prompt")}>添加描述节点</button></div>}
          </div>
        </div>
        <div className={styles.floatingToolbar}>
          <button onClick={() => setShowNodeMenu((value) => !value)}><b>＋</b>添加节点</button><i />
          <button onClick={fitView}>整理画布</button><i />
          <button disabled={busy || !activePrompt.trim() || !canGenerate} onClick={() => void generate()}>{busy ? "正在生成…" : "▶ 运行生图"}</button>
          <span className={styles.toolbarMode}><span className={styles.liveDot} />画布模式</span>
        </div>
        <div className={styles.zoomControls}><button aria-label="放大" onClick={() => zoomBy(1.15)}>＋</button><button aria-label="缩小" onClick={() => zoomBy(.87)}>−</button><button aria-label="适配画布" onClick={fitView}>⌗</button><span>{Math.round(view.zoom * 100)}%</span></div>
        <input ref={imageInputRef} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { importImage(event.target.files?.[0]); event.target.value = ""; }} />
      </section>
      <aside className={styles.inspector}>
        <div className={styles.inspectorHeader}><div><small>AFTER NOW / IMAGE AGENT</small><h2>创作助手</h2></div><button aria-label="保存画布" title="保存画布" onClick={saveCanvas}>存档</button></div>
        <div className={styles.assistantContext}><span className={styles.agentAvatar}>A</span><div><strong>画布协作中</strong><small>{current ? `正在编辑${current.kind === "prompt" ? "画面描述" : "图像结果"}节点` : "选择一个节点开始编辑"}</small></div><span className={styles.liveDot} /></div>
        <div className={styles.inspectorScroll}>
          <section className={styles.section}><div className={styles.sectionHeading}><span>01 / 画面描述</span><button onClick={() => addNode("prompt")}>＋ 新描述</button></div>
            {currentPromptNode ? <><textarea className={styles.mainPrompt} value={activePrompt} placeholder="描述你想生成的画面…" onChange={(event) => setItems((all) => all.map((item) => item.id === currentPromptNode.id ? { ...item, prompt: event.target.value } : item))} /><div className={styles.settingRow}><label>画面比例<select value={ratio} onChange={(event) => { const nextRatio = event.target.value; setRatio(nextRatio); setItems((all) => all.map((item) => item.kind === "image" && item.pending && item.from === currentPromptNode.id ? { ...item, aspectRatio: nextRatio.replace(":", " / ") } : item)); }}><option value="16:9">16:9 横屏</option><option value="9:16">9:16 竖屏</option><option value="4:3">4:3 横屏</option><option value="3:4">3:4 竖屏</option><option value="1:1">1:1 方形</option><option value="3:2">3:2 横屏</option><option value="2:3">2:3 竖屏</option></select></label></div><div className={styles.styleChoices}><span>视觉方向</span><div><button className={style === "after" ? styles.activeStyle : ""} onClick={() => setStyle("after")}>实验视觉</button><button className={style === "photo" ? styles.activeStyle : ""} onClick={() => setStyle("photo")}>电影摄影</button><button className={style === "original" ? styles.activeStyle : ""} onClick={() => setStyle("original")}>原始描述</button></div></div><button className={styles.generateButton} disabled={busy || !activePrompt.trim() || !canGenerate} onClick={() => void generate()}>{busy ? "图片生成中…" : "生成图片　↗"}</button><p className={styles.usage}>{localMode ? authMessage : user ? `今日剩余 ${quota?.remaining ?? "—"} / ${quota?.userLimit ?? "—"} 次` : authMessage}</p></> : <div className={styles.noPrompt}><p>画布还没有描述节点。</p><button onClick={() => addNode("prompt")}>添加描述节点</button></div>}
          </section>
          {current?.kind === "image" && <section className={styles.section}><div className={styles.sectionHeading}><span>02 / 图像节点</span><button className={styles.dangerAction} onClick={removeCurrent}>移除</button></div><p className={styles.selectedDescription}>{current.src ? current.prompt : current.pending ? "运行描述节点后，生成的图片会出现在这里。" : "可通过导入图片填充此节点。"}</p>{current.src && <a className={styles.downloadButton} href={current.src} download={`after-now-${current.id}.png`}>下载原图 ↓</a>}</section>}
          {!localMode && <details className={styles.account}><summary>{user ? `账号与额度 · ${user.email}` : "登录以启用生图"}</summary>{user ? <><p>今日剩余 {quota?.remaining ?? "—"} / {quota?.userLimit ?? "—"} 次</p><button className={styles.secondaryButton} disabled={busy || authBusy} onClick={() => accountAction("logout")}>退出登录</button></> : <form onSubmit={(event) => { event.preventDefault(); void accountAction("login"); }}><label>邮箱<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>密码<input type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label><div className={styles.authActions}><button className={styles.secondaryButton} disabled={authBusy} type="submit">{authBusy ? "请稍候…" : "登录"}</button><button className={styles.secondaryButton} disabled={authBusy || !email || loginPassword.length < 8} type="button" onClick={() => void accountAction("signup")}>注册</button></div><p role="status">{authMessage}</p></form>}<small>每日次数于北京时间 08:00 重置；提交给模型后会计入次数。</small></details>}
          <section className={styles.section}><div className={styles.sectionHeading}><span>03 / 描述补充</span><span className={styles.optionalTag}>可选</span></div><label className={styles.assistantLabel} htmlFor="assistant-note">告诉助手你想补充的画面内容</label><textarea id="assistant-note" className={styles.assistantInput} value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="例如：加上柔和的晨雾和湖面倒影" /><button className={styles.applyButton} onClick={applyAssistant}>加入当前描述</button></section>
          <p className={styles.message} role="status">{message}</p>
        </div>
        <footer className={styles.inspectorFooter}><span>AFTER NOW IMAGE CANVAS</span><Link href="/#lab">返回实验室 ↗</Link></footer>
      </aside>
    </div>
  </main>;
}


