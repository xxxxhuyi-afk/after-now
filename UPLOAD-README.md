# After Now 网站更新包

此包用于更新 Vercel 已连接的 GitHub 仓库 `after-now`。请先解压，再把解压后的文件和文件夹按原有目录结构上传到 GitHub 仓库的 `main` 分支；不要把 ZIP 文件本身放进仓库。GitHub 提交后，Vercel 会自动开始部署。

包内包含网站源码、画布、依赖清单、静态资源和数据库 SQL。为减小体积，已排除 `.git`、`node_modules`、`.next`、本地 `.env.local`、模型权重、运行缓存和生成图片。生产环境需要的 Cloudflare 与 Supabase 变量已经配置在 Vercel 项目中；请保留这些 Vercel 设置，不要把本地 `.env.local.example` 上传成环境变量。

在线版默认使用 Cloudflare Workers AI。要在自己电脑运行本地开源模型，按 `IMAGE-CANVAS.md` 设置本机的 D 盘路径；不要把 `IMAGE_CANVAS_PROVIDER=local` 加到 Vercel 生产环境。

发布前，本地 `npm run build` 已通过。

本包保留首页优化、合境、PPT 工具和最新画布。8 张首页与项目图片已转换为较小的 WebP；部署配置明确使用 npm 安装与构建。

在线生图尚未完成部署后的实际验证；构建通过不代表生图服务已经跑通。部署完成后，需要登录并实际生成一张图片，确认模型服务、额度和图片返回正常。
