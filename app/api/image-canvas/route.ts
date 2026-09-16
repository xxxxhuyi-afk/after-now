import { authConfig, canvasQuota, getCanvasUser, sameOrigin } from "../../canvas-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
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
    const dimensions: Record<string, [number, number]> = { square: [768, 768], landscape: [1024, 768], portrait: [768, 1024] };
    const [width, height] = dimensions[body.ratio] ?? dimensions.square;
    const rules: Record<string, string> = { original: "", after: ", experimental editorial art, acid green and cobalt blue, sculptural forms, minimal composition, no text", photo: ", cinematic photography, natural light, detailed textures" };
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: body.prompt.trim() + (rules[body.style] ?? ""), width, height, num_steps: 20 }), signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) return Response.json({ error: response.status === 429 ? "服务额度或请求次数已达上限，请稍后再试。" : "生图服务暂时未完成请求，请检查后台账号权限或稍后重试。" }, { status: 502 });
    if (!(response.headers.get("content-type") ?? "").startsWith("image/")) return Response.json({ error: "服务返回了非图片结果，请检查模型是否可用。" }, { status: 502 });
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": response.headers.get("content-type")!, "Cache-Control": "no-store", "X-Canvas-Remaining": String(quota.remaining) } });
  } catch {
    return Response.json({ error: "生成超时或请求格式不正确，请稍后重试。" }, { status: 502 });
  }
}
