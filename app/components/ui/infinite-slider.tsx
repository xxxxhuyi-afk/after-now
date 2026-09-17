"use client";
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import useMeasure from "react-use-measure";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export default function InfiniteSlider({children,className}:{children:ReactNode;className?:string}){
 const [ref,bounds]=useMeasure();const reduced=useReducedMotion();
 return <div className={twMerge(clsx("overflow-hidden",className))}><motion.div style={{display:"flex",width:"max-content"}} animate={{x:reduced?0:[0,-bounds.width]}} transition={{duration:32,ease:"linear",repeat:Infinity}}><div ref={ref} style={{display:"flex",alignItems:"center",gap:64,paddingRight:64}}>{children}</div>{!reduced&&<div aria-hidden="true" style={{display:"flex",alignItems:"center",gap:64,paddingRight:64}}>{children}</div>}</motion.div></div>;
}
