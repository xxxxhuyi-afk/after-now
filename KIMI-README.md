# After Now / 此刻之后

这是 After Now 的 Next.js 16 首页版本，当前首屏使用赛博黑猫视觉与克制的中文排版。

## 本地运行

```bash
npm install
npm run dev
```

然后打开 `http://localhost:3000/`。

## 检查构建

```bash
npm run lint
npm run build
```

## 主要文件

- `app/page.tsx`：首页结构、文案与页面区块
- `app/page.module.css`：视觉样式、响应式布局与首屏动效
- `app/experience.tsx`：鼠标追踪、吊灯光标、滚动进度与打字效果
- `public/after-now-cyber-cat-hero.png`：赛博黑猫首屏视觉资产
- `design-reference-cyber-cat-hero.png`：本版设计参考图

## 当前首屏交互

- 鼠标移动会让黑猫视觉轻微跟随，并唤醒 `AWAKE` 状态
- 页面保留吊灯式光标与滚动进度线
- 中文辅助文字使用科技打字效果
- 支持 `prefers-reduced-motion`
- 手机端会自动切换为单列构图，并隐藏桌面导航

## 仍然是占位的内容

Selected Works 的项目图片、Contact 邮箱/社交链接，以及 Lab 中的抠图与立体字产品包还没有接入。收到真实素材后，优先替换这些位置即可。

## 说明

本包不包含 `node_modules` 和 `.next` 构建缓存。安装依赖后即可运行。当前没有执行部署操作。
