"use client";

import { useRef, useState } from "react";
import styles from "./character-intro.module.css";

const profiles = [
  {
    id: "look",
    label: "形象",
    index: "01",
    title: "蓝色，是她辨认世界的方式。",
    copy: "蓝色贝雷帽、银色配饰与利落的长外套，构成这个数字角色最清晰的视觉记忆。",
  },
  {
    id: "nature",
    label: "性格",
    index: "02",
    title: "温柔、敏锐，也保留一点倔强。",
    copy: "她观察得很慢，思考得很深；不急着回答所有问题，更愿意先理解问题本身。",
  },
  {
    id: "interests",
    label: "兴趣",
    index: "03",
    title: "在阅读、设计与未来技术之间游走。",
    copy: "她收集书里的句子、城市里的光，以及那些尚未被命名的新体验。",
  },
];

export default function CharacterIntro() {
  const [activeId, setActiveId] = useState(profiles[0].id);
  const [soundOn, setSoundOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0];

  const toggleSound = () => {
    const nextSoundState = !soundOn;
    const video = videoRef.current;
    if (video) {
      video.muted = !nextSoundState;
      if (nextSoundState) void video.play();
    }
    setSoundOn(nextSoundState);
  };

  return (
    <section className={styles.section} id="character" aria-labelledby="character-title">
      <div className={styles.topline}>
        <span>00</span>
        <span>人物档案</span>
        <span>此刻之后 / 2026</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.copyColumn}>
          <p className={styles.kicker}>数字角色 · 自我延伸</p>
          <h2 id="character-title">
            <span>你好，</span>
            <em>这是我。</em>
          </h2>
          <p className={styles.intro}>
            她不是一个替身，而是从真实的我延伸出的另一种表达。
            在这里，她替我观察、阅读，也探索此刻之后的世界。
          </p>

          <div className={styles.tabs} role="tablist" aria-label="人物介绍分类">
            {profiles.map((profile) => (
              <button
                type="button"
                role="tab"
                aria-selected={active.id === profile.id}
                className={active.id === profile.id ? styles.activeTab : undefined}
                key={profile.id}
                onClick={() => setActiveId(profile.id)}
              >
                <span>{profile.index}</span>
                {profile.label}
              </button>
            ))}
          </div>

          <div className={styles.detail} key={active.id} role="tabpanel">
            <span>{active.index} / 03</span>
            <h3>{active.title}</h3>
            <p>{active.copy}</p>
          </div>
        </div>

        <div className={styles.portraitColumn}>
          <div className={styles.portraitMeta} aria-hidden="true">
            <span>数字角色 002</span>
            <span>蓝色坐标：31.2304° N</span>
          </div>
          <div className={styles.portraitFrame}>
            <video
              ref={videoRef}
              className={styles.portraitVideo}
              src="/character-intro-reference.mp4"
              poster="/after-now-character-profile.png"
              aria-label="3D 数字角色设计过程视频"
              autoPlay
              muted={!soundOn}
              loop
              playsInline
              preload="metadata"
            />
            <button
              type="button"
              className={styles.soundToggle}
              aria-pressed={soundOn}
              onClick={toggleSound}
            >
              <span aria-hidden="true">{soundOn ? "音" : "静"}</span>
              {soundOn ? "关闭声音" : "开启声音"}
            </button>
          </div>
          <div className={styles.caption}>
            <span>一个在现实与数字之间持续生长的角色。</span>
            <b aria-hidden="true">↘</b>
          </div>
        </div>
      </div>
    </section>
  );
}
