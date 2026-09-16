"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./canvas.module.css";

type Item = { id: string; src: string; prompt: string; x: number; y: number; width: number };
const storageKey = "after-now-image-canvas-v1";
export default function Canvas() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("square");
  const [style, setStyle] = useState("original");
  const [email, setEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; userLimit: number; globalRemaining: number } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("正在读取账号…");
  const refreshAccount = async () => {
    try {
      const response = await fetch("/api/canvas-auth", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUser(data.user); setQuota(data.quota ?? null);
      setAuthMessage(!data.configured ? "访客账号服务尚未连接。仍可导入图片体验画布。" : data.user ? "" : "登录后即可生图。新账号需要验证邮箱。");
    } catch { setAuthMessage("账号信息暂时无法读取，请刷新重试。"); }
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/canvas-auth", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(); return data; })
      .then((data) => { setUser(data.user); setQuota(data.quota ?? null); setAuthMessage(!data.configured ? "访客账号服务尚未连接。仍可导入图片体验画布。" : data.user ? "" : "登录后即可生图。新账号需要验证邮箱。"); })
      .catch(() => { if (!controller.signal.aborted) setAuthMessage("账号信息暂时无法读取，请刷新重试。"); });
    return () => controller.abort();
  }, []);
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("输入描述开始创作，或导入图片体验画布。");
  const drag = useRef<{ id: string; x: number; y: number; startX: number; startY: number } | null>(null);
  const current = items.find((item) => item.id === selected);
  const addImage = (src: string, description: string) => {
    const id = crypto.randomUUID();
    setItems((previous) => [...previous, { id, src, prompt: description, x: 60 + (previous.length % 4) * 70, y: 60 + (previous.length % 4) * 60, width: 320 }]);
    setSelected(id);
  };
  const generate = async () => {
    setBusy(true); setMessage("正在生成，请稍候…");
    try {
      const response = await fetch("/api/image-canvas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, ratio, style }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
      const reader = new FileReader();
      const blob = await response.blob();
      const src = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      addImage(src, prompt); setMessage("图片已加入画布，拖动即可排列。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败，请重试。"); }
    finally { setBusy(false); void refreshAccount(); }
  };
  return <main className={styles.page}>
    <header className={styles.header}><div><small>AFTER NOW LAB / 01</small><h1>Image Canvas <span>生图画布</span></h1></div><Link href="/#lab">返回实验室 ↗</Link></header>
    <div className={styles.workspace}><aside className={styles.sidebar}>
      <small>CREATE / 创作</small><h2>让想象<br />成为图像。</h2>
      <div className={styles.account}>
        {user ? <><p>{user.email}</p>{quota && <p>今日剩余 {quota.remaining} / {quota.userLimit} 次{quota.globalRemaining === 0 && " · 全站额度已用完"}</p>}<button disabled={busy || authBusy} onClick={() => accountAction("logout")}>退出登录</button></> : <form onSubmit={(e) => { e.preventDefault(); void accountAction("login"); }}>
          <label>邮箱<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>密码<input type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></label>
          <div className={styles.actions}><button disabled={authBusy} type="submit">{authBusy ? "请稍候…" : "登录"}</button><button disabled={authBusy || !email || loginPassword.length < 8} type="button" onClick={() => accountAction("signup")}>注册</button></div>
        </form>}
        <p role="status">{authMessage}</p><small>每日次数在北京时间 08:00 重置。请求提交给模型后会计入次数，失败也计入。</small>
      </div>
      <label>描述<textarea value={prompt} maxLength={1500} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：一座漂浮在蓝色湖面上的绿色未来建筑…" /></label>
      <label>视觉规则<select value={style} onChange={(e) => setStyle(e.target.value)}><option value="after">After Now · 实验视觉</option><option value="photo">电影摄影</option><option value="original">只使用我的描述</option></select></label>
      <label>比例<select value={ratio} onChange={(e) => setRatio(e.target.value)}><option value="square">1:1 正方形</option><option value="landscape">4:3 横向</option><option value="portrait">3:4 纵向</option></select></label>
      <button disabled={busy || !prompt.trim() || !user || !quota || quota.remaining === 0 || quota.globalRemaining === 0} onClick={generate}>{busy ? "生成中…" : user ? "生成图片 ↗" : "登录后生成"}</button>
      <p className={styles.status} role="status">{message}</p>
      <label className={styles.import}>导入图片体验画布 +<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setMessage("请导入小于 5 MB 的图片。"); return; } const reader = new FileReader(); reader.onload = () => { addImage(String(reader.result), file.name); setMessage("已导入，可以拖动和调整大小。"); }; reader.readAsDataURL(file); e.target.value = ""; }} /></label>
      <div className={styles.actions}><button onClick={() => { try { localStorage.setItem(storageKey, JSON.stringify(items)); setMessage("草稿已保存在当前浏览器。"); } catch { setMessage("浏览器存储已满，请下载图片后减少画布内容。"); } }}>保存草稿</button><button onClick={() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); if (!Array.isArray(saved) || !saved.every((i) => typeof i.id === "string" && typeof i.src === "string" && /^data:image\/(png|jpeg|webp)/.test(i.src) && Number.isFinite(i.x) && Number.isFinite(i.y) && Number.isFinite(i.width))) throw new Error(); setItems(saved); setSelected(null); setMessage("草稿已读取。"); } catch { setMessage("草稿无法读取。"); } }}>读取草稿</button></div>
      {current && <div className={styles.selection}><small>SELECTED / 已选中</small><label>图片宽度<input type="range" min="120" max="640" value={current.width} onChange={(e) => setItems((all) => all.map((i) => i.id === selected ? { ...i, width: Number(e.target.value) } : i))} /></label><a href={current.src} download={`after-now-${current.id}.png`}>下载图片 ↓</a><button onClick={() => { setItems((all) => all.filter((i) => i.id !== selected)); setSelected(null); }}>移出画布 ×</button></div>}
    </aside><section className={styles.viewport} aria-label="图片画布"><div className={styles.board} onPointerDown={() => setSelected(null)}>
      {!items.length && <div className={styles.empty}><span>＋</span><h2>你的第一张图像<br />从这里开始。</h2><p>生成或导入图片，然后自由排列。</p></div>}
      {items.map((item) => <div key={item.id} className={styles.image} data-selected={selected === item.id} style={{ left: item.x, top: item.y, width: item.width }} onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setSelected(item.id); drag.current = { id: item.id, x: item.x, y: item.y, startX: e.clientX, startY: e.clientY }; }} onPointerMove={(e) => { const d = drag.current; if (!d || d.id !== item.id) return; setItems((all) => all.map((i) => i.id === d.id ? { ...i, x: Math.max(0, Math.min(1600 - i.width, d.x + e.clientX - d.startX)), y: Math.max(0, Math.min(800, d.y + e.clientY - d.startY)) } : i)); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        {/* User-created images are kept local and downloaded directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.src} alt={item.prompt} draggable={false} /><p>{item.prompt}</p>
      </div>)}
    </div></section></div>
  </main>;
}
