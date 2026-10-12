"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import Link from "next/link";
import { AlignCenter, AlignLeft, AlignRight, BookmarkPlus, Check, Copy, Download, Ellipsis, Expand, Eraser, FileText, FolderPlus, Grid2X2, Image as ImageIcon, Info, Layers2, PanelLeftClose, PanelLeftOpen, Paintbrush, Scissors, Search, Share2, Trash2, Type, ZoomIn } from "lucide-react";
import styles from "./canvas.module.css";
import AssetEditor from "./asset-editor";
import { readImageBatch, type ImageCount } from "./image-batch";

type Item = { id: string; kind: "prompt" | "image" | "text"; src?: string; prompt: string; x: number; y: number; width: number; from?: string; sources?: string[]; pending?: boolean; aspectRatio?: string; fontSize?: number; fontFamily?: string; color?: string; textAlign?: "left" | "center" | "right"; fontWeight?: number };
type Viewport = { x: number; y: number; zoom: number };
type Edge = { sourceId: string; targetId: string; kind: "from" | "reference" };
type CanvasMenu = { x: number; y: number; target: { kind: "canvas" } | { kind: "node"; id: string } | { kind: "edge"; edge: Edge } };
type ConnectionMenu = { sourceId: string; x: number; y: number; worldX: number; worldY: number };
type PromptTemplate = { id: string; title: string; text: string; group: string };
type OcrLine = { text: string; originalText?: string; score: number | null; box: [number, number][] };
type ImageModel = "flux-klein" | "sdxl-lightning" | "dreamshaper";
type WorkflowTemplate = "rebuild" | "fusion" | "product" | "angles";
type Action =
  | { kind: "pan"; pointer: number; startX: number; startY: number; viewX: number; viewY: number }
  | { kind: "node"; pointer: number; startX: number; startY: number; positions: Record<string, { x: number; y: number }>; moved: boolean }
  | { kind: "marquee"; pointer: number; startX: number; startY: number; additive: boolean }
  | { kind: "connect"; pointer: number; id: string };
const storageKey = "after-now-image-canvas-v2";
const releaseNoticeKey = "after-now-image-canvas-release-dismissed";
const releaseNoticeVersion = "canvas-2026-09-29-direct-text-edit-v3";
const initialPrompt = "一座安静的湖畔未来建筑，清晨薄雾，极简建筑摄影";
const starterItems: Item[] = [
  { id: "starter-prompt", kind: "prompt", prompt: initialPrompt, x: 180, y: 190, width: 310 },
  { id: "starter-image", kind: "image", prompt: "等待生成图片", x: 720, y: 210, width: 330, from: "starter-prompt", pending: true, aspectRatio: "16 / 9" },
];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const minZoom = 0.1;
const maxZoom = 8;
const starterPrompts: PromptTemplate[] = [
  { id: "spatial-study", title: "空间概念", group: "空间创作", text: "一处具有清晰动线与光影层次的展览空间，保留建筑结构，真实材质，建筑摄影。" },
  { id: "material-study", title: "材质探索", group: "空间创作", text: "以参考空间的布局为基础，探索木材、石材与柔和自然光的组合，保持真实尺度。" },
  { id: "scene-extension", title: "场景延展", group: "图像参考", text: "延续参考图片中的空间结构、透视与主要材质，扩展出新的连续场景。" },
];
const imageModels: { id: ImageModel; name: string; note: string; references: boolean }[] = [
  { id: "flux-klein", name: "FLUX.2 Klein", note: "多图参考 · 空间重建", references: true },
  { id: "sdxl-lightning", name: "SDXL Lightning", note: "极速草图 · 文字生图", references: false },
  { id: "dreamshaper", name: "DreamShaper", note: "写实氛围 · 文字生图", references: false },
];
const referenceDataUrl = async (src: string, maxDimension = 510) => {
  const image = new Image();
  image.src = src;
  await image.decode();
  let scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("参考图无法读取，请重新导入图片。");
  let dataUrl = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = Math.max(1, Math.floor(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.floor(image.naturalHeight * scale));
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", attempt < 4 ? 0.82 - attempt * 0.08 : 0.56);
    if (dataUrl.length * 0.75 <= 490_000) return dataUrl;
    if (attempt >= 3) scale *= 0.85;
  }
  return dataUrl;
};
const imageDataUrl = async (src: string) => {
  if (src.startsWith("data:")) return src;
  const image = new Image(); image.src = src; await image.decode();
  const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d"); if (!context) throw new Error("无法读取这张图片。");
  context.drawImage(image, 0, 0); return canvas.toDataURL("image/png");
};

export default function Canvas() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"canvas" | "assets" | "prompts" | "workflow">("canvas");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [workflowSpaceId, setWorkflowSpaceId] = useState("");
  const [workflowReferenceId, setWorkflowReferenceId] = useState("");
  const [workflowMode, setWorkflowMode] = useState<"rebuild" | "fusion">("rebuild");
  const [workflowTemplate, setWorkflowTemplate] = useState<WorkflowTemplate>("rebuild");
  const [workflowNote, setWorkflowNote] = useState("");
  const [savedAssetIds, setSavedAssetIds] = useState<string[]>([]);
  const [customPrompts, setCustomPrompts] = useState<PromptTemplate[]>([]);
  const [toolbarMenu, setToolbarMenu] = useState<"info" | "style" | "crop" | "upscale" | "more" | "text" | "editText" | null>(null);
  const [assetEditor, setAssetEditor] = useState<"erase" | "split" | null>(null);
  const [ocrLines, setOcrLines] = useState<OcrLine[]>([]);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [textReplaceBusy, setTextReplaceBusy] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cropRatio, setCropRatio] = useState("1:1");
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [style, setStyle] = useState("after");
  const [imageModel, setImageModel] = useState<ImageModel>("flux-klein");
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [localServiceAvailable, setLocalServiceAvailable] = useState(false);
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [quota, setQuota] = useState<{ remaining: number; userLimit: number; globalRemaining: number } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("正在读取账号…");
  const [busy, setBusy] = useState(false);
  const [imageCount, setImageCount] = useState<ImageCount>(1);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 1 });
  const generationLock = useRef(false);
  const [message, setMessage] = useState("空白处拖出选框；拖动选中节点可一起移动，按住空格拖动画布。");
  const [view, setView] = useState<Viewport>({ x: 70, y: 54, zoom: 0.88 });
  const [ready, setReady] = useState(false);
  const [showReleaseNotice, setShowReleaseNotice] = useState(false);
  const [connectPoint, setConnectPoint] = useState<{ x: number; y: number; id: string } | null>(null);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<CanvasMenu | null>(null);
  const [connectionMenu, setConnectionMenu] = useState<ConnectionMenu | null>(null);
  const pointerAction = useRef<Action | null>(null);
  const spaceHeld = useRef(false);
  const dragStartItems = useRef<Item[] | null>(null);
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
        if (imageModels.some((model) => model.id === parsed.imageModel)) setImageModel(parsed.imageModel);
        if (Array.isArray(parsed.items) && parsed.items.every((item: Item) => typeof item.id === "string" && (item.kind === "prompt" || item.kind === "image" || item.kind === "text") && typeof item.prompt === "string" && Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.width))) {
          intentionallyEmpty.current = parsed.items.length === 0 && parsed.intentionallyEmpty === true;
          setItems(parsed.items.length === 0 && !intentionallyEmpty.current ? starterItems : parsed.items);
        }
        else setItems(starterItems);
        if (parsed.view && Number.isFinite(parsed.view.zoom)) setView({ x: Number(parsed.view.x) || 0, y: Number(parsed.view.y) || 0, zoom: clamp(parsed.view.zoom, minZoom, maxZoom) });
        if (Array.isArray(parsed.savedAssetIds)) setSavedAssetIds(parsed.savedAssetIds.filter((id: unknown) => typeof id === "string"));
        if (Array.isArray(parsed.customPrompts)) setCustomPrompts(parsed.customPrompts.filter((item: PromptTemplate) => typeof item.id === "string" && typeof item.title === "string" && typeof item.text === "string"));
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
  useEffect(() => { if (!ready) return; const timer = window.setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify({ items, view, ratio, imageModel, savedAssetIds, customPrompts, intentionallyEmpty: intentionallyEmpty.current })); } catch { setMessage("画布内容过多，图片不会自动保存在浏览器；请及时下载重要图片。"); } }, 500); return () => window.clearTimeout(timer); }, [items, view, ratio, imageModel, savedAssetIds, customPrompts, ready]);
  useEffect(() => { if (!ready) return; try { if (localStorage.getItem(releaseNoticeKey) !== releaseNoticeVersion) setShowReleaseNotice(true); } catch {} }, [ready]);
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
    const dismiss = (event: globalThis.PointerEvent) => { if (!(event.target as HTMLElement).closest("[data-canvas-context-menu]")) setContextMenu(null); if (!(event.target as HTMLElement).closest("[data-connection-menu]")) setConnectionMenu(null); };
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setContextMenu(null); setConnectionMenu(null); if (showReleaseNotice) { try { localStorage.setItem(releaseNoticeKey, releaseNoticeVersion); } catch {} setShowReleaseNotice(false); } }
      if (event.code === "Space" && !(event.target as HTMLElement).closest("textarea,input,[contenteditable='true']")) { spaceHeld.current = true; event.preventDefault(); }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedEdge && !(event.target as HTMLElement).closest("textarea,input,[contenteditable='true']")) {
        event.preventDefault(); disconnectEdge(selectedEdge); return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !(event.target as HTMLElement).closest("textarea,input,[contenteditable='true']") && selectedIds.length) {
        event.preventDefault(); const ids = new Set(selectedIds);
        setItems((all) => { const next = all.filter((item) => !ids.has(item.id)).map((item) => ({ ...item, ...(item.from && ids.has(item.from) ? { from: undefined } : {}), ...(item.sources ? { sources: item.sources.filter((id) => !ids.has(id)) } : {}) })); intentionallyEmpty.current = next.length === 0; return next; });
        setSelectedIds([]); setSelected(null); setMessage(`已删除 ${ids.size} 个选中节点。`);
      }
      if ((event.ctrlKey || event.metaKey) && !(event.target as HTMLElement).closest("textarea,input,[contenteditable='true']")) {
        if (event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
        if (event.key.toLowerCase() === "v") { event.preventDefault(); void pasteFromClipboard(); }
      }
    };
    const keyUp = (event: KeyboardEvent) => { if (event.code === "Space") spaceHeld.current = false; };
    const blur = () => { spaceHeld.current = false; };
    window.addEventListener("pointerdown", dismiss); window.addEventListener("keydown", keys); window.addEventListener("keyup", keyUp); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", keys); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", blur); };
  });

  const current = items.find((item) => item.id === selected) ?? null;
  const canGenerate = localMode ? localServiceAvailable : Boolean(user && quota && quota.remaining > 0 && quota.globalRemaining > 0);
  const currentPromptNode = current?.kind === "prompt" ? current : items.find((item) => item.kind === "prompt") ?? null;
  const activePrompt = currentPromptNode?.prompt ?? "";
  const addNode = (kind: "prompt" | "image" | "text") => {
    const id = crypto.randomUUID();
    const promptNode = kind === "image" ? currentPromptNode : null;
    const next: Item = { id, kind, prompt: kind === "prompt" ? "" : kind === "text" ? "输入文字…" : "等待生成图片", x: 240 + (items.length % 3) * 70, y: 560 + (items.length % 3) * 70, width: kind === "prompt" ? 310 : kind === "text" ? 420 : 330, ...(kind === "text" ? { fontSize: 32, fontFamily: "Arial, Microsoft YaHei, sans-serif", color: "#f1f3ef", textAlign: "left" as const, fontWeight: 600 } : {}), ...(promptNode ? { from: promptNode.id } : {}), ...(kind === "image" ? { pending: true, aspectRatio: ratio.replace(":", " / ") } : {}) };
    intentionallyEmpty.current = false; setItems((all) => [...all, next]); setSelected(id); setSelectedIds([id]); setShowNodeMenu(false);
    setMessage(kind === "prompt" ? "新描述节点已添加。" : kind === "text" ? "可编辑文字图层已添加。" : "图片节点已添加，可以运行生成。");
  };
  const addImageLayer = (src: string, description: string, bounds: { x: number; y: number; width: number; height: number }, sourceSize: { width: number; height: number }, parent: Item, originalSrc?: string) => {
    const id = crypto.randomUUID();
    const image = new Image(); image.src = src;
    const node: Item = { id, kind: "image", src, prompt: description, x: parent.x + (bounds.x / sourceSize.width) * parent.width, y: parent.y + (bounds.y / sourceSize.height) * parent.width, width: (bounds.width / sourceSize.width) * parent.width, from: parent.id, aspectRatio: `${bounds.width} / ${bounds.height}` };
    if (originalSrc) setItems((all) => all.map((item) => item.id === parent.id ? { ...item, src: originalSrc } : item).concat(node));
    else setItems((all) => [...all, node]);
    setSelected(id); setSelectedIds([id]); setAssetEditor(null); setToolbarMenu(null);
    setMessage(`${description}已作为独立图层加入画布；原图保留，可随时撤销或删除。`);
  };
  const recognizeImageText = async (image: Item) => {
    if (!image.src) return;
    setOcrBusy(true); setOcrMessage("正在识别图片中的文字…"); setOcrLines([]);
    try {
      const dataUrl = await imageDataUrl(image.src);
      const { createWorker } = await import("tesseract.js");
      setOcrMessage("首次使用会下载中文识别模型，请稍候…");
      const worker = await createWorker("chi_sim+eng", 1, { logger: (event) => { if (event.status === "recognizing text") setOcrMessage(`正在识别图片文字 ${Math.round((event.progress ?? 0) * 100)}%…`); } });
      let lines: OcrLine[];
      try {
        const { data } = await worker.recognize(dataUrl);
        lines = data.lines.flatMap((line) => {
          const text = line.text.trim();
          if (!text) return [];
          const { x0, y0, x1, y1 } = line.bbox;
          return [{ text, originalText: text, score: Number.isFinite(line.confidence) ? line.confidence / 100 : null, box: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as [number, number][] }];
        });
      } finally { await worker.terminate(); }
      setOcrLines(lines);
      setOcrMessage(lines.length ? `识别到 ${lines.length} 段文字。修改后可直接让网站生成一张替换后的图片，也可转成独立文字图层。` : "这张图片里没有识别到文字。");
    } catch (error) {
      setOcrMessage(error instanceof Error ? `文字识别失败：${error.message}。请检查网络后重试。` : "文字识别失败，请检查网络后重试。");
    }
    finally { setOcrBusy(false); }
  };
  const addOcrTextLayers = (image: Item, cleanSrc?: string) => {
    if (!image.src || !ocrLines.length) return;
    const source = new Image();
    source.onload = () => {
      const scale = image.width / source.naturalWidth;
      const copyId = crypto.randomUUID();
      const copyX = image.x + image.width + 110;
      const imageCopy: Item = { ...image, id: copyId, x: copyX, y: image.y, prompt: `${image.prompt} · 文字分层副本`, src: cleanSrc ?? image.src, from: undefined, sources: undefined, pending: false };
      const nodes = ocrLines.filter((line) => line.text.trim()).map((line) => {
        const xs = line.box.map(([x]) => x), ys = line.box.map(([, y]) => y);
        const left = Math.min(...xs), top = Math.min(...ys), width = Math.max(...xs) - left, height = Math.max(...ys) - top;
        return { id: crypto.randomUUID(), kind: "text" as const, prompt: line.text, x: copyX + left * scale, y: image.y + top * scale, width: Math.max(80, width * scale * 1.4), fontSize: clamp(height * scale * .82, 10, 160), fontFamily: "Microsoft YaHei, sans-serif", color: "#214fd2", textAlign: "left" as const, fontWeight: 600 };
      });
      if (!nodes.length) { setOcrMessage("先保留至少一段非空文字，再创建文字图层。"); return; }
      setItems((all) => [...all, imageCopy, ...nodes]); setSelected(imageCopy.id); setSelectedIds([imageCopy.id, ...nodes.map((node) => node.id)]); setToolbarMenu(null);
      setMessage(`已在原图右侧复制底图，并拆出 ${nodes.length} 个独立文字图层；原图保留，文字层不带连接线。`);
    };
    source.onerror = () => setOcrMessage("无法读取原图，不能定位识别到的文字。");
    source.src = cleanSrc ?? image.src;
  };
  const replaceOcrText = async (image: Item) => {
    if (!image.src || !ocrLines.length) return;
    setTextReplaceBusy(true); setOcrMessage("正在清除原文字并重建底图…");
    try {
      const imageSrc = await imageDataUrl(image.src);
      const source = new Image();
      source.src = imageSrc;
      await source.decode();
      const mask = document.createElement("canvas"); mask.width = source.naturalWidth; mask.height = source.naturalHeight;
      const context = mask.getContext("2d"); if (!context) throw new Error("无法创建文字修复蒙版。");
      context.fillStyle = "#000"; context.fillRect(0, 0, mask.width, mask.height); context.fillStyle = "#fff";
      for (const line of ocrLines) {
        const xs = line.box.map(([x]) => x), ys = line.box.map(([, y]) => y);
        const left = Math.min(...xs), top = Math.min(...ys), right = Math.max(...xs), bottom = Math.max(...ys), pad = Math.max(4, (bottom - top) * .15);
        context.fillRect(Math.max(0, left - pad), Math.max(0, top - pad), Math.min(mask.width - left + pad, right - left + 2 * pad), Math.min(mask.height - top + pad, bottom - top + 2 * pad));
      }
      const response = await fetch("http://127.0.0.1:8080/api/v1/inpaint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: imageSrc, mask: mask.toDataURL("image/png") }) });
      if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.detail ?? "IOPaint 修复失败，请检查本机服务。"); }
      const blob = await response.blob();
      const cleanSrc = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("无法读取修复后的图片。")); reader.readAsDataURL(blob); });
      setOcrMessage("底图修复完成，正在放置可编辑文字…"); addOcrTextLayers(image, cleanSrc);
    } catch (error) { setOcrMessage(error instanceof Error ? error.message : "修复旧文字失败，请确认 IOPaint 已启动。"); }
    finally { setTextReplaceBusy(false); }
  };
  const generateOcrTextEdit = async (image: Item) => {
    if (!image.src || !ocrLines.length) return;
    const changes = ocrLines.filter((line) => line.text.trim()).map((line) => `“${line.originalText ?? line.text}”替换为“${line.text}”`).join("；");
    const instruction = `请基于参考图片进行精确的图片文字修改。只修改以下识别到的文字内容：${changes}。严格保持每处文字原来的位置、字号比例、字体风格、颜色、方向、对齐方式、行数与排版；保留原图其余所有画面、图形、照片、背景、材质和构图不变。清除被替换的旧文字并自然补全其下方背景，不要叠加旧字，不要增加未列出的文字，不要生成说明、标注、水印或边框。输出与原图相同宽高比例的一张完整图片。`;
    const promptId = crypto.randomUUID();
    const promptNode: Item = { id: promptId, kind: "prompt", prompt: instruction, x: image.x + image.width + 90, y: image.y, width: 330, sources: [image.id] };
    setItems((all) => [...all, promptNode]); setSelected(promptId); setSelectedIds([promptId]); setToolbarMenu(null);
    setMessage("已创建文字修改指令，正在使用网站生图服务生成修改版…");
    const recognizedImage = new Image(); recognizedImage.src = image.src;
    try {
      await recognizedImage.decode();
      const targetAspect = recognizedImage.naturalWidth / recognizedImage.naturalHeight;
      const availableRatios = ["16:9", "9:16", "4:3", "3:4", "1:1", "3:2", "2:3"];
      const editRatio = availableRatios.reduce((best, candidate) => Math.abs(Number(candidate.split(":")[0]) / Number(candidate.split(":")[1]) - targetAspect) < Math.abs(Number(best.split(":")[0]) / Number(best.split(":")[1]) - targetAspect) ? candidate : best, availableRatios[0]);
      void generate(undefined, { prompt: instruction, referenceItems: [image], sourceId: promptId, ratio: editRatio });
    } catch { setMessage("原图无法读取，请重新导入后再尝试文字修改。"); }
  };
  const undo = () => { const previous = undoStack.current.pop(); if (!previous) { setMessage("没有可撤销的操作。"); return; } redoStack.current.push(items); historyMove.current = true; previousItems.current = previous; intentionallyEmpty.current = previous.length === 0; setItems(previous); setMessage("已撤销。按 Ctrl+Shift+Z 可重做。"); };
  const redo = () => { const next = redoStack.current.pop(); if (!next) { setMessage("没有可重做的操作。"); return; } undoStack.current.push(items); historyMove.current = true; previousItems.current = next; intentionallyEmpty.current = next.length === 0; setItems(next); setMessage("已重做。"); };
  const addImage = (src: string, description: string, from?: string, aspectRatio?: string) => {
    const id = crypto.randomUUID();
    const node: Item = { id, kind: "image", src, prompt: description, x: 1120 + (items.filter((item) => item.kind === "image").length % 2) * 370, y: 190 + Math.floor(items.filter((item) => item.kind === "image").length / 2) * 360, width: 330, ...(from ? { from } : {}), ...(aspectRatio ? { aspectRatio } : {}) };
    intentionallyEmpty.current = false; setItems((previous) => [...previous, node]); setSelected(id); setSelectedIds([id]);
  };
  const generate = async (sourceId?: string, editOverride?: { prompt: string; referenceItems: Item[]; sourceId: string; ratio?: string }) => {
    if (generationLock.current) return;
    const source = sourceId ? items.find((item) => item.id === sourceId && item.kind === "prompt") : currentPromptNode;
    const promptText = editOverride?.prompt ?? source?.prompt.trim();
    if (!promptText) { setMessage("先在描述节点里写下画面内容。"); return; }
    const count = editOverride ? 1 : imageCount;
    if (!localMode && quota && Math.min(quota.remaining, quota.globalRemaining) < count) {
      setMessage(`当前可用额度不足 ${count} 次，请减少生成张数。`); return;
    }
    generationLock.current = true;
    setBusy(true); setBatchProgress({ current: 0, total: count });
    setMessage(`准备生成 ${count} 张图片…`);
    let completedCount = 0;
    try {
      const referenceNodes = editOverride?.referenceItems ?? (source?.sources ?? []).map((id) => items.find((item) => item.id === id));
      if (referenceNodes.some((item) => !item?.src)) throw new Error("有参考图片已被删除，请重新连接后再生成。");
      const modelForRequest = editOverride ? "flux-klein" : imageModel;
      if (referenceNodes.length && !imageModels.find((model) => model.id === modelForRequest)?.references) throw new Error("这个免费模型只支持文字生图。使用参考图时请选择 FLUX.2 Klein。");
      const references = await Promise.all(referenceNodes.map((item) => referenceDataUrl(item!.src!, editOverride ? 1024 : 510)));
      const requestRatio = editOverride?.ratio ?? ratio;
      const targetId = editOverride?.sourceId ?? source?.id;
      const pending = targetId ? items.find((item) => item.kind === "image" && item.pending && item.from === targetId) : undefined;
      const cssRatio = requestRatio.replace(":", " / ");
      const [ratioWidth, ratioHeight] = requestRatio.split(":").map(Number);
      const rowHeight = Math.max(220, 330 * ratioHeight / ratioWidth + 110);
      const anchorX = pending?.x ?? Math.max(source ? source.x + source.width + 110 : 1120, ...items.filter((item) => item.kind === "image" && item.from === targetId).map((item) => item.x + item.width + 40));
      const anchorY = pending?.y ?? source?.y ?? 190;
      const batchNodes: Item[] = [];
      const addResult = (src: string, index: number) => {
        const node: Item = { id: index === 0 && pending ? pending.id : crypto.randomUUID(), kind: "image", src, prompt: promptText, x: anchorX + (index % 2) * 370, y: anchorY + Math.floor(index / 2) * rowHeight, width: pending?.width ?? 330, from: targetId, pending: false, aspectRatio: cssRatio };
        intentionallyEmpty.current = false;
        batchNodes.push(node);
        setItems((all) => index === 0 && pending && all.some((item) => item.id === pending.id)
          ? all.map((item) => item.id === pending.id ? { ...item, src, prompt: promptText, pending: false, aspectRatio: cssRatio } : item)
          : [...all, node]);
        setSelected(node.id); setSelectedIds([node.id]);
      };
      setMessage(count > 1 ? `已提交一批 ${count} 张图片，同时生成中…` : "图片生成中…");
      const response = await fetch("/api/image-canvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: promptText, ratio: requestRatio, style: editOverride ? "original" : style, model: modelForRequest, references, count }) });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error || `生图请求失败（${response.status}）。`); }
      if (count > 1) {
        const result = await readImageBatch(response, count, {
          onResult: (src, index) => { addResult(src, index); completedCount += 1; },
          onProgress: (finished) => { setBatchProgress({ current: finished, total: count }); setMessage(`已返回 ${finished} / ${count} 张结果，其他图片仍在生成…`); },
        });
        setMessage(result.errors.length ? `已生成 ${result.completed} / ${count} 张；${result.errors.join("；")} 已成功图片保留。` : `已生成 ${count} 张图片并连入画布，可分别预览和下载。`);
        const rect = viewportRef.current?.getBoundingClientRect();
        if (rect && batchNodes.length) {
          const left = Math.min(...batchNodes.map((node) => node.x)), top = Math.min(...batchNodes.map((node) => node.y));
          const right = Math.max(...batchNodes.map((node) => node.x + node.width)), bottom = Math.max(...batchNodes.map((node) => node.y + rowHeight));
          const zoom = clamp(Math.min((rect.width - 100) / (right - left), (rect.height - 140) / (bottom - top)), minZoom, 1);
          setView({ zoom, x: (rect.width - (right - left) * zoom) / 2 - left * zoom, y: (rect.height - (bottom - top) * zoom) / 2 - top * zoom });
        }
      } else {
        const blob = await response.blob();
        if (!blob.size || !blob.type.startsWith("image/")) throw new Error("生图服务没有返回有效图片。");
        const imageId = localMode ? response.headers.get("x-canvas-image-id") : null;
        const src = imageId ? `/api/image-canvas/output?id=${encodeURIComponent(imageId)}` : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("图片无法读取。")); reader.readAsDataURL(blob);
        });
        addResult(src, 0); completedCount = 1; setBatchProgress({ current: 1, total: 1 });
        setMessage("已生成 1 张图片并连入画布。");
      }
    } catch (error) { setMessage(`已生成 ${completedCount} / ${count} 张；${error instanceof Error ? error.message : "生成失败，请重试。"} 已成功图片保留。`); }
    finally { generationLock.current = false; setBusy(false); void refreshAccount(); }
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
      if (text.trim()) { const id = crypto.randomUUID(); const node: Item = { id, kind: "prompt", prompt: text.trim(), x: 260, y: 250, width: 310 }; setItems((all) => [...all, node]); setSelected(id); setSelectedIds([id]); setMessage("剪贴板文字已作为描述节点添加。"); }
      else setMessage("剪贴板里没有可粘贴的文字或图片。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取剪贴板失败，请尝试 Ctrl+V。"); }
    setContextMenu(null);
  };
  const beginNodeDrag = (event: PointerEvent<HTMLElement>, item: Item) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button,textarea,input,select,a")) return;
    event.preventDefault(); event.stopPropagation(); viewportRef.current?.setPointerCapture(event.pointerId);
    setSelectedEdge(null);
    if (spaceHeld.current) { pointerAction.current = { kind: "pan", pointer: event.pointerId, startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y }; return; }
    const ids = event.shiftKey ? (selectedIds.includes(item.id) ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id]) : selectedIds.includes(item.id) ? selectedIds : [item.id];
    setSelectedIds(ids); setSelected(ids.includes(item.id) ? item.id : ids[0] ?? null);
    if (!ids.includes(item.id)) return;
    dragStartItems.current = items;
    pointerAction.current = { kind: "node", pointer: event.pointerId, startX: event.clientX, startY: event.clientY, positions: Object.fromEntries(items.filter((node) => ids.includes(node.id)).map((node) => [node.id, { x: node.x, y: node.y }])), moved: false };
  };
  const beginPan = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button,textarea,input,select,a,[data-node-type],[data-edge-source],.nodeMenu,.zoomControls")) return;
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.button === 1 || spaceHeld.current) {
      event.preventDefault(); pointerAction.current = { kind: "pan", pointer: event.pointerId, startX: event.clientX, startY: event.clientY, viewX: view.x, viewY: view.y };
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const startX = event.clientX - rect.left, startY = event.clientY - rect.top;
      pointerAction.current = { kind: "marquee", pointer: event.pointerId, startX, startY, additive: event.shiftKey };
      setMarquee({ x: startX, y: startY, width: 0, height: 0 });
      if (!event.shiftKey) { setSelectedIds([]); setSelected(null); }
      setSelectedEdge(null);
    }
  };
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    const action = pointerAction.current; if (!action || action.pointer !== event.pointerId) return;
    if (action.kind === "pan") setView((old) => ({ ...old, x: action.viewX + event.clientX - action.startX, y: action.viewY + event.clientY - action.startY }));
    if (action.kind === "node") {
      if (Math.abs(event.clientX - action.startX) + Math.abs(event.clientY - action.startY) < 3 && !action.moved) return;
      action.moved = true; historyMove.current = true;
      setItems((all) => all.map((item) => action.positions[item.id] ? { ...item, x: action.positions[item.id].x + (event.clientX - action.startX) / view.zoom, y: action.positions[item.id].y + (event.clientY - action.startY) / view.zoom } : item));
    }
    if (action.kind === "marquee") { const rect = viewportRef.current?.getBoundingClientRect(); if (rect) { const x = event.clientX - rect.left, y = event.clientY - rect.top; setMarquee({ x: Math.min(action.startX, x), y: Math.min(action.startY, y), width: Math.abs(x - action.startX), height: Math.abs(y - action.startY) }); } }
    if (action.kind === "connect") { const rect = viewportRef.current?.getBoundingClientRect(); if (rect) setConnectPoint({ id: action.id, x: (event.clientX - rect.left - view.x) / view.zoom, y: (event.clientY - rect.top - view.y) / view.zoom }); }
  };
  const handleUp = (event: PointerEvent<HTMLElement>) => {
    const action = pointerAction.current; if (!action || action.pointer !== event.pointerId) return;
    if (action.kind === "node" && action.moved && dragStartItems.current) {
      undoStack.current = [...undoStack.current.slice(-39), dragStartItems.current]; redoStack.current = []; setMessage(`${Object.keys(action.positions).length} 个节点已移动。`);
    }
    dragStartItems.current = null;
    if (action.kind === "marquee") {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (rect) {
        const endX = event.clientX - rect.left, endY = event.clientY - rect.top;
        const left = Math.min(action.startX, endX) + rect.left, right = Math.max(action.startX, endX) + rect.left;
        const top = Math.min(action.startY, endY) + rect.top, bottom = Math.max(action.startY, endY) + rect.top;
        if (right - left > 4 && bottom - top > 4) {
          const matched = Array.from(viewportRef.current?.querySelectorAll<HTMLElement>("[data-node-type]") ?? []).filter((element) => { const box = element.getBoundingClientRect(); return box.left < right && box.right > left && box.top < bottom && box.bottom > top; }).map((element) => element.dataset.nodeId!).filter(Boolean);
          const next = action.additive ? [...new Set([...selectedIds, ...matched])] : matched;
          setSelectedIds(next); setSelected(next[0] ?? null); setMessage(`已选中 ${next.length} 个节点。拖动其中一个即可一起移动。`);
        }
      }
      setMarquee(null);
    }
    if (action.kind === "connect") {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-node-id][data-port='input']") as HTMLElement | null;
      const targetId = target?.dataset.nodeId;
      if (targetId && targetId !== action.id) {
        const sourceNode = items.find((item) => item.id === action.id);
        const targetNode = items.find((item) => item.id === targetId);
        if (sourceNode?.kind === "image" && sourceNode.src && targetNode?.kind === "prompt") {
          const sources = targetNode.sources ?? [];
          if (sources.includes(sourceNode.id)) setMessage("这张参考图已经连接到描述节点。");
          else if (sources.length >= 4) setMessage("每个描述节点最多连接 4 张参考图。");
          else { setItems((all) => all.map((item) => item.id === targetId ? { ...item, sources: [...sources, sourceNode.id] } : item)); setSelected(targetId); setSelectedIds([targetId]); setMessage(`已加入第 ${sources.length + 1} 张参考图。请描述如何融合，再点击生成图片。`); }
        } else if (sourceNode?.kind === "image" && sourceNode.src && targetNode?.kind === "image" && targetNode.src) {
          const id = crypto.randomUUID();
          const newPrompt: Item = { id, kind: "prompt", prompt: "以图1的空间布局与图2的建筑和材质为参考，融合生成一个完整、连贯的空间场景。", x: Math.max(sourceNode.x + sourceNode.width, targetNode.x + targetNode.width) + 100, y: Math.min(sourceNode.y, targetNode.y), width: 310, sources: [sourceNode.id, targetNode.id] };
          setItems((all) => [...all, newPrompt]); setSelected(id); setSelectedIds([id]); setMessage("两张图片已连接到融合描述节点。修改要求后点击生成图片。");
          const rect = viewportRef.current?.getBoundingClientRect();
          if (rect) setView((old) => ({ ...old, x: rect.width / 2 - (newPrompt.x + 155) * old.zoom, y: rect.height / 2 - (newPrompt.y + 120) * old.zoom }));
        } else { setItems((all) => all.map((item) => item.id === targetId ? { ...item, from: action.id } : item)); setMessage("画布节点已连接。"); }
      } else if (!targetId) {
        const source = items.find((item) => item.id === action.id);
        const rect = viewportRef.current?.getBoundingClientRect();
        if (source && rect && Math.hypot(event.clientX - (source.x + source.width) * view.zoom - view.x - rect.left, event.clientY - (source.y + nodePortY(source)) * view.zoom - view.y - rect.top) > 30) {
          const x = event.clientX - rect.left, y = event.clientY - rect.top;
          setConnectionMenu({ sourceId: source.id, x: clamp(x, 8, Math.max(8, rect.width - 250)), y: clamp(y, 8, Math.max(8, rect.height - 185)), worldX: (x - view.x) / view.zoom, worldY: (y - view.y) / view.zoom });
          setMessage("选择如何从当前节点继续创作。");
        }
      }
      setConnectPoint(null);
    }
    pointerAction.current = null;
  };
  const beginConnection = (event: PointerEvent<HTMLButtonElement>, item: Item) => {
    event.stopPropagation(); setConnectionMenu(null); viewportRef.current?.setPointerCapture(event.pointerId);
    pointerAction.current = { kind: "connect", pointer: event.pointerId, id: item.id };
    const rect = viewportRef.current?.getBoundingClientRect(); if (rect) setConnectPoint({ id: item.id, x: (event.clientX - rect.left - view.x) / view.zoom, y: (event.clientY - rect.top - view.y) / view.zoom });
  };
  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("textarea,input,select")) return;
    event.preventDefault();
    // The canvas follows common design-tool behavior: vertical wheel zooms at
    // the pointer, while Space/Shift or a horizontal trackpad gesture pans.
    const panGesture = spaceHeld.current || event.shiftKey || (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2 && !event.ctrlKey && !event.metaKey);
    if (!panGesture) {
      const rect = event.currentTarget.getBoundingClientRect(); const px = event.clientX - rect.left, py = event.clientY - rect.top;
      const delta = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? rect.height : 1);
      setView((old) => { const zoom = clamp(old.zoom * Math.exp(-delta * .0012), minZoom, maxZoom); return { zoom, x: px - (px - old.x) * zoom / old.zoom, y: py - (py - old.y) * zoom / old.zoom }; });
      return;
    }
    const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 500 : 1;
    setView((old) => ({ ...old, x: old.x - (event.shiftKey ? event.deltaY * scale : event.deltaX * scale), y: old.y - (event.shiftKey ? 0 : event.deltaY * scale) }));
  };
  const zoomBy = (factor: number) => { const rect = viewportRef.current?.getBoundingClientRect(); const px = (rect?.width ?? 900) / 2, py = (rect?.height ?? 650) / 2; setView((old) => { const zoom = clamp(old.zoom * factor, minZoom, maxZoom); return { zoom, x: px - (px - old.x) * zoom / old.zoom, y: py - (py - old.y) * zoom / old.zoom }; }); };
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
  const removeCurrent = () => { if (!current) return; const next = items.filter((item) => item.id !== current.id).map((item) => ({ ...item, ...(item.from === current.id ? { from: undefined } : {}), ...(item.sources ? { sources: item.sources.filter((id) => id !== current.id) } : {}) })); intentionallyEmpty.current = next.length === 0; setItems(next); setSelected(null); setSelectedIds(selectedIds.filter((id) => id !== current.id)); };
  const disconnectEdge = (edge: Edge) => {
    setItems((all) => all.map((item) => item.id !== edge.targetId ? item : edge.kind === "from" ? { ...item, from: item.from === edge.sourceId ? undefined : item.from } : { ...item, sources: item.sources?.filter((id) => id !== edge.sourceId) }));
    setSelectedEdge(null); setContextMenu(null); setMessage("连接线已删除，图片和描述节点仍保留。");
  };
  const removeNode = (id: string) => {
    setItems((all) => { const next = all.filter((item) => item.id !== id).map((item) => ({ ...item, ...(item.from === id ? { from: undefined } : {}), ...(item.sources ? { sources: item.sources.filter((sourceId) => sourceId !== id) } : {}) })); intentionallyEmpty.current = next.length === 0; return next; });
    setSelectedIds((ids) => ids.filter((value) => value !== id)); if (selected === id) setSelected(null);
    setContextMenu(null); setMessage("节点已删除。");
  };
  const duplicateNode = (id: string) => {
    const original = items.find((item) => item.id === id); if (!original) return;
    const copy = { ...original, id: crypto.randomUUID(), x: original.x + 44, y: original.y + 44 };
    setItems((all) => [...all, copy]); setSelected(copy.id); setSelectedIds([copy.id]); setContextMenu(null); setMessage("节点已复制。");
  };
  const continueFromNode = (menu: ConnectionMenu) => {
    const source = items.find((item) => item.id === menu.sourceId); if (!source) return;
    const id = crypto.randomUUID();
    const node: Item = source.kind === "image" && source.src
      ? { id, kind: "prompt", prompt: "以参考图片的空间布局与建筑细节为基础，生成一张新的画面。", x: menu.worldX, y: menu.worldY, width: 310, sources: [source.id] }
      : { id, kind: "image", prompt: "等待生成图片", x: menu.worldX, y: menu.worldY, width: 330, from: source.id, pending: true, aspectRatio: ratio.replace(":", " / ") };
    setItems((all) => [...all, node]); setSelected(id); setSelectedIds([id]); setConnectionMenu(null);
    setMessage(node.kind === "prompt" ? "已把图片作为参考。编辑描述后点击生成图片。" : "已添加图片结果节点。运行描述即可生成图片。");
  };
  const focusNode = (id: string, zoomTo = false) => {
    const item = items.find((node) => node.id === id), rect = viewportRef.current?.getBoundingClientRect();
    if (!item || !rect) return;
    const zoom = zoomTo ? 2 : Math.max(view.zoom, 0.7);
    setView({ zoom, x: rect.width / 2 - (item.x + item.width / 2) * zoom, y: rect.height / 2 - (item.y + 130) * zoom });
    setSelected(id); setSelectedIds([id]); setSelectedEdge(null);
  };
  const applyPromptTemplate = (template: PromptTemplate) => {
    if (current?.kind === "prompt") setItems((all) => all.map((item) => item.id === current.id ? { ...item, prompt: template.text } : item));
    else { const id = crypto.randomUUID(), node: Item = { id, kind: "prompt", prompt: template.text, x: 260, y: 250 + items.length * 35, width: 310 }; setItems((all) => [...all, node]); setSelected(id); setSelectedIds([id]); }
    setMessage(`已应用「${template.title}」，可继续修改描述。`);
  };
  const saveCurrentPrompt = () => {
    if (current?.kind !== "prompt" || !current.prompt.trim()) return;
    const template: PromptTemplate = { id: crypto.randomUUID(), title: current.prompt.trim().slice(0, 18), text: current.prompt.trim(), group: "我的提示词" };
    setCustomPrompts((all) => [...all.slice(-49), template]); setSidebarTab("prompts"); setSidebarOpen(true); setMessage("描述已加入提示词库。");
  };
  const startSpatialWorkflow = () => {
    const space = items.find((item) => item.id === workflowSpaceId && item.src);
    const reference = items.find((item) => item.id === workflowReferenceId && item.src);
    if (!space || !reference || space.id === reference.id) { setMessage("请分别选择两张不同的图片：空间图和参考图。"); return; }
    const templateText: Record<WorkflowTemplate, string> = {
      rebuild: "空间重建：图1空间图只提供房间大小、格局、相机视角、透视及墙地顶和门窗的位置关系，不保留图1的配色、材质、装饰、家具或灯光风格；图2参考图决定全部风格、色彩、材质、光影和物品。在图1的空间尺度中按图2重建完整室内场景，不添加图2没有的大件，保持结构位置、合理接地、遮挡和统一透视。",
      fusion: "溶图融合：图1是空间图，保留其空间结构、装修风格、配色、材质与原有氛围；将图2参考图的主体与物品自然放入图1空间，统一透视、比例、遮挡、接触阴影和光照，不要贴图式拼接。",
      product: "产品置入：图1是目标空间，保留其结构、视角和主要氛围；将图2中的产品或家具作为核心主体放入图1，保持产品造型、材质和比例准确，补齐合理的接触阴影、反射和环境光，画面用于商业空间展示。",
      angles: "同空间多角度：图1确定空间结构、材质和设计语言，图2提供补充细节与参考；生成同一空间的新相机角度，保持建筑结构、家具位置、材质、色温和尺度连续，不改变项目设计。",
    };
    const modeText = templateText[workflowTemplate] ?? (workflowMode === "fusion"
      ? "溶图融合：图1是空间图，保留其空间结构、装修风格、配色、材质与原有氛围；将图2参考图的主体与物品自然放入图1空间，统一透视、比例、遮挡、接触阴影和光照，不要贴图式拼接。"
      : "空间重建：图1空间图只提供空间尺度和透视，图2决定风格与内容。");
    const promptId = crypto.randomUUID(), outputId = crypto.randomUUID();
    const right = Math.max(space.x + space.width, reference.x + reference.width);
    const promptNode: Item = { id: promptId, kind: "prompt", prompt: `${modeText}${workflowNote.trim() ? `\n补充要求：${workflowNote.trim()}` : ""}`, x: right + 110, y: Math.min(space.y, reference.y), width: 340, sources: [space.id, reference.id] };
    const outputNode: Item = { id: outputId, kind: "image", prompt: "等待空间效果图", x: promptNode.x + 440, y: promptNode.y, width: 330, from: promptId, pending: true, aspectRatio: space.aspectRatio ?? ratio.replace(":", " / ") };
    const [width, height] = space.aspectRatio?.split("/").map(Number) ?? [];
    if (width && height) { const choices = ["16:9", "9:16", "4:3", "3:4", "1:1", "3:2", "2:3"]; setRatio(choices.reduce((best, value) => { const [w, h] = value.split(":").map(Number); const [bw, bh] = best.split(":").map(Number); return Math.abs(w / h - width / height) < Math.abs(bw / bh - width / height) ? value : best; })); }
    setItems((all) => [...all, promptNode, outputNode]); setSelected(promptId); setSelectedIds([promptId]);
    const rect = viewportRef.current?.getBoundingClientRect(); if (rect) setView((old) => ({ ...old, x: rect.width / 2 - (promptNode.x + 170) * old.zoom, y: rect.height / 2 - (promptNode.y + 130) * old.zoom }));
    const templateName = { rebuild: "空间重建", fusion: "溶图融合", product: "产品置入", angles: "同空间多角度" }[workflowTemplate];
    setMessage(`已创建${templateName}工作流。确认描述后点击生成图片。`);
  };
  const continueFromImage = (item: Item) => {
    if (!item.src) return;
    const promptId = crypto.randomUUID(), outputId = crypto.randomUUID();
    const nextPrompt: Item = { id: promptId, kind: "prompt", prompt: "延续参考图的空间、材质、光影和设计语言，生成一张连续的新画面。", x: item.x + item.width + 100, y: item.y, width: 330, sources: [item.id] };
    const output: Item = { id: outputId, kind: "image", prompt: "等待继续生成", x: nextPrompt.x + 430, y: item.y, width: 330, from: promptId, pending: true, aspectRatio: item.aspectRatio ?? ratio.replace(":", " / ") };
    setItems((all) => [...all, nextPrompt, output]); setSelected(promptId); setSelectedIds([promptId]); setMessage("已建立继续生图流程，修改描述后即可生成。");
  };
  const useAsReference = (item: Item) => {
    if (!item.src) return;
    const promptNode = currentPromptNode;
    if (promptNode) {
      setItems((all) => all.map((node) => node.id === promptNode.id ? { ...node, sources: Array.from(new Set([...(node.sources ?? []), item.id])).slice(0, 4) } : node));
      setSelected(promptNode.id); setSelectedIds([promptNode.id]); setMessage("图片已加入当前描述的参考图。");
    } else continueFromImage(item);
  };
  const downloadNode = (item: Item) => {
    const href = item.src || URL.createObjectURL(new Blob([item.prompt], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = href; link.download = `after-now-${item.kind}-${item.id}.${item.src ? "png" : "txt"}`; link.click();
    if (!item.src) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setMessage(item.src ? "图片已开始下载。" : "描述文本已开始下载。");
  };
  const exportNode = (item: Item) => {
    const href = URL.createObjectURL(new Blob([JSON.stringify(item, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = href; link.download = `after-now-node-${item.id}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000); setMessage("节点数据已导出。");
  };
  const copyNodeContent = async (item: Item) => {
    try {
      if (item.src) {
        const image = new Image(); image.src = item.src; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d"); if (!context) throw new Error("无法复制图片"); context.drawImage(image, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("无法复制图片")), "image/png"));
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); setMessage("图片已复制到剪贴板。");
      } else { await navigator.clipboard.writeText(item.prompt); setMessage("描述已复制到剪贴板。"); }
    } catch { setMessage("浏览器未允许复制图片，请使用下载按钮。"); }
  };
  const cropCurrentImage = async () => {
    if (!current?.src) return;
    try {
      const image = new Image(); image.src = current.src; await image.decode();
      const [rw, rh] = cropRatio.split(":").map(Number), target = rw / rh;
      let width = image.naturalWidth, height = image.naturalHeight;
      if (width / height > target) width = Math.round(height * target); else height = Math.round(width / target);
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d"); if (!context) throw new Error();
      context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2, width, height, 0, 0, width, height);
      const id = current.id, src = canvas.toDataURL("image/png");
      setItems((all) => all.map((item) => item.id === id ? { ...item, src, aspectRatio: `${rw} / ${rh}` } : item));
      setToolbarMenu(null); setMessage(`图片已居中裁切为 ${cropRatio}；可以用 Ctrl+Z 撤销。`);
    } catch { setMessage("图片无法裁切，请先下载后重新导入。"); }
  };
  const downloadUpscaledImage = async () => {
    if (!current?.src) return;
    try {
      setMessage(`正在生成 ${upscaleFactor}× 高清图片…`);
      const image = new Image(); image.src = current.src; await image.decode();
      const maxPixels = 32_000_000;
      const requestedPixels = image.naturalWidth * upscaleFactor * image.naturalHeight * upscaleFactor;
      if (requestedPixels > maxPixels) throw new Error("图片放大后尺寸过大，请改用 2×。 ");
      let source: CanvasImageSource = image;
      let width = image.naturalWidth, height = image.naturalHeight;
      for (let step = 2; step <= upscaleFactor; step *= 2) {
        const canvas = document.createElement("canvas"); canvas.width = width * 2; canvas.height = height * 2;
        const context = canvas.getContext("2d"); if (!context) throw new Error("浏览器无法处理图片。");
        context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        source = canvas; width = canvas.width; height = canvas.height;
      }
      const output = source as HTMLCanvasElement;
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob((value) => value ? resolve(value) : reject(new Error("高清图片导出失败。")), "image/png"));
      const href = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = href; link.download = `after-now-${current.id}-${upscaleFactor}x-${width}x${height}.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000); setToolbarMenu(null);
      setMessage(`已导出 ${width} × ${height} 高清图片；不消耗生图次数。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "高清放大失败，请重试。"); }
  };
  const arrangeSelected = () => {
    const chosen = items.filter((item) => selectedIds.includes(item.id)); if (chosen.length < 2) return;
    const columns = Math.ceil(Math.sqrt(chosen.length)); const left = Math.min(...chosen.map((item) => item.x)), top = Math.min(...chosen.map((item) => item.y));
    const positions = new Map(chosen.map((item, index) => [item.id, { x: left + index % columns * 390, y: top + Math.floor(index / columns) * 390 }]));
    setItems((all) => all.map((item) => positions.has(item.id) ? { ...item, ...positions.get(item.id)! } : item)); setMessage(`${chosen.length} 个节点已排成网格。`);
  };
  const saveCanvas = () => { try { localStorage.setItem(storageKey, JSON.stringify({ items, view, ratio, savedAssetIds, customPrompts, intentionallyEmpty: intentionallyEmpty.current })); setMessage("画布已保存在当前浏览器。"); } catch { setMessage("浏览器存储空间不足，请下载重要图片后移除部分图片。"); } };
  const dismissReleaseNotice = () => { try { localStorage.setItem(releaseNoticeKey, releaseNoticeVersion); } catch {} setShowReleaseNotice(false); };
  const createBlankCanvas = (label = "新建画布") => {
    if (items.length && !window.confirm(`${label}会清除当前画布上的节点和连线。已下载的图片不会受影响，是否继续？`)) return;
    intentionallyEmpty.current = true; undoStack.current = []; redoStack.current = [];
    setItems([]); setSelected(null); setSelectedIds([]); setSelectedEdge(null); setSavedAssetIds([]);
    setView({ x: 70, y: 54, zoom: 0.88 }); setToolbarMenu(null); setContextMenu(null); setConnectionMenu(null);
    setWorkflowSpaceId(""); setWorkflowReferenceId(""); setWorkflowNote(""); setSidebarTab("canvas");
    try { localStorage.setItem(storageKey, JSON.stringify({ items: [], view: { x: 70, y: 54, zoom: 0.88 }, ratio, savedAssetIds: [], customPrompts, intentionallyEmpty: true })); } catch {}
    setMessage("新的空白画布已建立，自动保存仍然开启。");
  };
  const edges = items.flatMap((item) => [
    ...(item.from ? [{ sourceId: item.from, targetId: item.id, kind: "from" as const }] : []),
    ...(item.sources ?? []).map((sourceId) => ({ sourceId, targetId: item.id, kind: "reference" as const })),
  ].map((edge) => ({ ...edge, target: item, source: items.find((source) => source.id === edge.sourceId) }))).filter((edge): edge is Edge & { target: Item; source: Item } => Boolean(edge.source));
  const nodePortY = (item: Item) => { if (item.kind === "prompt") return 125; if (item.kind === "text") return 62; const [width, height] = item.aspectRatio?.split("/").map(Number) ?? [4, 3]; const imageHeight = (item.width - 18) * height / width; return 43 + (item.src ? imageHeight : Math.max(190, imageHeight)) / 2; };
  const pathBetween = (source: Item, target: Item) => { const x1 = source.x + source.width, y1 = source.y + nodePortY(source), x2 = target.x, y2 = target.y + nodePortY(target), bend = Math.max(60, (x2 - x1) * .5); return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`; };

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link className={styles.brand} href="/#lab" aria-label="返回 After Now 实验室"><span className={styles.brandMark}>A</span><span><strong>AFTER NOW</strong><small>IMAGE WORKSPACE</small></span></Link>
      <div className={styles.projectTitle}><span className={styles.liveDot} />图像创作画布 <span className={styles.projectDivider}>/</span> 未命名项目</div>
      <div className={styles.headerActions}><span className={styles.saveState}>● 自动保存</span><button onClick={() => createBlankCanvas("新建画布")}>＋ 新建画布</button><button onClick={saveCanvas}>保存画布</button><details className={styles.profile}><summary aria-label={user ? "账号信息" : "登录或注册"}>{user ? user.email.slice(0, 1).toUpperCase() : "访"}</summary><div>{localMode ? <p>{authMessage}</p> : user ? <><p>{user.email}</p><p>今日剩余 {quota?.remaining ?? "—"} / {quota?.userLimit ?? "—"} 次</p><button onClick={() => accountAction("logout")}>退出登录</button></> : <form className={styles.profileForm} onSubmit={(event) => { event.preventDefault(); void accountAction("login"); }}><strong>登录以启用生图</strong><label>邮箱<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>密码<input type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label><div className={styles.authActions}><button disabled={authBusy} type="submit">{authBusy ? "请稍候…" : "登录"}</button><button disabled={authBusy || !email || loginPassword.length < 8} type="button" onClick={() => void accountAction("signup")}>注册</button></div><p role="status">{authMessage}</p></form>}</div></details></div>
    </header>
    <div className={`${styles.workspace} ${sidebarOpen ? "" : styles.workspaceSidebarClosed}`}>
      <aside className={`${styles.librarySidebar} ${sidebarOpen ? "" : styles.librarySidebarClosed}`} aria-label="画布资料与工作流">
        <div className={styles.libraryTop}><strong>{sidebarOpen ? "创作资源" : ""}</strong><button aria-label={sidebarOpen ? "收起左侧面板" : "展开左侧面板"} title={sidebarOpen ? "收起左侧面板" : "展开左侧面板"} onClick={() => setSidebarOpen((value) => !value)}>{sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</button></div>
        {sidebarOpen && <><div className={styles.libraryTabs} role="tablist" aria-label="左侧面板分类">{([['canvas', '画布'], ['assets', '资产'], ['prompts', '提示词'], ['workflow', '工作流']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={sidebarTab === id} className={sidebarTab === id ? styles.libraryTabActive : ""} onClick={() => { setSidebarTab(id); setSidebarSearch(""); }}>{label}</button>)}</div>
          {sidebarTab !== "workflow" && <label className={styles.librarySearch}><Search size={15} /><input value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} placeholder={sidebarTab === "canvas" ? "搜索节点" : sidebarTab === "assets" ? "搜索图片" : "搜索提示词"} /></label>}
          <div className={styles.libraryScroll}>
            {sidebarTab === "canvas" && <><div className={styles.librarySectionHeading}><span>画布节点 · {items.length}</span><button onClick={() => addNode("prompt")}>＋</button></div>{items.filter((item) => !sidebarSearch || item.prompt.toLowerCase().includes(sidebarSearch.toLowerCase()) || item.kind.includes(sidebarSearch.toLowerCase())).map((item) => <button className={`${styles.libraryRow} ${selected === item.id ? styles.libraryRowActive : ""}`} key={item.id} onClick={() => focusNode(item.id)}>{item.kind === "image" ? <ImageIcon size={16} /> : item.kind === "text" ? <Type size={16} /> : <FileText size={16} />}<span><strong>{item.kind === "image" ? "图片图层" : item.kind === "text" ? "文字图层" : "描述"}</strong><small>{item.prompt || "未命名节点"}</small></span></button>)}<div className={styles.workflowTeaser}><strong>空间场景工作流</strong><p>指定空间图与参考图，建立双图生图流程。</p><button onClick={() => setSidebarTab("workflow")}>打开工作流 ↗</button></div></>}
            {sidebarTab === "assets" && <><div className={styles.librarySectionHeading}><span>画布图片 · {items.filter((item) => item.kind === "image" && item.src).length}</span><button onClick={() => imageInputRef.current?.click()}>导入</button></div>{items.filter((item) => item.kind === "image" && item.src && (!sidebarSearch || item.prompt.toLowerCase().includes(sidebarSearch.toLowerCase()))).sort((a, b) => Number(savedAssetIds.includes(b.id)) - Number(savedAssetIds.includes(a.id))).map((item) => <button className={`${styles.libraryRow} ${selected === item.id ? styles.libraryRowActive : ""}`} key={item.id} onClick={() => focusNode(item.id)}><img src={item.src} alt="" /><span><strong>{savedAssetIds.includes(item.id) ? "★ " : ""}{item.prompt || "未命名图片"}</strong><small>点击定位到画布</small></span></button>)}{!items.some((item) => item.kind === "image" && item.src) && <p className={styles.libraryEmpty}>还没有图片。导入图片后会出现在这里。</p>}</>}
            {sidebarTab === "prompts" && <><div className={styles.librarySectionHeading}><span>提示词库</span><button disabled={current?.kind !== "prompt"} onClick={saveCurrentPrompt}>保存当前</button></div>{[...customPrompts, ...starterPrompts].filter((item) => !sidebarSearch || `${item.title} ${item.text} ${item.group}`.toLowerCase().includes(sidebarSearch.toLowerCase())).map((template) => <button className={styles.promptLibraryRow} key={template.id} onClick={() => applyPromptTemplate(template)}><small>{template.group}</small><strong>{template.title}</strong><span>{template.text}</span></button>)}</>}
            {sidebarTab === "workflow" && <div className={styles.workflowForm}><small>一键工作流模板</small><h3>选择要完成的任务</h3><div className={styles.workflowTemplates}>{([{ id: "rebuild", name: "空间重建", note: "空间尺度 × 参考风格" }, { id: "fusion", name: "溶图融合", note: "保留原空间装修" }, { id: "product", name: "产品置入", note: "家具产品场景化" }, { id: "angles", name: "同空间多角度", note: "保持项目连续性" }] as const).map((template) => <button key={template.id} className={workflowTemplate === template.id ? styles.workflowTemplateActive : ""} onClick={() => { setWorkflowTemplate(template.id); setWorkflowMode(template.id === "fusion" ? "fusion" : "rebuild"); }}><strong>{workflowTemplate === template.id ? "✓ " : ""}{template.name}</strong><small>{template.note}</small></button>)}</div><p>模型按顺序读取：图1 是空间或底图，图2 是风格、产品或补充参考。</p><label>图1 · 空间/底图<select value={workflowSpaceId} onChange={(event) => setWorkflowSpaceId(event.target.value)}><option value="">请选择图1</option>{items.filter((item) => item.kind === "image" && item.src).map((item) => <option key={item.id} value={item.id}>{item.prompt || item.id.slice(0, 8)}</option>)}</select></label><label>图2 · 参考/产品<select value={workflowReferenceId} onChange={(event) => setWorkflowReferenceId(event.target.value)}><option value="">请选择图2</option>{items.filter((item) => item.kind === "image" && item.src).map((item) => <option key={item.id} value={item.id}>{item.prompt || item.id.slice(0, 8)}</option>)}</select></label><label>补充要求（可选）<textarea value={workflowNote} onChange={(event) => setWorkflowNote(event.target.value)} placeholder="例如：保留参考图的木质家具与暖光" /></label><button className={styles.workflowStart} disabled={!workflowSpaceId || !workflowReferenceId || workflowSpaceId === workflowReferenceId} onClick={startSpatialWorkflow}>建立所选工作流 ↗</button><p className={styles.workflowFootnote}>建立节点不会消耗生图次数；确认描述并点击生成后才会请求模型。</p></div>}
          </div></>}
      </aside>
      <section className={styles.canvasArea} aria-label="无限创作画布" onContextMenu={(event) => {
        const target = event.target as Element;
        if (target.closest("[data-canvas-context-menu],textarea,input,a")) return;
        const edgeHit = target.closest<SVGPathElement>("[data-edge-source]");
        const node = target.closest<HTMLElement>("[data-node-type]");
        if (!edgeHit && !node && target.closest("button")) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const menuTarget: CanvasMenu["target"] = edgeHit ? { kind: "edge", edge: { sourceId: edgeHit.dataset.edgeSource!, targetId: edgeHit.dataset.edgeTarget!, kind: edgeHit.dataset.edgeKind as Edge["kind"] } } : node ? { kind: "node", id: node.dataset.nodeId! } : { kind: "canvas" };
        if (menuTarget.kind === "edge") { setSelectedEdge(menuTarget.edge); setSelectedIds([]); setSelected(null); }
        if (menuTarget.kind === "node") { setSelected(node!.dataset.nodeId!); setSelectedIds([node!.dataset.nodeId!]); setSelectedEdge(null); }
        if (menuTarget.kind === "canvas") { setSelectedEdge(null); setSelectedIds([]); setSelected(null); }
        setContextMenu({ x: clamp(event.clientX - rect.left, 8, Math.max(8, rect.width - 302)), y: clamp(event.clientY - rect.top, 8, Math.max(8, rect.height - 230)), target: menuTarget }); setShowNodeMenu(false);
      }}>
        <nav className={styles.rail} aria-label="画布工具">
          <button aria-label="添加创作节点" title="添加创作节点" onClick={() => setShowNodeMenu((value) => !value)}>＋</button>
          <button aria-label="导入图片" title="导入图片" onClick={() => imageInputRef.current?.click()}>图片</button>
          <button aria-label={current?.kind === "image" ? "提取图片文字" : "添加文字图层"} title={current?.kind === "image" ? "提取图片文字" : "添加可编辑文字"} onClick={() => { if (current?.kind === "image") { setOcrLines([]); setOcrMessage(""); setToolbarMenu("editText"); } else addNode("text"); }}><Type size={16} /></button>
          <button aria-label="自动整理画布" title="整理画布" onClick={fitView}>整理</button>
          <button aria-label="保存画布" title="保存画布" onClick={saveCanvas}>存档</button>
        </nav>
        {showNodeMenu && <div className={styles.nodeMenu}><small>添加到画布</small><button onClick={() => addNode("prompt")}>画面描述节点</button><button onClick={() => { setShowNodeMenu(false); imageInputRef.current?.click(); }}>导入图片节点</button><button onClick={() => addNode("image")}>空白图片节点</button><button onClick={() => addNode("text")}>可编辑文字图层</button></div>}
        {contextMenu && <div className={styles.contextMenu} data-canvas-context-menu style={{ left: contextMenu.x, top: contextMenu.y }} role="menu">
          {contextMenu.target.kind === "edge" ? <><small>连接线</small><button role="menuitem" onClick={() => disconnectEdge(contextMenu.target.kind === "edge" ? contextMenu.target.edge : selectedEdge!)}>断开连接 <kbd>Del</kbd></button></> : contextMenu.target.kind === "node" ? <><small>节点</small><button role="menuitem" onClick={() => contextMenu.target.kind === "node" && duplicateNode(contextMenu.target.id)}>复制节点</button><button role="menuitem" onClick={() => contextMenu.target.kind === "node" && removeNode(contextMenu.target.id)}>删除节点 <kbd>Del</kbd></button></> : <>
            <button role="menuitem" onClick={() => { setContextMenu(null); imageInputRef.current?.click(); }}>上传图片</button>
            <button role="menuitem" onClick={() => { setContextMenu(null); addNode("prompt"); }}>添加描述节点</button>
            <button role="menuitem" onClick={() => createBlankCanvas("清空画布")}>清空画布</button>
            <hr />
            <button role="menuitem" disabled={!undoStack.current.length} onClick={() => { setContextMenu(null); undo(); }}>撤销 <kbd>Ctrl Z</kbd></button>
            <button role="menuitem" disabled={!redoStack.current.length} onClick={() => { setContextMenu(null); redo(); }}>重做 <kbd>Ctrl Shift Z</kbd></button>
            <hr />
            <button role="menuitem" onClick={() => void pasteFromClipboard()}>粘贴 <kbd>Ctrl V</kbd></button>
          </>}
        </div>}
        {connectionMenu && <div className={styles.connectionMenu} data-connection-menu style={{ left: connectionMenu.x, top: connectionMenu.y }} role="menu">
          <small>从此节点继续创作</small>
          <button role="menuitem" onClick={() => continueFromNode(connectionMenu)}>{items.find((item) => item.id === connectionMenu.sourceId)?.src ? "参考这张图继续生图" : "创建图片结果节点"} <span>↗</span></button>
          <button role="menuitem" onClick={() => setConnectionMenu(null)}>取消</button>
        </div>}
        <div ref={viewportRef} className={styles.viewport} onPointerDown={beginPan} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp} onWheel={handleWheel}>
          <div className={styles.infiniteGrid} />
          {marquee && <div className={styles.marquee} style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}
          <div className={styles.world} style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})` }}>
            <svg className={styles.edges} width="3200" height="2400" aria-hidden="true">
              {edges.map((edge) => <g key={`${edge.kind}-${edge.sourceId}-${edge.targetId}`}>
                <path className={selectedEdge?.sourceId === edge.sourceId && selectedEdge?.targetId === edge.targetId && selectedEdge.kind === edge.kind ? styles.selectedEdge : ""} d={pathBetween(edge.source, edge.target)} />
                <path className={styles.edgeHit} data-edge-source={edge.sourceId} data-edge-target={edge.targetId} data-edge-kind={edge.kind} aria-label="连接线，右键可断开" d={pathBetween(edge.source, edge.target)} onClick={(event) => { event.stopPropagation(); setSelectedEdge(edge); setSelectedIds([]); setSelected(null); }} />
              </g>)}
              {connectPoint && (() => { const source = items.find((item) => item.id === connectPoint.id); const portY = source ? nodePortY(source) : 0; return source ? <path className={styles.draftEdge} d={`M ${source.x + source.width} ${source.y + portY} C ${source.x + source.width + 80} ${source.y + portY}, ${connectPoint.x - 80} ${connectPoint.y}, ${connectPoint.x} ${connectPoint.y}`} /> : null; })()}
            </svg>
              {items.map((item) => <article key={item.id} data-node-id={item.id} data-node-type={item.kind} className={`${styles.node} ${item.kind === "prompt" ? styles.promptNode : item.kind === "text" ? styles.textNode : styles.imageNode} ${selectedIds.includes(item.id) ? styles.selectedNode : ""}`} style={{ left: item.x, top: item.y, width: item.width }} onPointerDown={(event) => beginNodeDrag(event, item)}>
              {item.kind !== "text" && <div className={styles.nodeHeader}><span className={`${styles.nodeTypeDot} ${item.kind === "image" ? styles.imageTypeDot : ""}`} />{item.kind === "prompt" ? "画面描述" : "图像结果"}<span className={styles.nodeStatus}>{item.pending ? "等待生成" : item.src ? "已完成" : "素材"}</span><button className={styles.nodeMore} aria-label="删除此节点" onClick={(event) => { event.stopPropagation(); const next = items.filter((node) => node.id !== item.id).map((node) => ({ ...node, ...(node.from === item.id ? { from: undefined } : {}), ...(node.sources ? { sources: node.sources.filter((id) => id !== item.id) } : {}) })); intentionallyEmpty.current = next.length === 0; setItems(next); if (selected === item.id) setSelected(null); }}>×</button></div>}
              {item.kind === "prompt" ? <div className={styles.promptSurface}><small>IMAGE PROMPT</small>{Boolean(item.sources?.length) && <div className={styles.referenceStrip}>{item.sources?.map((id, index) => { const reference = items.find((node) => node.id === id); return reference?.src ? <span key={id}><img src={reference.src} alt={`参考图 ${index + 1}`} /><b>图{index + 1}</b><button aria-label={`移除参考图 ${index + 1}`} title="取消这张参考图" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setItems((all) => all.map((node) => node.id === item.id ? { ...node, sources: node.sources?.filter((sourceId) => sourceId !== id) } : node)); }}>×</button></span> : null; })}<small>参考图片</small></div>}<textarea aria-label="画面描述" value={item.prompt} placeholder="写下你想生成的画面…" onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setItems((all) => all.map((node) => node.id === item.id ? { ...node, prompt: event.target.value } : node))} /><button onClick={(event) => { event.stopPropagation(); setSelected(item.id); void generate(item.id); }} disabled={busy || !canGenerate}>{busy ? `生成 ${batchProgress.current}/${batchProgress.total}…` : `生成 ${imageCount} 张 ↗`}</button></div> : item.kind === "text" ? <div className={styles.textSurface}><textarea aria-label="编辑画布文字" value={item.prompt} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setItems((all) => all.map((node) => node.id === item.id ? { ...node, prompt: event.target.value } : node))} style={{ fontSize: `${item.fontSize ?? 32}px`, fontFamily: item.fontFamily ?? "Arial, sans-serif", color: item.color ?? "#f1f3ef", textAlign: item.textAlign ?? "left", fontWeight: item.fontWeight ?? 400 }} /></div> : <div className={styles.imageSurface}>
              {item.src ? <img src={item.src} alt={item.prompt || "生成的图像"} draggable={false} style={item.aspectRatio ? { aspectRatio: item.aspectRatio } : undefined} onLoad={(event) => { if (!item.aspectRatio) { const value = `${event.currentTarget.naturalWidth} / ${event.currentTarget.naturalHeight}`; setItems((all) => all.map((node) => node.id === item.id ? { ...node, aspectRatio: value } : node)); } }} /> : <div className={styles.imagePlaceholder} style={{ aspectRatio: item.aspectRatio ?? "4 / 3" }}><span>{item.pending ? "生成结果将出现在这里" : "导入或生成一张图片"}</span></div>}
                <footer><span>{item.prompt || "未命名图像"}</span>{item.src && <a href={item.src} download={`after-now-${item.id}.png`} onPointerDown={(event) => event.stopPropagation()}>下载 ↓</a>}</footer>
              </div>}
              <button className={`${styles.port} ${styles.inputPort}`} style={{ top: nodePortY(item) }} data-port="input" data-node-id={item.id} aria-label="连接输入" title="连接输入" onPointerDown={(event) => event.stopPropagation()} />
              <button className={`${styles.port} ${styles.outputPort}`} style={{ top: nodePortY(item) }} data-port="output" data-node-id={item.id} aria-label="拖动连接到其他节点" title={item.kind === "image" ? "拖到另一张图片或描述节点左侧圆点，作为生图参考" : "拖动到另一个节点以连接"} onPointerDown={(event) => beginConnection(event, item)} />
            </article>)}
            {!items.length && <div className={styles.emptyCanvas}><h2>从一个想法开始</h2><p>添加描述节点或导入图片，组成你的创作流程。两张图片可用右侧圆点连接，再参考生图。</p><button onClick={() => addNode("prompt")}>添加描述节点</button></div>}
          </div>
        </div>
        <div className={`${styles.floatingToolbar} ${current ? styles.nodeToolbar : ""}`}>
          {current ? <>
            <button title="节点信息" aria-label="节点信息" onClick={() => setToolbarMenu(toolbarMenu === "info" ? null : "info")}><Info size={17} /></button>
            <button title="删除节点" aria-label="删除节点" onClick={() => removeNode(current.id)}><Trash2 size={17} /></button>
            <button title="标记到资产" aria-label="标记到资产" disabled={!current.src} onClick={() => setSavedAssetIds((ids) => ids.includes(current.id) ? ids.filter((id) => id !== current.id) : [...ids, current.id])}>{savedAssetIds.includes(current.id) ? <Check size={17} /> : <FolderPlus size={17} />}</button>
            <button title="下载节点" aria-label="下载节点" onClick={() => downloadNode(current)}><Download size={17} /></button>
            <button title="复制节点" aria-label="复制节点" onClick={() => duplicateNode(current.id)}><Copy size={17} /></button>
            <button title="复制图片或描述" aria-label="复制图片或描述" onClick={() => void copyNodeContent(current)}><FileText size={17} /></button>
            <button title="导出节点数据" aria-label="导出节点数据" onClick={() => exportNode(current)}><Share2 size={17} /></button>
            <button title="下一次生成的风格" aria-label="下一次生成的风格" onClick={() => setToolbarMenu(toolbarMenu === "style" ? null : "style")}><Paintbrush size={17} /></button>
            <button title="居中裁切图片" aria-label="居中裁切图片" disabled={!current.src} onClick={() => setToolbarMenu(toolbarMenu === "crop" ? null : "crop")}><Scissors size={17} /></button>
            {current.kind === "image" && <>
              <button title="橡皮工具" aria-label="橡皮工具" disabled={!current.src} onClick={() => setAssetEditor("erase")}><Eraser size={17} /></button>
              <button title="手动拆分图层" aria-label="手动拆分图层" disabled={!current.src} onClick={() => setAssetEditor("split")}><Layers2 size={17} /></button>
              <button title="提取图片文字" aria-label="提取图片文字" disabled={!current.src} onClick={() => { setOcrLines([]); setOcrMessage(""); setToolbarMenu("editText"); }}><Type size={17} /></button>
            </>}
            {current.kind === "text" && <>
              <button title="文字样式" aria-label="文字样式" onClick={() => setToolbarMenu(toolbarMenu === "text" ? null : "text")}><Type size={17} /></button>
              <button title="左对齐" aria-label="左对齐" onClick={() => setItems((all) => all.map((item) => item.id === current.id ? { ...item, textAlign: "left" } : item))}><AlignLeft size={17} /></button>
              <button title="居中对齐" aria-label="居中对齐" onClick={() => setItems((all) => all.map((item) => item.id === current.id ? { ...item, textAlign: "center" } : item))}><AlignCenter size={17} /></button>
              <button title="右对齐" aria-label="右对齐" onClick={() => setItems((all) => all.map((item) => item.id === current.id ? { ...item, textAlign: "right" } : item))}><AlignRight size={17} /></button>
            </>}
            <button title="免费高清放大" aria-label="免费高清放大" disabled={!current.src} onClick={() => setToolbarMenu(toolbarMenu === "upscale" ? null : "upscale")}><ZoomIn size={17} /></button>
            <button title="选中节点排成网格" aria-label="选中节点排成网格" disabled={selectedIds.length < 2} onClick={arrangeSelected}><Grid2X2 size={17} /></button>
            <button title="放大并定位节点" aria-label="放大并定位节点" onClick={() => focusNode(current.id, true)}><ZoomIn size={17} /></button>
            <button title="预览图片" aria-label="预览图片" onClick={() => current.src ? setPreviewId(current.id) : focusNode(current.id, true)}><Expand size={17} /></button>
            <button title="更多节点操作" aria-label="更多节点操作" onClick={() => setToolbarMenu(toolbarMenu === "more" ? null : "more")}><Ellipsis size={17} /></button>
          </> : <><button onClick={() => setShowNodeMenu((value) => !value)}><b>＋</b>添加节点</button><i /><button onClick={fitView}>整理画布</button><i /><button disabled={busy || !activePrompt.trim() || !canGenerate} onClick={() => void generate()}>{busy ? `生成 ${batchProgress.current}/${batchProgress.total}…` : `▶ 生成 ${imageCount} 张`}</button><span className={styles.toolbarMode}><span className={styles.liveDot} />拖出选框 · 空格拖动画布</span></>}
        </div>
        {current && toolbarMenu && <div className={styles.nodeToolPanel}>
          {toolbarMenu === "info" && <><strong>{current.kind === "image" ? "图片图层" : current.kind === "text" ? "文字图层" : "描述节点"}</strong><p>{current.kind === "image" ? current.src ? "已生成或导入" : "等待生成" : `${current.prompt.length} 字符`}</p><p>连接：{edges.filter((edge) => edge.sourceId === current.id || edge.targetId === current.id).length} 条</p></>}
          {toolbarMenu === "style" && <><strong>下一次生成的视觉方向</strong>{([['after', '实验视觉'], ['photo', '电影摄影'], ['original', '原始描述']] as const).map(([value, label]) => <button key={value} onClick={() => { setStyle(value); setToolbarMenu(null); setMessage(`已选择${label}。`); }}>{style === value ? "✓ " : ""}{label}</button>)}</>}
          {toolbarMenu === "crop" && <><strong>图片居中裁切</strong><select value={cropRatio} onChange={(event) => setCropRatio(event.target.value)}><option value="1:1">1:1 方形</option><option value="16:9">16:9 横图</option><option value="9:16">9:16 竖图</option><option value="4:3">4:3 横图</option><option value="3:4">3:4 竖图</option></select><button onClick={() => void cropCurrentImage()}>应用裁切</button></>}
          {toolbarMenu === "editText" && current.kind === "image" && <><strong>提取并修改图片文字</strong><p>识别整张图片上的文字，逐项改好后，直接调用网站的 FLUX.2 Klein 参考图生图，生成一张新图片；无需启动本机 OCR 或 IOPaint。</p><button onClick={() => void recognizeImageText(current)} disabled={ocrBusy || textReplaceBusy}>{ocrBusy ? "正在识别…" : "识别整张图片"}</button>{ocrMessage && <small className={styles.ocrMessage}>{ocrMessage}</small>}{ocrLines.length > 0 && <><div className={styles.ocrResults}>{ocrLines.map((line, index) => <label key={`${index}-${line.originalText ?? line.text}`}><span>文字 {index + 1}{line.score !== null ? ` · ${Math.round(line.score * 100)}%` : ""}</span><textarea value={line.text} onChange={(event) => setOcrLines((all) => all.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: event.target.value } : entry))} /></label>)}</div><button onClick={() => void generateOcrTextEdit(current)} disabled={busy || textReplaceBusy || !canGenerate}>AI 重绘并替换全部文字 ↗</button><button onClick={() => addOcrTextLayers(current)} disabled={textReplaceBusy}>复制到右侧并拆分文字</button><small className={styles.ocrFootnote}>原图保留；右侧会复制底图并按识别位置放置独立文字层，文字层不连线。AI 重绘会消耗一次网站生图额度。</small></>}</>}
          {toolbarMenu === "text" && current.kind === "text" && <><strong>文字排版</strong><label className={styles.textSetting}>字体<select value={current.fontFamily ?? "Arial, Microsoft YaHei, sans-serif"} onChange={(event) => setItems((all) => all.map((item) => item.id === current.id ? { ...item, fontFamily: event.target.value } : item))}><option value="Arial, Microsoft YaHei, sans-serif">无衬线</option><option value="Georgia, Microsoft YaHei, serif">衬线</option><option value="Microsoft YaHei, sans-serif">微软雅黑</option><option value="SimSun, serif">宋体</option></select></label><label className={styles.textSetting}>字号<input type="number" min="8" max="160" value={current.fontSize ?? 32} onChange={(event) => setItems((all) => all.map((item) => item.id === current.id ? { ...item, fontSize: clamp(Number(event.target.value) || 8, 8, 160) } : item))} /></label><label className={styles.textSetting}>文字颜色<input type="color" value={current.color ?? "#f1f3ef"} onChange={(event) => setItems((all) => all.map((item) => item.id === current.id ? { ...item, color: event.target.value } : item))} /></label><label className={styles.textSetting}>字重<select value={current.fontWeight ?? 400} onChange={(event) => setItems((all) => all.map((item) => item.id === current.id ? { ...item, fontWeight: Number(event.target.value) } : item))}><option value="400">常规</option><option value="600">半粗</option><option value="700">粗体</option></select></label><div className={styles.textAlignChoices}><span>对齐</span><button aria-label="左对齐" aria-pressed={(current.textAlign ?? "left") === "left"} onClick={() => setItems((all) => all.map((item) => item.id === current.id ? { ...item, textAlign: "left" } : item))}><AlignLeft size={16} /></button><button aria-label="居中对齐" aria-pressed={current.textAlign === "center"} onClick={() => setItems((all) => all.map((item) => item.id === current.id ? { ...item, textAlign: "center" } : item))}><AlignCenter size={16} /></button><button aria-label="右对齐" aria-pressed={current.textAlign === "right"} onClick={() => setItems((all) => all.map((item) => item.id === current.id ? { ...item, textAlign: "right" } : item))}><AlignRight size={16} /></button></div></>}
          {toolbarMenu === "upscale" && <><strong>免费高清放大</strong><p>在浏览器中导出更大的 PNG，不消耗生图次数。</p><select value={upscaleFactor} onChange={(event) => setUpscaleFactor(Number(event.target.value) as 2 | 4)}><option value="2">2× 高清</option><option value="4">4× 超高清</option></select><button onClick={() => void downloadUpscaledImage()}>放大并下载</button><small>当前为高清插值；AI 补细节版稍后可连接本地 Real-ESRGAN。</small></>}
          {toolbarMenu === "more" && <><strong>更多操作</strong>{current.kind === "prompt" && <button onClick={() => { saveCurrentPrompt(); setToolbarMenu(null); }}>保存到提示词库</button>}<button onClick={() => { focusNode(current.id); setToolbarMenu(null); }}>定位到画布中央</button><button onClick={() => { exportNode(current); setToolbarMenu(null); }}>导出节点备份</button></>}
        </div>}
        <div className={styles.zoomControls}><button aria-label="放大" onClick={() => zoomBy(1.25)}>＋</button><button aria-label="缩小" onClick={() => zoomBy(.8)}>−</button><button aria-label="适配画布" onClick={fitView}>⌗</button><input aria-label="画布缩放" type="range" min="10" max="800" value={Math.round(view.zoom * 100)} onChange={(event) => { const rect = viewportRef.current?.getBoundingClientRect(); const px = (rect?.width ?? 900) / 2, py = (rect?.height ?? 650) / 2, zoom = Number(event.target.value) / 100; setView((old) => ({ zoom, x: px - (px - old.x) * zoom / old.zoom, y: py - (py - old.y) * zoom / old.zoom })); }} /><span>{Math.round(view.zoom * 100)}%</span></div>
        <input ref={imageInputRef} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { importImage(event.target.files?.[0]); event.target.value = ""; }} />
      </section>
      <aside className={styles.inspector}>
        <div className={styles.inspectorHeader}><div><small>AFTER NOW / IMAGE AGENT</small><h2>创作助手</h2></div><button aria-label="保存画布" title="保存画布" onClick={saveCanvas}>存档</button></div>
        <div className={styles.assistantContext}><span className={styles.agentAvatar}>A</span><div><strong>画布协作中</strong><small>{current ? `正在编辑${current.kind === "prompt" ? "画面描述" : current.kind === "text" ? "文字图层" : "图像结果"}节点` : "选择一个节点开始编辑"}</small></div><span className={styles.liveDot} /></div>
        <div className={styles.inspectorScroll}>
          <section className={styles.section}><div className={styles.sectionHeading}><span>01 / 画面描述</span><button onClick={() => addNode("prompt")}>＋ 新描述</button></div>
            {currentPromptNode?.sources?.length ? <p className={styles.referenceHint}>已连接 {currentPromptNode.sources.length} 张参考图。描述图1、图2各要保留的空间、建筑或风格，再点击生成。</p> : <p className={styles.referenceHint}>想按已有图片生成？把图片右侧圆点拖到描述节点左侧圆点；也可以把两张图片直接相连。</p>}
            {currentPromptNode ? <><textarea className={styles.mainPrompt} value={activePrompt} placeholder="描述你想生成的画面…" onChange={(event) => setItems((all) => all.map((item) => item.id === currentPromptNode.id ? { ...item, prompt: event.target.value } : item))} /><div className={styles.settingRow}><label>画面比例<select value={ratio} onChange={(event) => { const nextRatio = event.target.value; setRatio(nextRatio); setItems((all) => all.map((item) => item.kind === "image" && item.pending && item.from === currentPromptNode.id ? { ...item, aspectRatio: nextRatio.replace(":", " / ") } : item)); }}><option value="16:9">16:9 横屏</option><option value="9:16">9:16 竖屏</option><option value="4:3">4:3 横屏</option><option value="3:4">3:4 竖屏</option><option value="1:1">1:1 方形</option><option value="3:2">3:2 横屏</option><option value="2:3">2:3 竖屏</option></select></label><label>生成张数<select aria-label="生成张数" value={imageCount} disabled={busy} onChange={(event) => setImageCount(Number(event.target.value) as ImageCount)}>{([1, 2, 3, 4] as const).map((count) => <option key={count} value={count}>{count} 张</option>)}</select></label></div><p className={styles.usage}>一次提交 {imageCount} 张，云端同时生成。{localMode ? "本机模型按显存情况处理。" : `仅批次之间有一分钟冷却；每张分别计入额度，本次最多提交 ${imageCount} 次。`}</p><div className={styles.modelPicker}><span>生成模型 · 共用每日免费额度</span><div>{imageModels.map((model) => <button key={model.id} className={imageModel === model.id ? styles.activeModel : ""} onClick={() => setImageModel(model.id)}><strong>{imageModel === model.id ? "✓ " : ""}{model.name}</strong><small>{model.note}</small></button>)}<button className={styles.comingModel} disabled><strong>Nano Banana Pro</strong><small>敬请期待 · 专业空间重建</small></button><button className={styles.comingModel} disabled><strong>GPT Image</strong><small>敬请期待 · 精细图像编辑</small></button></div></div><div className={styles.styleChoices}><span>视觉方向</span><div><button className={style === "after" ? styles.activeStyle : ""} onClick={() => setStyle("after")}>实验视觉</button><button className={style === "photo" ? styles.activeStyle : ""} onClick={() => setStyle("photo")}>电影摄影</button><button className={style === "original" ? styles.activeStyle : ""} onClick={() => setStyle("original")}>原始描述</button></div></div><button className={styles.generateButton} disabled={busy || !activePrompt.trim() || !canGenerate} onClick={() => void generate()}>{busy ? `正在生成 ${batchProgress.current} / ${batchProgress.total} 张…` : `生成 ${imageCount} 张 · ${imageModels.find((model) => model.id === imageModel)?.name ?? "免费模型"} ↗`}</button><p className={styles.usage}>{localMode ? authMessage : user ? `今日剩余 ${quota?.remaining ?? "—"} / ${quota?.userLimit ?? "—"} 次` : authMessage}</p></> : <div className={styles.noPrompt}><p>画布还没有描述节点。</p><button onClick={() => addNode("prompt")}>添加描述节点</button></div>}
          </section>
          {current?.kind === "image" && <section className={styles.section}><div className={styles.sectionHeading}><span>02 / 图像节点</span><button className={styles.dangerAction} onClick={removeCurrent}>移除</button></div><p className={styles.selectedDescription}>{current.src ? current.prompt : current.pending ? "运行描述节点后，生成的图片会出现在这里。" : "可通过导入图片填充此节点。"}</p>{current.src && <><button className={styles.downloadButton} onClick={() => setToolbarMenu("upscale")}>免费高清放大　2× / 4× ↗</button><a className={styles.downloadButton} href={current.src} download={`after-now-${current.id}.png`}>下载原图 ↓</a></>}</section>}
          {!localMode && <details className={styles.account}><summary>{user ? `账号与额度 · ${user.email}` : "登录以启用生图"}</summary>{user ? <><p>今日剩余 {quota?.remaining ?? "—"} / {quota?.userLimit ?? "—"} 次</p><button className={styles.secondaryButton} disabled={busy || authBusy} onClick={() => accountAction("logout")}>退出登录</button></> : <form onSubmit={(event) => { event.preventDefault(); void accountAction("login"); }}><label>邮箱<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>密码<input type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label><div className={styles.authActions}><button className={styles.secondaryButton} disabled={authBusy} type="submit">{authBusy ? "请稍候…" : "登录"}</button><button className={styles.secondaryButton} disabled={authBusy || !email || loginPassword.length < 8} type="button" onClick={() => void accountAction("signup")}>注册</button></div><p role="status">{authMessage}</p></form>}<small>每日次数于北京时间 08:00 重置；提交给模型后会计入次数。</small></details>}
          <section className={styles.section}><div className={styles.sectionHeading}><span>03 / 描述补充</span><span className={styles.optionalTag}>可选</span></div><label className={styles.assistantLabel} htmlFor="assistant-note">告诉助手你想补充的画面内容</label><textarea id="assistant-note" className={styles.assistantInput} value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="例如：加上柔和的晨雾和湖面倒影" /><button className={styles.applyButton} onClick={applyAssistant}>加入当前描述</button></section>
          <p className={styles.message} role="status">{message}</p>
        </div>
        <footer className={styles.inspectorFooter}><span>AFTER NOW IMAGE CANVAS</span><Link href="/#lab">返回实验室 ↗</Link></footer>
      </aside>
    </div>
        {previewId && items.find((item) => item.id === previewId)?.src && <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => setPreviewId(null)}><button aria-label="关闭预览" onClick={() => setPreviewId(null)}>×</button><img src={items.find((item) => item.id === previewId)!.src} alt="图片预览" onClick={(event) => event.stopPropagation()} /></div>}
        {assetEditor && current?.kind === "image" && current.src && <AssetEditor src={current.src} mode={assetEditor} onClose={() => setAssetEditor(null)} onApply={(src, label, bounds, sourceSize, originalSrc) => addImageLayer(src, `${current.prompt} · ${label}`, bounds, sourceSize, current, originalSrc)} />}
        {showReleaseNotice && <div className={styles.releaseOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissReleaseNotice(); }}><section className={styles.releaseDialog} role="dialog" aria-modal="true" aria-labelledby="release-title"><button className={styles.releaseClose} onClick={dismissReleaseNotice} aria-label="关闭更新说明">×</button><small>AFTER NOW / CANVAS UPDATE</small><h2 id="release-title">画布更新了</h2><p>现在可以在画布里直接修改图片中的整组文字：</p><ul><li><strong>识别整张图片</strong><span>浏览器本地识别中文和英文，逐项检查、编辑识别结果。</span></li><li><strong>AI 重绘并替换全部文字</strong><span>把原图和替换内容送入网站生图服务，保留原图并生成修改版。</span></li><li><strong>无连线文字拆层</strong><span>原图保留，底图复制到右侧，识别文字按位置拆成独立图层，不再显示多余连接线。</span></li></ul><footer><span>关闭后，本版本更新说明不会在刷新时再次出现。</span><button onClick={dismissReleaseNotice}>知道了</button></footer></section></div>}
  </main>;
}


