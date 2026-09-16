# After Now Editor v0.1

## 运行

需要 Node.js 20.9 或更新版本（本次使用 Node 24.18）。在项目目录运行：

```sh
npm ci
npm run dev
```

打开 http://localhost:3000/edit 。首页 http://localhost:3000/ 保持只读。
正式构建检查：`npm run lint` 和 `npm run build`；本地运行构建结果：`npm start`。

## 使用

- 点击 Manifesto 主标题、中文说明或英文说明，出现绿色选框后拖动。
- 左侧调整 X/Y 偏移、字号、宽度和对齐；清空数值恢复该项原始样式。
- 可用元素下拉菜单选中屏幕外的文字。聚焦文字后方向键移动 1px，Shift + 方向键移动 10px。
- Desktop 使用 1440px 预览窗口，Mobile 使用 390px，实际触发首页媒体查询。窄屏下桌面画布可横向滚动。
- Save Draft 同时保存两套配置。刷新后恢复；切换设备不丢失未保存修改。
- Reset 恢复两套原始布局，需再点 Save Draft 持久保存重置结果。
- 导出草稿下载 JSON，可交给后续开发应用到正式页面。ZIP 不包含浏览器里另外保存的草稿，请单独导出。

## 实现及文件

仅新增以下文件，原始首页、样式、动效组件和依赖清单均未修改：

- `app/edit/page.tsx`：编辑入口、禁止索引元数据。
- `app/edit/editor.tsx`：选择、拖动、键盘、参数、两套草稿、验证、保存及导出。
- `app/edit/editor.module.css`：编辑器面板与预览画布样式。
- `app/edit/preview/page.tsx`：直接复用原始 Home 组件。
- `app/edit/preview/preview-ready.tsx`：React 完成挂载后的就绪信号，避免提前编辑造成 hydration 警告。
- `EDITOR.md`：本说明。

编辑器通过同源 iframe 操作白名单元素，样式只在预览文档中生效。偏移使用 CSS translate，不覆盖原始 transform 动画。监听器在窗口切换和卸载时清理；草稿使用带版本的 localStorage 数据并过滤类型、数值范围。

## 验证与限制

本地构建和 TypeScript 检查通过。ESLint 无错误，有原始 `app/layout.tsx` 外部字体的一条警告。
浏览器已检查字号、宽度、对齐、鼠标拖动、键盘移动、设备隔离、保存刷新及 Reset。

这版只开放 Manifesto 三个文字块，主标题作为整体移动。未实现文案编辑、图片编辑、撤销历史、Tablet、登录、多人同步或发布。编辑路径可访问但不能写入服务器。

草稿仅保存在当前浏览器和站点来源（localhost 与 127.0.0.1 的存储不同）；不会自动应用到首页。后续部署草稿需要把 JSON 转为响应式页面配置。

自由偏移允许文字重叠或超出区域，尚无吸附及碰撞约束。预览保留原站全部动效和媒体开销，未做全站手机性能重构，也未做真实 iPhone/Safari 验证。外部字体依赖网络。

交付包排除 node_modules、.next、Git 和本地缓存，保留完整 public 资源。未部署生产站。

## 纸卷实验（二级页面）
首页 Lab 的 Generative Form 卡片进入 /lab/generative-form，纸卷实验在独立二级页面自动加载，保留绿底；左上角返回 Lab。首页不再内嵌实验。动画依赖 CDN 和 WebGL。新增 app/lab/generative-form/page.tsx，更新 app/printing-roll.tsx、对应 CSS、首页与首页 CSS。

