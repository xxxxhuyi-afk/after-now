import { cookies } from "next/headers";

export const sessionCookie = "after-now-canvas-session";
export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key && service ? { url: url.replace(/\/$/, ""), key, service } : null;
}
export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get("origin") ?? "");
    const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return origin.host === request.headers.get("host") && origin.protocol === `${protocol}:`;
  } catch { return false; }
}
export async function getCanvasUser() {
  const config = authConfig();
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!config || !token) return null;
  const response = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.key, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  const user = await response.json();
  // Public generation requires a verified email, even if signup settings change.
  return user.id && user.email_confirmed_at ? { id: String(user.id), email: String(user.email) } : null;
}
function limit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= 10000 ? value : fallback;
}
export async function canvasQuota(userId: string, reserve = false) {
  const config = authConfig();
  if (!config) throw new Error("NOT_CONFIGURED");
  const response = await fetch(`${config.url}/rest/v1/rpc/canvas_quota`, { method: "POST", headers: { apikey: config.service, Authorization: `Bearer ${config.service}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_user: userId, p_reserve: reserve, p_user_limit: limit("IMAGE_CANVAS_USER_DAILY_LIMIT", 3), p_global_limit: limit("IMAGE_CANVAS_GLOBAL_DAILY_LIMIT", 30) }), cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("QUOTA_UNAVAILABLE");
  return await response.json() as { allowed: boolean; reason: string; remaining: number; globalRemaining: number; userLimit: number; globalLimit: number; resetsAt: string };
}
