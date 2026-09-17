import Link from "next/link";
import styles from "./tool.module.css";

export const metadata = { title: "小胡造造造 — After Now 工作台" };

export default function Page() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><small>AFTER NOW / TOOLS</small><h1>小胡造造造 <span>文字与图片立体化</span></h1></div>
      <nav><Link href="/lab/image-canvas">生图画布 ↗</Link><Link href="/#lab">返回实验室 ↗</Link></nav>
    </header>
    <details className={styles.notes}><summary>使用说明与网页版限制</summary>
      <p>输入文字或上传透明图片，调整尺寸与挤出参数，生成三维模型。支持 STL、OBJ、PLY、GLB、DAE，以及轮廓 SVG／DXF 导出。模型生成在你的浏览器完成，不消耗生图次数。</p>
      <p>SKP／DWG 直接导出、文件夹批量抠图需要桌面版。单图 AI 抠图首次需要从第三方下载模型资源；普通建模无需上传素材到服务器。建议使用桌面 Chrome 或 Edge。</p>
    </details>
    <iframe className={styles.tool} src="/zaozao/index.html" title="小胡造造造三维建模工具" sandbox="allow-scripts allow-same-origin allow-downloads" />
  </main>;
}
