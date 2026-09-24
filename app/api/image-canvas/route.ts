import { authConfig, canvasQuota, getCanvasUser, sameOrigin } from "../../canvas-server";

export const runtime = "nodejs";
// The hosted image provider is fast enough for the platform's standard function window.
// Local development still talks directly to the separately running local model service.
export const maxDuration = 60;

export async function POST(request: Request) {
  if (process.env.IMAGE_CANVAS_PROVIDER === "local") {
    if (!sameOrigin(request)) return Response.json({ error: "请求来源不正确。" }, { status: 403 });
    try {
      const text = await request.text();
      if (text.length > 4000) return Response.json({ error: "描述太长，请缩短后重试。" }, { status: 400 });
      const body = JSON.parse(text);
      if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 1500) return Response.json({ error: "请输入 1–1500 字的描述。" }, { status: 400 });
      const response = await fetch("http://127.0.0.1:8765/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: body.prompt.trim(), ratio: body.ratio, style: body.style }),
        signal: AbortSignal.timeout(570000), cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        return Response.json({ error: result?.error ?? "本地模型生成失败，请查看本地模型服务窗口。" }, { status: response.status });
      }
      return new Response(await response.arrayBuffer(), { headers: { "Content-Type": response.headers.get("content-type") ?? "image/png", "Cache-Control": "no-store", ...(response.headers.get("x-canvas-image-id") ? { "X-Canvas-Image-Id": response.headers.get("x-canvas-image-id")! } : {}) } });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") return Response.json({ error: "本地模型生成超过 9 分钟，请查看显存并重试。" }, { status: 504 });
      return Response.json({ error: "本地模型服务未启动。请先运行本地生图服务，再刷新画布。" }, { status: 503 });
    }
  }
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token || !authConfig()) return Response.json({ error: "访客生图服务尚未连接，请联系网站作者。" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不正确。" }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 4000) return Response.json({ error: "描述太长，请缩短后重试。" }, { status: 400 });
    const body = JSON.parse(text);
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 1500) return Response.json({ error: "请输入 1–1500 字的描述。" }, { status: 400 });
    const user = await getCanvasUser();
    if (!user) return Response.json({ error: "请先登录并完成邮箱验证。" }, { status: 401 });
    const quota = await canvasQuota(user.id, true);
    if (!quota.allowed) return Response.json({ error: quota.reason === "global" ? "今日全站生成额度已用完，明天再来创作吧。" : quota.reason === "cooldown" ? "请间隔一分钟再生成。" : "你今天的生成次数已用完，明天再来吧。", quota }, { status: 429 });
    const dimensions: Record<string, [number, number]> = {
      "16:9": [1024, 576], "9:16": [576, 1024], "4:3": [1024, 768], "3:4": [768, 1024],
      "1:1": [768, 768], "3:2": [960, 640], "2:3": [640, 960],
    };
    const [width, height] = dimensions[body.ratio] ?? dimensions["16:9"];
    const rules: Record<string, string> = { original: "", after: ", experimental editorial art, acid green and cobalt blue, sculptural forms, minimal composition, no text", photo: ", cinematic photography, natural light, detailed textures" };
    const form = new FormData();
    form.append("prompt", body.prompt.trim() + (rules[body.style] ?? ""));
    form.append("width", String(width));
    form.append("height", String(height));
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
      body: form, signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) return Response.json({ error: response.status === 429 ? "服务额度或请求次数已达上限，请稍后再试。" : "生图服务暂时未完成请求，请检查后台账号权限或稍后重试。" }, { status: 502 });
    const contentType = response.headers.get("content-type") ?? "";
    let image: ArrayBuffer;
    let imageType = "image/png";
    if (contentType.startsWith("image/")) {
      image = await response.arrayBuffer();
      imageType = contentType;
    } else {
      const result = await response.json().catch(() => null) as { result?: { image?: unknown }; image?: unknown } | null;
      const encoded = typeof result?.result?.image === "string" ? result.result.image : typeof result?.image === "string" ? result.image : null;
      if (!encoded) return Response.json({ error: "服务返回了非图片结果，请检查模型是否可用。" }, { status: 502 });
      const base64 = encoded.replace(/^data:image\/[^;]+;base64,/, "");
      const bytes = Buffer.from(base64, "base64");
      if (!bytes.length) return Response.json({ error: "服务返回的图片无法读取，请稍后重试。" }, { status: 502 });
      image = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      imageType = bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
    }
    return new Response(image, { headers: { "Content-Type": imageType, "Cache-Control": "no-store", "X-Canvas-Remaining": String(quota.remaining) } });
  } catch {
    return Response.json({ error: "生成超时或请求格式不正确，请稍后重试。" }, { status: 502 });
  }
}
