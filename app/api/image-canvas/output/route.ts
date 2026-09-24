import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.IMAGE_CANVAS_PROVIDER !== "local") return Response.json({ error: "本地生图模式未启用。" }, { status: 404 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "图片地址无效。" }, { status: 400 });
  const dataRoot = process.env.AFTER_NOW_LOCAL_DATA;
  if (!dataRoot) return Response.json({ error: "本地图片目录未配置。" }, { status: 503 });
  try {
    const image = await readFile(path.join(dataRoot, "outputs", `${id}.png`));
    return new Response(image, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "本地图片文件不存在。" }, { status: 404 });
  }
}
