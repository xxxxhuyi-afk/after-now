"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./archive-marquee.module.css";

type Book = {
  id: string;
  title: string;
  originalTitle: string;
  author: string;
  year: string;
  quote: string;
  translation: string;
  sourceUrl: string;
  color: string;
  ink: string;
  spriteIndex: number;
  atlas?: 1 | 2;
  heightOffset: string;
};

const books: Book[] = [
  { id: "invincible-summer", title: "不可战胜的夏天", originalTitle: "Il y avait en moi un été invincible", author: "阿尔贝·加缪", year: "1954", quote: "In the midst of winter, I found there was, within me, an invincible summer.", translation: "在隆冬之中，我终于知道，我身上有一个不可战胜的夏天。", sourceUrl: "https://www.camus-society.com/return-to-tipasa-albert-camus.html", color: "#6d2929", ink: "#f1ede3", spriteIndex: 0, heightOffset: "-0.5rem" },
  { id: "the-stranger", title: "局外人", originalTitle: "L'Étranger", author: "阿尔贝·加缪", year: "1942", quote: "I opened myself to the gentle indifference of the world.", translation: "我向世界温柔的冷漠敞开了自己。", sourceUrl: "https://books.google.com/books/about/The_Stranger.html?id=iVV7bKVUNBAC", color: "#e5e0d5", ink: "#171815", spriteIndex: 1, heightOffset: "0.2rem" },
  { id: "nineteen-eighty-four", title: "1984", originalTitle: "Nineteen Eighty-Four", author: "乔治·奥威尔", year: "1949", quote: "Freedom is the freedom to say that two plus two make four.", translation: "自由，就是说二加二等于四的自由。", sourceUrl: "https://www.enotes.com/topics/1984/questions/on-what-page-does-winston-say-that-freedom-is-the-639028", color: "#18382f", ink: "#eee9dc", spriteIndex: 2, heightOffset: "0.7rem" },
  { id: "summer-outside", title: "外面是夏天", originalTitle: "바깥은 여름", author: "金爱烂", year: "2017", quote: "Inside, white snow is falling. Outside, it is all summer.", translation: "里面白雪纷飞，外面却是整个夏天。", sourceUrl: "https://librairiecoreenne.fr/en/products/its-summer-outside", color: "#c4d000", ink: "#1c301b", spriteIndex: 3, heightOffset: "-0.2rem" },
  { id: "caligula", title: "卡利古拉", originalTitle: "Caligula", author: "阿尔贝·加缪", year: "1944", quote: "Men die; and they are not happy.", translation: "人终有一死，而他们活得并不幸福。", sourceUrl: "https://en.wikipedia.org/wiki/Caligula_(play)", color: "#d6d1c6", ink: "#22231f", spriteIndex: 4, heightOffset: "0.4rem" },
  { id: "night-decay", title: "我歌唱夜色将尽", originalTitle: "I Shall Sing When Night's Decay", author: "艾米莉·勃朗特", year: "1846", quote: "True to myself and true to all\nMay I be healthful still\nAnd turn away from passion's call\nAnd curb my own wild will", translation: "忠实于自己，忠实于他人，\n愿我依然身心康宁；\n规避一切过分的激情，\n收束自己狂野的心。", sourceUrl: "https://en.wikisource.org/wiki/Author:Emily_Bront%C3%AB", color: "#173a62", ink: "#f0eee7", spriteIndex: 5, heightOffset: "0.8rem" },
  { id: "assassination-thatcher", title: "刺杀撒切尔", originalTitle: "The Assassination of Margaret Thatcher", author: "希拉里·曼特尔", year: "2014", quote: "Mrs Thatcher went on living till she died.", translation: "撒切尔夫人继续活着，直到她死去。", sourceUrl: "https://www.theguardian.com/books/2014/sep/19/hilary-mantel-short-story-assassination-margaret-thatcher", color: "#727a7d", ink: "#f1eee6", spriteIndex: 6, heightOffset: "-0.7rem" },
  { id: "siddhartha", title: "悉达多", originalTitle: "Siddhartha", author: "赫尔曼·黑塞", year: "1922", quote: "Everything comes back again.", translation: "一切都会再次回来。", sourceUrl: "https://www.gutenberg.org/files/58344/58344-h/58344-h.htm", color: "#17483b", ink: "#eeeae0", spriteIndex: 7, heightOffset: "0.1rem" },
  { id: "lord-of-flies", title: "蝇王", originalTitle: "Lord of the Flies", author: "威廉·戈尔丁", year: "1954", quote: "Maybe there is a beast. Maybe it's only us.", translation: "也许真的有野兽，也许野兽就是我们自己。", sourceUrl: "https://austin.bibliocommons.com/v2/quotation/1035610057", color: "#222421", ink: "#eee9dd", spriteIndex: 8, heightOffset: "-0.3rem" },
  { id: "gatsby", title: "了不起的盖茨比", originalTitle: "The Great Gatsby", author: "F. S. 菲茨杰拉德", year: "1925", quote: "So we beat on, boats against the current, borne back ceaselessly into the past.", translation: "于是我们奋力前行，小舟逆流而上，却不断被推回过去。", sourceUrl: "https://www.gutenberg.org/ebooks/64317", color: "#12372d", ink: "#eee8dc", spriteIndex: 0, atlas: 2, heightOffset: "0.5rem" },
  { id: "metamorphosis", title: "变形记", originalTitle: "The Metamorphosis", author: "弗兰茨·卡夫卡", year: "1915", quote: "What has happened to me?", translation: "我究竟发生了什么？", sourceUrl: "https://www.gutenberg.org/ebooks/5200", color: "#d7d0c1", ink: "#1e201e", spriteIndex: 1, atlas: 2, heightOffset: "-0.4rem" },
  { id: "crime-punishment", title: "罪与罚", originalTitle: "Crime and Punishment", author: "陀思妥耶夫斯基", year: "1866", quote: "Pain and suffering are always inevitable for a large intelligence and a deep heart.", translation: "痛苦与磨难，对于深邃的思想和心灵总是不可避免。", sourceUrl: "https://www.gutenberg.org/ebooks/2554", color: "#9a3326", ink: "#f3e9dc", spriteIndex: 2, atlas: 2, heightOffset: "0.2rem" },
  { id: "underground", title: "地下室手记", originalTitle: "Notes from Underground", author: "陀思妥耶夫斯基", year: "1864", quote: "I am a sick man. I am a spiteful man.", translation: "我是一个有病的人，我是一个心怀恶意的人。", sourceUrl: "https://www.gutenberg.org/ebooks/600", color: "#373836", ink: "#eeeae1", spriteIndex: 3, atlas: 2, heightOffset: "0.6rem" },
  { id: "the-trial", title: "审判", originalTitle: "The Trial", author: "弗兰茨·卡夫卡", year: "1925", quote: "Someone must have been telling lies about Joseph K.", translation: "一定是有人诬告了约瑟夫·K。", sourceUrl: "https://www.gutenberg.org/ebooks/7849", color: "#c9c4b9", ink: "#20211f", spriteIndex: 4, atlas: 2, heightOffset: "-0.1rem" },
  { id: "pride-prejudice", title: "傲慢与偏见", originalTitle: "Pride and Prejudice", author: "简·奥斯汀", year: "1813", quote: "My good opinion once lost, is lost forever.", translation: "我对一个人的好感一旦失去，便永远失去了。", sourceUrl: "https://www.gutenberg.org/ebooks/1342", color: "#9da6a0", ink: "#1f211f", spriteIndex: 5, atlas: 2, heightOffset: "0.4rem" },
  { id: "dorian-gray", title: "道林·格雷的画像", originalTitle: "The Picture of Dorian Gray", author: "奥斯卡·王尔德", year: "1890", quote: "The books that the world calls immoral are books that show the world its own shame.", translation: "世人所谓不道德的书，不过是让世界看见了自己的羞耻。", sourceUrl: "https://www.gutenberg.org/ebooks/174", color: "#273f38", ink: "#eee9df", spriteIndex: 6, atlas: 2, heightOffset: "-0.5rem" },
  { id: "zarathustra", title: "查拉图斯特拉如是说", originalTitle: "Thus Spoke Zarathustra", author: "弗里德里希·尼采", year: "1883", quote: "One must still have chaos in oneself to give birth to a dancing star.", translation: "一个人必须心怀混沌，才能诞生一颗跳舞的星。", sourceUrl: "https://www.gutenberg.org/ebooks/1998", color: "#203d67", ink: "#eee9db", spriteIndex: 7, atlas: 2, heightOffset: "0.7rem" },
  { id: "meditations", title: "沉思录", originalTitle: "Meditations", author: "马可·奥勒留", year: "180", quote: "The happiness of your life depends upon the quality of your thoughts.", translation: "你一生的幸福，取决于你的思想品质。", sourceUrl: "https://www.gutenberg.org/ebooks/2680", color: "#d8d1c2", ink: "#242520", spriteIndex: 8, atlas: 2, heightOffset: "0rem" },
];

function artStyle(index: number, atlas: 1 | 2 = 1): CSSProperties {
  return {
    backgroundImage: `url(/reading/original-cover-atlas${atlas === 2 ? "-2" : ""}.png)`,
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  };
}

export default function ArchiveMarquee() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const wandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedBook) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelectedBook(null);
    const root = document.documentElement;
    const previousPointerMode = root.dataset.pointer;
    const previousOverflow = document.body.style.overflow;
    const moveWand = (event: PointerEvent) => {
      if (!wandRef.current) return;
      wandRef.current.style.opacity = "1";
      wandRef.current.style.transform = `translate3d(${event.clientX + 8}px, ${event.clientY - 30}px, 0)`;
    };
    const hideWand = () => { if (wandRef.current) wandRef.current.style.opacity = "0"; };
    delete root.dataset.pointer;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointermove", moveWand, { passive: true });
    document.documentElement.addEventListener("pointerleave", hideWand);
    return () => {
      if (previousPointerMode) root.dataset.pointer = previousPointerMode;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", moveWand);
      document.documentElement.removeEventListener("pointerleave", hideWand);
    };
  }, [selectedBook]);

  return (
    <section className={styles.section} id="reading-room" aria-labelledby="books-title">
      <header className={styles.header}>
        <p>Selected reading / 2026</p>
        <nav aria-label="Reading room navigation"><a href="#about">About</a><a href="#books-title">Archive</a><a href="#journal">Journal</a></nav>
        <div className={styles.titleBlock}>
          <h2 id="books-title">After Now<br />Reading Room</h2>
          <div className={styles.subtitle}><span>阅读室</span><small>Thoughts for After Now.</small></div>
        </div>
        <div className={styles.intro}>
          <p>从小说、诗歌与思想中，保存那些值得再次读起的句子。</p>
          <span>Curated by After Now</span>
        </div>
      </header>

      <div className={styles.shelf} aria-label="自动重复滚动的 After Now 推荐书架">
        <div className={styles.marqueeTrack}>
          {[0, 1].map((group) => (
            <div className={styles.books} key={group} aria-hidden={group === 1}>
              {[0, 1, 2, 3].map((cycle) => books.map((book) => (
                  <button
                    className={styles.book}
                    type="button"
                    key={`${group}-${cycle}-${book.id}`}
                    onClick={() => setSelectedBook(book)}
                    tabIndex={group === 0 && cycle === 0 ? 0 : -1}
                    aria-label={`暂停并打开《${book.title}》精选段落`}
                    style={{ "--book-color": book.color, "--book-ink": book.ink, "--height-offset": book.heightOffset } as CSSProperties}
                  >
                    <span className={styles.spineCopy}><strong>{book.title}</strong><small>{book.author}</small></span>
                    <span className={styles.coverPreview} aria-hidden="true">
                      <span className={styles.coverArt} style={artStyle(book.spriteIndex, book.atlas)} />
                      <span className={styles.coverType}><strong>{book.title}</strong><small>{book.author}</small><i>{book.originalTitle}</i></span>
                    </span>
                  </button>
                ))) }
            </div>
          ))}
        </div>
        <div className={styles.shelfEdge} />
      </div>
      <p className={styles.hint}>悬停暂停，封面展开后点击阅读</p>

      {selectedBook && (
        <div className={styles.backdrop} role="presentation" onMouseDown={() => setSelectedBook(null)}>
          <div ref={wandRef} className={styles.wandCursor} aria-hidden="true"><span>🪄</span><i>✦</i></div>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="reading-title" onMouseDown={() => setSelectedBook(null)}>
            <header className={styles.dialogHeader} onMouseDown={(event) => event.stopPropagation()}><span>After Now Reading Room</span><button className={styles.close} type="button" onClick={() => setSelectedBook(null)} autoFocus><span>返回书架</span><b aria-hidden="true">×</b></button></header>
            <div className={styles.detailCover} onMouseDown={(event) => event.stopPropagation()}>
              <span className={styles.coverArt} style={artStyle(selectedBook.spriteIndex, selectedBook.atlas)} />
              <span className={styles.detailCoverType}><strong>{selectedBook.title}</strong><small>{selectedBook.author}</small><i>{selectedBook.originalTitle}</i></span>
            </div>
            <article className={styles.copy} onMouseDown={(event) => event.stopPropagation()}>
              <div className={styles.bookHeading}><p>{selectedBook.author} / {selectedBook.year}</p><h3 id="reading-title">{selectedBook.title}</h3><span>{selectedBook.originalTitle}</span></div>
              <div className={styles.quotation}>
                <blockquote lang="en">{selectedBook.quote}</blockquote>
                <div><p>{selectedBook.translation}</p><a href={selectedBook.sourceUrl} target="_blank" rel="noreferrer">查看文字来源 ↗</a></div>
              </div>
            </article>
          </section>
        </div>
      )}
    </section>
  );
}
