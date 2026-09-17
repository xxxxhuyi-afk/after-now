"use client";
import { useEffect,useRef,useState } from "react";
import Hls from "hls.js";
import { motion,useReducedMotion } from "motion/react";
import { ArrowUpRight,Zap,Pause,Play } from "lucide-react";
import InfiniteSlider from "./components/ui/infinite-slider";
import styles from "./welcome-hero.module.css";
const stream="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/697945ca6b876878dba3b23fbd2f1561/manifest/video.m3u8";
const fallback="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";
export default function Hero(){
 const video=useRef<HTMLVideoElement>(null);const reduced=useReducedMotion();const [paused,setPaused]=useState(false);const [failed,setFailed]=useState(false);
 useEffect(()=>{const el=video.current;if(!el)return;let hls:Hls|null=null;let backup=false;const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
 const play=()=>{if(preference.matches){el.pause();setPaused(true);}else void el.play().then(()=>setPaused(false)).catch(()=>setPaused(true));};
 const fail=()=>{if(backup){setFailed(true);return;}backup=true;hls?.destroy();hls=null;el.src=fallback;el.load();};
 el.addEventListener("error",fail);el.addEventListener("loadeddata",play);
 if(el.canPlayType("application/vnd.apple.mpegurl")){el.src=stream;}else if(Hls.isSupported()){hls=new Hls();hls.loadSource(stream);hls.attachMedia(el);hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)fail();});}else{backup=true;el.src=fallback;}
 const stop=()=>{if(preference.matches){el.pause();setPaused(true);}};preference.addEventListener("change",stop);
 return()=>{hls?.destroy();el.removeEventListener("error",fail);el.removeEventListener("loadeddata",play);preference.removeEventListener("change",stop);el.pause();el.removeAttribute("src");el.load();};},[]);
 return <section className={styles.hero} id="top" aria-labelledby="welcome-title"><nav className={styles.nav} aria-label="主导航"><a className={styles.logo} href="#top">After-Now</a><div className={styles.links}><a href="#lab">工具与 Skill</a><a href="#works">作品</a><a href="#manifesto">关于我</a></div><a className={styles.glass} href="/lab/image-canvas">进入画布 ↗</a></nav>
 <motion.div className={styles.content} initial={{opacity:reduced?1:0,y:reduced?0:22}} animate={{opacity:1,y:0}} transition={{duration:.7}}><div className={styles.pill}><span><Zap size={14}/></span>欢迎来到 After-Now · 为创作而构建</div><h1 id="welcome-title">Your Vision<br/><em>Our Digital Reality.</em></h1><p className={styles.description}>把大胆的想法变成作品。<br/>用工具、Skill 与画布，探索属于你的创作方法。</p><a className={styles.ctaWrapper} href="#lab"><span className={styles.cta}>开始创作 <span><ArrowUpRight size={20}/></span></span></a></motion.div>
 <div className={styles.videoWrap}><video ref={video} className={styles.video} autoPlay loop muted playsInline preload="metadata" aria-hidden="true"/><div className={styles.fade}/>{failed&&<p className={styles.videoError}>视频暂时无法加载，仍可继续探索工具。</p>}<button className={styles.videoControl} aria-label={paused?"播放背景视频":"暂停背景视频"} onClick={async()=>{const el=video.current;if(!el)return;if(el.paused){try{await el.play();setPaused(false);}catch{setPaused(true);}}else{el.pause();setPaused(true);}}}>{paused?<Play size={15}/>:<Pause size={15}/>}</button></div>
 <div className={styles.logoCloud}><p>探索的技术生态<small>品牌展示，不代表合作或背书</small></p><InfiniteSlider className={styles.slider}>{["openai","nvidia","github"].map(logo=><img key={logo} className={styles.customerLogo} src={`https://html.tailus.io/blocks/customers/${logo}.svg`} alt={logo} width={110} height={30}/>)}</InfiniteSlider></div></section>;
}
