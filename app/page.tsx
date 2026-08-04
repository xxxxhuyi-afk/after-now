import Image from "next/image";
import Experience from "./experience";
import MotionCanvas from "./motion-canvas";
import styles from "./page.module.css";

const projects = [
  {
    number: "01",
    title: "Unseen / 未见",
    discipline: "Spatial identity",
    year: "2026",
    description:
      "为一处随光线、动作与时间变化的空间构建身份系统。Identity in motion.",
    visualClass: styles.visualUnseen,
  },
  {
    number: "02",
    title: "Quiet Machine / 静默机器",
    discipline: "Digital experience",
    year: "2026",
    description:
      "探索一种安静存在、不争夺注意力的智能体验。A quieter intelligence.",
    visualClass: styles.visualMachine,
  },
  {
    number: "03",
    title: "Field Notes / 场域笔记",
    discipline: "Research & direction",
    year: "Ongoing",
    description:
      "收集真实空间与计算世界之间的观察、碎片与视觉实验。Field observations.",
    visualClass: styles.visualField,
  },
];

const labNotes = [
  {
    index: "L—01",
    title: "Generative Form",
    copy: "让系统自行绘制、变异，并发现它自己的视觉语言。",
  },
  {
    index: "L—02",
    title: "Ambient Interfaces",
    copy: "让界面退入环境，只在真正需要时出现。",
  },
  {
    index: "L—03",
    title: "Synthetic Memory",
    copy: "关于档案、作者身份，以及机器替我们记住的图像。",
  },
];

const journalEntries = [
  {
    number: "001",
    title: "界面之后，还有什么？",
    category: "Observation / 观察",
  },
  {
    number: "002",
    title: "为更安静的智能而设计",
    category: "Field note / 现场笔记",
  },
  {
    number: "003",
    title: "什么应该继续属于人？",
    category: "Question / 提问",
  },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span aria-hidden="true" className={styles.arrow}>
      {diagonal ? "↗" : "→"}
    </span>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <Experience />

      <header className={styles.siteHeader}>
        <a className={styles.wordmark} href="#top" aria-label="After Now 首页">
          After Now
          <span>此刻之后</span>
        </a>
        <nav className={styles.navigation} aria-label="主导航">
          <a href="#works">Works</a>
          <a href="#lab">Lab</a>
          <a href="#journal">Journal</a>
          <a href="#contact">Contact</a>
        </nav>
        <span className={styles.headerMark}>AN° / 2026</span>
      </header>

      <section className={styles.hero} id="top" aria-labelledby="hero-title">
        <MotionCanvas />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.catHero} data-testid="cat-hero" aria-hidden="true">
          <Image
            src="/after-now-cyber-cat-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
          />
        </div>

        <div className={styles.catStatus} data-testid="cat-status" aria-hidden="true">
          <i />
          <span>Awake</span>
        </div>

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle} id="hero-title">
            <span data-reveal>此刻之后</span>
          </h1>
          <div className={styles.heroStatement} data-reveal>
            <i aria-hidden="true" />
            <p>此刻，是未来最早的样子。</p>
          </div>
          <div className={styles.heroEnglish} data-reveal>
            <strong>After Now</strong>
            <span>Designing What Comes Next.</span>
          </div>
        </div>

        <a className={styles.scrollCue} href="#manifesto" data-reveal>
          <span>Scroll to explore</span>
          <span className={styles.scrollLine} aria-hidden="true" />
        </a>
      </section>

      <div className={styles.motionTicker} aria-hidden="true">
        <div className={styles.motionTickerTrack}>
          <span>Future is a verb</span><i>✦</i>
          <span>After Now</span><i>✦</i>
          <span>此刻之后</span><i>✦</i>
          <span>Designing What Comes Next</span><i>✦</i>
          <span>Future is a verb</span><i>✦</i>
          <span>After Now</span><i>✦</i>
          <span>此刻之后</span><i>✦</i>
          <span>Designing What Comes Next</span><i>✦</i>
        </div>
      </div>

      <section
        className={styles.manifesto}
        id="manifesto"
        aria-labelledby="manifesto-title"
      >
        <aside className={styles.manifestoRail} data-reveal>
          <span className={styles.manifestoNumber}>01</span>
          <span className={styles.manifestoRailLabel}>Manifesto</span>
          <span className={styles.manifestoRailBrand}>After Now<br />此刻之后</span>
        </aside>
        <div className={styles.manifestoMain}>
          <div className={styles.manifestoStage}>
            <h2 id="manifesto-title" data-reveal>
              <span>未来不是<br />抵达的地方。</span>
              <em>而是此刻<br />正在生成的东西。</em>
            </h2>
            <div className={styles.manifestoSignal} data-reveal>
              <span>Status / Active</span>
              <span>31.2304° N, 121.4737° E</span>
            </div>
          </div>
          <div className={styles.manifestoDetails} data-reveal>
            <p>
              此刻之后，是一个探索品牌、数字体验、空间与新兴技术的独立创意实践。
              我们让尚未发生的事，先被感知。
            </p>
            <p lang="en">
              The future begins as a feeling.
            </p>
          </div>
          <div className={styles.manifestoFooter} aria-hidden="true">
            <span>Manifesto / Position 001</span>
            <span>AfterNow.Studio</span>
          </div>
        </div>
      </section>

      <section className={styles.works} id="works" aria-labelledby="works-title">
        <div className={styles.sectionHeading} data-reveal>
          <div className={styles.sectionIndex}>
            <span>02</span>
            <span>Selected Works</span>
          </div>
          <h2 id="works-title">Selected<br />Works</h2>
          <p className={styles.techType} data-type="作品档案正在建立 / 001—003">
            作品档案正在建立 / 001—003
          </p>
        </div>

        <div className={styles.projectList}>
          {projects.map((project) => (
            <article className={styles.project} key={project.number} data-reveal>
              <div className={styles.projectTopline}>
                <span>{project.number}</span>
                <span>{project.discipline}</span>
                <span>{project.year}</span>
              </div>
              <div className={`${styles.projectVisual} ${project.visualClass}`}>
                <span className={styles.placeholderLabel}>
                  Concept visual · Replace with project imagery
                </span>
                {project.number === "01" && (
                  <>
                    <span className={styles.unseenPortal} aria-hidden="true" />
                    <span className={styles.unseenLight} aria-hidden="true" />
                  </>
                )}
                {project.number === "02" && (
                  <>
                    <span className={styles.machineSphere} aria-hidden="true" />
                    <span className={styles.machineTrack} aria-hidden="true" />
                    <span className={styles.machineLabel} aria-hidden="true">
                      ATTENTION / 0.01
                    </span>
                  </>
                )}
                {project.number === "03" && (
                  <>
                    <span className={styles.fieldContour} aria-hidden="true" />
                    <span className={styles.fieldDotOne} aria-hidden="true" />
                    <span className={styles.fieldDotTwo} aria-hidden="true" />
                    <span className={styles.fieldNote} aria-hidden="true">
                      Site 03<br />Observed 16:42
                    </span>
                  </>
                )}
              </div>
              <div className={styles.projectInfo}>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <span className={styles.projectArrow}><Arrow diagonal /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.lab} id="lab" aria-labelledby="lab-title">
        <div className={styles.labIntro}>
          <div className={styles.sectionIndex} data-reveal>
            <span>03</span>
            <span>After Now Lab</span>
          </div>
          <div className={styles.labTitleWrap} data-reveal>
            <p className={styles.techType} data-type="实验现场：正在运行">
              实验现场：正在运行
            </p>
            <h2 id="lab-title">LAB<sup>β</sup></h2>
          </div>
          <div className={styles.labObject} aria-hidden="true" data-reveal>
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className={styles.labGrid}>
          {labNotes.map((note) => (
            <article className={styles.labCard} key={note.index} data-reveal>
              <div>
                <span>{note.index}</span>
                <span>Open study</span>
              </div>
              <h3>{note.title}</h3>
              <p>{note.copy}</p>
              <span className={styles.labCardArrow}><Arrow diagonal /></span>
            </article>
          ))}
        </div>
        <div className={styles.productPreview} data-reveal>
          <div className={styles.productTopline}>
            <span>Product preview / 产品预留</span>
            <span>Package pending / 待接入</span>
          </div>
          <div className={styles.productBody}>
            <div className={styles.productLead}>
              <p className={styles.techType} data-type="产品接口预留完成">
                产品接口预留完成
              </p>
              <h3>智能抠图<br />与立体字生成</h3>
            </div>
            <div className={styles.productCopy}>
              <p>
                产品包接入后，访客可以直接在网站内免费体验 3 次；体验结束后，
                页面会自然推荐下载完整版本。
              </p>
              <span>待你提供打包产品文件后接入 →</span>
            </div>
          </div>
        </div>
        <p className={styles.labPlaceholder} data-reveal>
          Lab 内容目前为概念占位；产品模块将在收到打包文件后启用真实体验。
        </p>
      </section>

      <section
        className={styles.journal}
        id="journal"
        aria-labelledby="journal-title"
      >
        <div className={styles.journalHeader} data-reveal>
          <div className={styles.sectionIndex}>
            <span>04</span>
            <span>Journal</span>
          </div>
          <h2 id="journal-title">写给<br />近未来的笔记。</h2>
          <p>
            关于设计、技术、文化，以及它们之间尚未命名的空间。
          </p>
        </div>

        <div className={styles.journalList}>
          {journalEntries.map((entry) => (
            <article className={styles.journalEntry} key={entry.number} data-reveal>
              <span>{entry.number}</span>
              <h3>{entry.title}</h3>
              <span>{entry.category} · Draft placeholder</span>
              <Arrow diagonal />
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.contact}
        id="contact"
        aria-labelledby="contact-title"
      >
        <div className={styles.contactTopline} data-reveal>
          <div className={styles.sectionIndex}>
            <span>05</span>
            <span>Contact</span>
          </div>
          <span>Open to selected collaborations</span>
        </div>
        <div className={styles.contactMain}>
          <p
            className={styles.techType}
            data-reveal
            data-type="等待下一个共同创作者..."
          >
            等待下一个共同创作者...
          </p>
          <h2 id="contact-title" data-reveal>
            一起创造<br /><em>此刻之后。</em>
          </h2>
        </div>
        <div className={styles.contactDetails} data-reveal>
          <div>
            <span>Email</span>
            <strong>To be added / 待补充</strong>
          </div>
          <div>
            <span>Social</span>
            <strong>Links to be added / 待补充</strong>
          </div>
          <span className={styles.contactOrb} aria-hidden="true" />
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <span>After Now®</span>
          <span>此刻之后</span>
        </div>
        <p>Designing What Comes Next.</p>
        <a href="#top">Back to now ↑</a>
      </footer>
    </main>
  );
}
