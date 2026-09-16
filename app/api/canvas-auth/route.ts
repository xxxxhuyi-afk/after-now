import { NextResponse } from "next/server";
import { authConfig, canvasQuota, getCanvasUser, sameOrigin, sessionCookie } from "../../canvas-server";

export const runtime = "nodejs";
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
export async function GET() {
  if (!authConfig()) return json({ configured: false, user: null });
  try { const user = await getCanvasUser(); return json({ configured: true, user, quota: user ? await canvasQuota(user.id) : null }); }
  catch { return json({ error: "账号或次数记录暂时无法读取，请稍后重试。" }, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请求来源不正确。" }, 403);
  const config = authConfig();
  if (!config) return json({ error: "访客账号服务尚未连接，请联系网站作者。" }, 503);
  try {
    const text = await request.text();
    if (text.length > 2000) return json({ error: "请求过长。" }, 400);
    const body = JSON.parse(text);
    if (body.action === "logout") {
      const response = json({ user: null });
      response.cookies.set(sessionCookie, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
      return response;
    }
    if (!["login", "signup"].includes(body.action) || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254 || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) return json({ error: "请输入有效邮箱和 8–128 位密码。" }, 400);
    const signup = body.action === "signup";
    const result = await fetch(`${config.url}/auth/v1/${signup ? "signup" : "token?grant_type=password"}`, { method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ email: body.email.trim(), password: body.password }), signal: AbortSignal.timeout(10000) });
    const data = await result.json();
    if (!result.ok) return json({ error: result.status === 429 ? "操作太频繁，请稍后重试。" : signup ? "注册未完成，请检查邮箱和密码或稍后重试。" : "登录失败，请检查密码，并确认已完成邮箱验证。" }, result.status === 429 ? 429 : 400);
    if (signup) return json({ message: "请查收验证邮件，完成邮箱验证后再登录。如果已有账号，请直接登录。", user: null });
    if (!data.access_token || !data.user?.email_confirmed_at) return json({ error: "请先完成邮箱验证。" }, 401);
    const response = json({ user: { id: data.user.id, email: data.user.email }, quota: await canvasQuota(data.user.id) });
    response.cookies.set(sessionCookie, data.access_token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.min(Number(data.expires_in) || 3600, 3600) });
    return response;
  } catch { return json({ error: "账号服务暂时无法完成请求，请稍后重试。" }, 503); }
}
