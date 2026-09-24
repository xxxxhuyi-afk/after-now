# 小胡造造造网页集成

入口：`/lab/zaozao`，首页 Lab 的小胡造造造卡片。

从用户提供的 v2.3.0 桌面包 app.asar 提取浏览器界面和运行库，不运行 EXE，也不把 Electron、Python 或 DLL 发布到网站。原始工具封装在独立 iframe 内，避免与首页动效和样式冲突。外层沿用 After Now 字体与绿色标识；内部暂时保留原工具界面。

文字、透明图轮廓生成三维和通用格式下载沿用原逻辑。移除纯浏览器建模的三次试用限制。桌面专用批量抠图按钮隐藏；SKP/DWG 直接导出仍需要桌面软件。单图抠图依赖 staticimgly.com 在线模型资源，首次下载可能较慢或失败。没有接入生图 AI，也没有云端项目库。

运行：在项目根目录执行 `npm install`、`npm run dev`，访问 `http://localhost:3000/lab/zaozao`。生产检查：`npm run build`、`npm run lint`。

更新包内容直接合并到现有项目根目录，保持 app/public 路径。不要只上传 app：public/zaozao 的所有库文件是必要资源。没有生产部署。

验证：Next 构建、代码检查、路由和关键模块 HTTP 200。尚未完成浏览器内文字/图片建模、全部导出格式、中文字体、手机、WebGL 与在线抠图的实操验证。建议上线前用真实文字、透明 Logo 和非透明图片分别验证下载结果。
