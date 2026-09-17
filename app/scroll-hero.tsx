"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X, ArrowUpRight } from "lucide-react";
import styles from "./scroll-hero.module.css";

const source="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260709_080129_da34b00e-a5db-47dd-81a1-cccad79ac1ac.mp4";
const links=[["首页","#top"],["工具","#lab"],["作品","#works"],["关于我","#manifesto"]];
export default function ScrollHero(){
 const root=useRef<HTMLElement>(null),video=useRef<HTMLVideoElement>(null),background=useRef<HTMLDivElement>(null),title=useRef<HTMLHeadingElement>(null),panel=useRef<HTMLDivElement>(null);
 const [menu,setMenu]=useState(false),[status,setStatus]=useState("视频加载中，仍可直接进入工具 ↓");
 useEffect(()=>{
  gsap.registerPlugin(ScrollTrigger);const el=video.current,section=root.current;if(!el||!section)return;
  const bg=background.current;let target=0,pending=false,active=true;const seek=()=>{if(!active||!el.duration||!Number.isFinite(el.duration))return;if(el.seeking){pending=true;return;}pending=false;if(Math.abs(el.currentTime-target)>.06){try{el.currentTime=target;}catch{}}};
  const seeked=()=>{if(pending)seek();};el.addEventListener("seeked",seeked);
  const ready=()=>{setStatus("");seek();};const error=()=>setStatus("视频暂时无法加载，工具仍可使用 ↓");el.addEventListener("loadeddata",ready);el.addEventListener("error",error);
  const timeout=window.setTimeout(()=>setStatus(s=>s?"视频加载较慢，可直接进入工具 ↓":s),12000);
  const mm=gsap.matchMedia();mm.add({desktop:"(min-width: 769px)",mobile:"(max-width: 768px)",reduced:"(prefers-reduced-motion: reduce)"},context=>{
   const c=context.conditions!;
   if(c.reduced)return;
   ScrollTrigger.create({trigger:section,start:"top top",end:"bottom bottom",onUpdate:self=>{target=self.progress*Math.max(0,(el.duration||0)-.05);seek();}});
   gsap.to(title.current?.querySelectorAll('[data-char]')??[],{opacity:0,yPercent:220,scaleY:1.2,scaleX:.9,stagger:.025,ease:"power2.inOut",scrollTrigger:{trigger:section,start:"top top",end:"top -100%",scrub:1.5}});
   gsap.fromTo(panel.current,{yPercent:120,opacity:0},{yPercent:0,opacity:1,ease:"none",scrollTrigger:{trigger:section,start:"top -190%",end:"bottom bottom",scrub:1}});
   if(c.desktop){const move=(e:MouseEvent)=>{const bounds=section.getBoundingClientRect();if(bounds.bottom<0||bounds.top>window.innerHeight)return;const x=e.clientX/window.innerWidth*2-1,y=e.clientY/window.innerHeight*2-1;gsap.to(background.current,{x:x*-25,y:y*-25,duration:1.5,ease:"power2.out"});};window.addEventListener("mousemove",move);context.add(()=>()=>window.removeEventListener("mousemove",move));}
  });
  return()=>{active=false;clearTimeout(timeout);mm.revert();gsap.killTweensOf(bg);el.removeEventListener("seeked",seeked);el.removeEventListener("loadeddata",ready);el.removeEventListener("error",error);};
 },[]);
 return <section ref={root} className={styles.root} id="top" aria-labelledby="welcome-title">
 <div className={styles.sticky}>
 <div ref={background} className={styles.background}><video ref={video} src={source} muted playsInline preload="auto" className={styles.video} aria-hidden="true"/></div>
 <nav className={styles.navigation} aria-label="主导航"><a className={styles.logo} href="#top" aria-label="After-Now 首页"><svg viewBox="0 0 100 100" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="m50,50c0,18.2,14.77,32.98,32.97,32.98,0-18.2-14.77-32.98-32.97-32.98Z m17.02,82.98c18.2,0,32.98-14.77,32.98-32.98-18.2,0-32.98,14.77-32.98,32.98Z m82.98,17.02c-18.2,0-32.97,14.77-32.97,32.97,18.2,0,32.97-14.77,32.97-32.97Z m17.02,17.02c0,18.2,14.77,32.97,32.98,32.97,0-18.2-14.77-32.97-32.98-32.97Z"/></svg></a><div className={styles.desktop}>{links.map(([name,url])=><a className={styles.pill} href={url} key={url}>{name}</a>)}</div><button className={styles.menuButton} aria-expanded={menu} aria-controls="hero-mobile-menu" aria-label={menu?"关闭导航":"打开导航"} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>{menu&&<div id="hero-mobile-menu" className={styles.mobile}>{links.map(([name,url])=><a href={url} key={url} onClick={()=>setMenu(false)}>{name}</a>)}</div>}</nav>
 <div className={styles.titleLayer}><p>欢迎来到 After-Now / 此刻之后</p><h1 ref={title} id="welcome-title" aria-label="After Now Create More">{["After Now","Create More"].map(line=><span className={styles.line} key={line} aria-hidden="true">{line.split(" ").map((word,index)=><span className={styles.word} key={index}>{index>0&&"\u00a0"}{Array.from(word).map((char,i)=><span data-char key={i}>{char}</span>)}</span>)}</span>)}</h1><a className={styles.direct} href="#lab">直接进入工具与工作台 <ArrowUpRight size={15}/></a></div>
 <div ref={panel} className={styles.panelWrap}><div className={styles.panel}><p className={styles.subtitle}>A space for your next idea.</p><h2>让想法成为作品。<br/>从一个工具，<em>一种方法，</em><br/>一次创作开始。</h2><p className={styles.copy}>After-Now · 设计、创作与持续实验的工作空间。</p><a className={styles.enter} href="#lab">探索工具与 Skill ↗</a><div className={styles.marquee} aria-hidden="true"><div>{[0,1,2,3].map(i=><span key={i}>AFTER NOW　 /　 TOOLS　 /　 SKILL　 /　 CREATE　 /　 EXPERIMENT　 /　 </span>)}</div></div></div></div>
 {status&&<p className={styles.status} role="status">{status}</p>}
 </div></section>;
}


