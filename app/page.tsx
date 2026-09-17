import ArchiveMarquee from "./archive-marquee";
import CharacterIntro from "./character-intro";
import Experience from "./experience";
import WelcomeHero from "./welcome-hero";
import LabToolPreview from "./lab-tool-preview";
import ProjectSpotlight from "./project-spotlight";
import ProjectRedArchive from "./project-red-archive";
import ProjectVideoScrub from "./project-video-scrub";
import Link from "next/link";
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
    title: "After Now / 天台之后",
    discipline: "Visual narrative",
    year: "2026",
    description:
      "一次关于坠落、转身与重新进入未来的影像叙事。Moving image & visual archive.",
    visualClass: styles.visualField,
  },
];

const labNotes = [
  {
    index: "L—05",
    title: "Zao Zao Zao",
    subtitle: "小胡造造造",
    copy: "将文字与图片轮廓转成立体模型，预览、调整并导出。",
    english: "Turn type and image silhouettes into editable 3D forms.",
  },
  {
    index: "L—04",
    title: "Image Canvas",
    subtitle: "生图画布",
    copy: "把想象变成图像，在画布上自由排列。",
    english: "Turn imagination into images. Arrange them on your own canvas.",
  },
  {
    index: "L—01",
    title: "Paper Playground",
    subtitle: "纸卷游乐场",
    copy: "拖动引导纸卷，让图像沿途展开。点击暂停，留住此刻的轨迹。",
    english: "Guide the roll and let images unfold. Click to pause and hold the trail.",
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
      <WelcomeHero />

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
              <h3>{note.index === "L—05" ? <Link className={styles.labEntryLink} href="/lab/zaozao">{note.title}</Link> : note.index === "L—04" ? <Link className={styles.labEntryLink} href="/lab/image-canvas">{note.title}</Link> : note.index === "L—01" ? <Link className={styles.labEntryLink} href="/lab/generative-form">{note.title}</Link> : note.title}</h3>
              {note.subtitle && <h4 className={styles.labSubtitle}>{note.subtitle}</h4>}
              <p>{note.copy}</p>
              {note.english && <p lang="en" className={styles.labEnglish}>{note.english}</p>}
              <span className={styles.labCardArrow}><Arrow diagonal /></span>
              {note.index === "L—05" && <LabToolPreview />}
              {note.index === "L—04" && <LabToolPreview tool="canvas" />}
              {note.index === "L—01" && <LabToolPreview tool="paper" />}
            </article>
          ))}
        </div>
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
                {project.number === "01" && (
                  <ProjectSpotlight />
                )}
                {project.number === "02" && (
                  <ProjectVideoScrub />
                )}
                {project.number === "03" && (
                  <ProjectRedArchive />
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

      <CharacterIntro />

      <ArchiveMarquee />

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
