"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

export default function ExhibitionLibrary() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const worker = useRef<ServiceWorker | null>(null);
  const session = useRef<{key: CryptoKey; expires: number} | null>(null);
  const storageKey = "after-now-exhibition-session-v1";

  async function connectWorker() {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) throw new Error("请使用 HTTPS 地址及新版 Edge、Chrome 或 Safari 打开。");
    const registration = await navigator.serviceWorker.register("/exhibition-library-worker.js", { scope: "/exhibition-library/" });
    const target = registration.installing || registration.waiting || registration.active;
    if (!target) throw new Error("资源保护程序未能启动，请刷新重试。");
    if (target.state !== "activated") await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("初始化超时，请重试。")), 15000);
      target.addEventListener("statechange", () => {
        if (target.state === "activated") { clearTimeout(timer); resolve(); }
        if (target.state === "redundant") { clearTimeout(timer); reject(new Error("初始化失败，请刷新重试。")); }
      });
    });
    worker.current = target;
    return target;
  }

  async function openSession(key: CryptoKey, expires: number) {
    const target = await connectWorker();
    await new Promise<void>((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => { channel.port1.close(); reject(new Error("解锁超时，请重试。")); }, 10000);
      channel.port1.onmessage = () => { clearTimeout(timer); channel.port1.close(); resolve(); };
      target.postMessage({type:"exhibition-unlock",key,expires}, [channel.port2]);
    });
    session.current = {key, expires};
    setUnlocked(true);
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/exhibition-vault/manifest.json");
      if (!response.ok) throw new Error("案例库暂不可用，请稍后重试。");
      const manifest = await response.json();
      const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({name:"PBKDF2",salt:Uint8Array.from(atob(manifest.salt), c=>c.charCodeAt(0)),iterations:manifest.iterations,hash:"SHA-256"},material,{name:"AES-GCM",length:256},true,["decrypt"]);
      const probeResponse = await fetch("/exhibition-vault/probe.bin");
      if (!probeResponse.ok) throw new Error("案例库暂不可用，请稍后重试。");
      const probe = new Uint8Array(await probeResponse.arrayBuffer());
      try { await crypto.subtle.decrypt({name:"AES-GCM",iv:probe.slice(0,12)},key,probe.slice(12)); }
      catch { throw new Error("密码不正确，请重新输入。"); }
      const expires = Date.now()+8*60*60*1000;
      await openSession(key, expires);
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw",key));
      try { sessionStorage.setItem(storageKey,JSON.stringify({raw:btoa(String.fromCharCode(...raw)),expires})); } catch { /* Current page still works when storage is blocked. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "解锁失败，请重试。"); }
    finally { setPassword(""); setBusy(false); }
  }

  function lock() {
    session.current=null; sessionStorage.removeItem(storageKey);
    worker.current?.postMessage({type:"exhibition-lock"});
    setSource(null); setUnlocked(false); setLoaded(false);
  }

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source!==worker.current || event.data?.type!=="exhibition-request-key") return;
      event.ports[0]?.postMessage(session.current && session.current.expires>Date.now() ? session.current : null);
    };
    navigator.serviceWorker?.addEventListener("message", receive);
    const timer=window.setInterval(()=>{if(session.current&&session.current.expires<=Date.now())lock()},30000);
    let saved: {raw: string; expires:number} | null=null;
    try { saved=JSON.parse(sessionStorage.getItem(storageKey)||"null"); } catch { /* Start locked. */ }
    if(saved&&saved.expires>Date.now()) {
      const record=saved;
      crypto.subtle.importKey("raw",Uint8Array.from(atob(record.raw),c=>c.charCodeAt(0)),"AES-GCM",false,["decrypt"])
        .then(key=>openSession(key,record.expires)).catch(()=>{sessionStorage.removeItem(storageKey);setError("会话已结束，请重新输入密码。")});
    }
    return ()=>{clearInterval(timer);navigator.serviceWorker?.removeEventListener("message",receive)};
  // Session setup runs once for this page; all mutable values live in refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const sync = () => {
      setLoaded(false);
      setFailed(false);
      setSource(`/exhibition-library/index.html${window.location.hash || "#home"}`);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== "after-now-library-route") return;
      const hash = event.data.hash;
      if (typeof hash !== "string" || !hash.startsWith("#") || hash.length > 2000) return;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("message", receive);
    };
  }, [unlocked]);

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="案例库导航">
        <Link href="/#lab" className={styles.brand}>← After Now Lab</Link>
        <h1>展馆案例库</h1>
        <div className={styles.actions}>
          {unlocked && <><a href="#home">全部案例</a><a href="#case-01">模型对照</a><button type="button" onClick={lock}>锁定案例库</button></>}
        </div>
      </nav>
      {!unlocked && <section className={styles.gate}><div className={styles.gateBody}><h2>展馆、展项与空间灵感。</h2><p>输入访问密码，浏览案例图集、互动展项与三维模型。</p><form onSubmit={unlock}><label htmlFor="exhibition-password">访问密码</label><input id="exhibition-password" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} disabled={busy} aria-describedby={error?"exhibition-password-error":undefined}/><button type="submit" disabled={busy}>{busy?"正在解锁…":"进入案例库"}</button>{error&&<p id="exhibition-password-error" className={styles.error} role="alert">{error}</p>}</form><p className={styles.sessionNote}>解锁在当前标签页保留 8 小时，也可以随时锁定。</p></div></section>}
      {unlocked && !loaded && <p className={styles.status} role="status">{failed ? "案例库载入失败，请刷新页面重试。" : "正在载入案例库…"}</p>}
      <noscript><p className={styles.status}>请启用 JavaScript 后输入密码。</p></noscript>
      {unlocked && source && <iframe
        ref={frame}
        className={styles.frame}
        src={source}
        title="展馆与互动展项案例库，含空间图集、展项详情及模型对照"
        allow="fullscreen"
        onLoad={() => setLoaded(true)}
        onError={() => { setFailed(true); setLoaded(false); }}
      />}
    </main>
  );
}
