# After Now 上线清单

当前状态：**首页 1.0 已完成并通过 `npm run lint` 与 `npm run build`；尚未初始化 Git，也没有执行任何部署。**

预计人工操作时间约 20–30 分钟，DNS 完全生效可能需要更久。

## 0. 上线前准备

- 确认首页中的作品概念图、Lab/Journal 草稿和联系方式占位内容可以暂时公开。
- 在项目目录 `C:\Users\Administrator\after-now` 运行：

```bash
npm run lint
npm run build
```

- 不要把密码、令牌或私密配置提交到 GitHub。当前项目不需要环境变量。

## 1. 保存到 Git

项目目前还不是 Git 仓库。第一次执行：

```bash
git init -b main
git add .
git status
git commit -m "Build After Now homepage 1.0"
```

在 `git status` 中确认 `.next`、`node_modules` 等目录没有被加入；它们已由 `.gitignore` 排除。

## 2. 推送到 GitHub

如果 GitHub 上还没有仓库，先新建一个名为 `after-now` 的**空仓库**，不要额外生成 README、License 或 `.gitignore`。

然后把下面的地址替换为实际 GitHub 用户名：

```bash
git remote add origin https://github.com/YOUR-NAME/after-now.git
git remote -v
git push -u origin main
```

如果提示 `origin already exists`，先查看 `git remote -v`；确认要使用的仓库后再执行：

```bash
git remote set-url origin https://github.com/YOUR-NAME/after-now.git
git push -u origin main
```

官方参考：[GitHub — Adding locally hosted code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

## 3. 在 Vercel 创建项目

1. 用 GitHub 登录 Vercel。
2. 选择 **Add New → Project**。
3. 找到并导入 `after-now` 仓库。
4. 确认 Framework Preset 自动识别为 **Next.js**，Root Directory 保持项目根目录 `.`。
5. 当前版本不需要添加 Environment Variables。
6. 点击 **Deploy**。
7. 打开 Vercel 生成的 `*.vercel.app` 地址，检查首屏、Works、Lab、Journal、Contact 和移动端显示。

连接 Git 仓库后，后续向生产分支 `main` 推送新提交会自动触发生产部署。

官方参考：[Vercel — Deploying Git repositories](https://vercel.com/docs/git)

## 4. 绑定 after-now.com

建议本次保留腾讯云/DNSPod 作为 DNS 管理方，不需要更换域名的 NS 服务器。

1. 进入 Vercel 项目 **Settings → Domains**。
2. 添加 `after-now.com`。
3. 同时添加 `www.after-now.com`，并设置它重定向到 `after-now.com`，让品牌主地址保持简洁。
4. Vercel 会显示该项目当前需要的 DNS 记录。**以页面显示的精确值为准，不要提前写死记录值。** 通常是：
   - 根域名：主机记录 `@`，类型 `A`，记录值复制 Vercel 给出的 IP。
   - `www`：主机记录 `www`，类型 `CNAME`，记录值复制 Vercel 给出的专属目标。
   - 如果 Vercel 要求所有权验证，再添加它给出的 `TXT` 记录。
5. 打开腾讯云 **云解析 DNS → 权威解析 → after-now.com → 添加记录**：
   - 线路类型选择“默认”。
   - TTL 使用默认值（通常为 600 秒）即可。
   - 添加上一项中 Vercel 给出的 `@` 与 `www` 记录。
6. 如已存在同名的 `@` A/AAAA 或 `www` A/CNAME 记录，先核对用途，再删除或修改冲突项；不要删除邮箱所需的 MX/TXT 记录。
7. 回到 Vercel Domains 页面等待状态变为 **Valid Configuration**。SSL 证书会自动签发。

Vercel 提供通用 DNS 值，但项目可能得到专属值，因此应始终复制控制台当前显示的记录。普通 DNS 变更通常较快，也可能需要最多 24 小时完成传播。

官方参考：

- [Vercel — Setting up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel — Adding and configuring a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [腾讯云 — 快速添加域名解析](https://cloud.tencent.com/document/product/302/3446)
- [腾讯云 — 主机记录和记录值](https://cloud.tencent.com/document/faq/302/3468)

## 5. 最终验收

- `https://after-now.com` 可以打开且证书有效。
- `https://www.after-now.com` 自动跳转到 `https://after-now.com`。
- `http://after-now.com` 自动跳转到 HTTPS。
- 桌面与手机均能正常滚动，没有横向滚动条。
- 浏览器标题显示 `After Now / 此刻之后`。
- 中文文案无乱码。
- Vercel Deployment 页面显示生产分支为 `main`。

## 后续内容更新

准备好作品图片、项目介绍、邮箱、社交链接、品牌图标与分享封面后，替换页面中的显式占位内容，再提交并推送：

```bash
git add .
git commit -m "Update After Now content"
git push
```

Vercel 会自动发布新版本。
