export type ImageCount = 1 | 2 | 3 | 4;

export async function readImageBatch(response: Response, count: ImageCount, callbacks: {
  onResult: (src: string, index: number) => void;
  onProgress: (finished: number) => void;
}) {
  if (!response.headers.get("content-type")?.startsWith("application/x-ndjson") || !response.body) throw new Error("服务器尚未更新为批量生图版本，请更新后端并重新部署。");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  const seen = new Set<number>(), errors: string[] = [];
  let completed = 0, buffer = "";
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as { index: number; src?: string; error?: string };
    if (!Number.isInteger(event.index) || event.index < 0 || event.index >= count || seen.has(event.index)) throw new Error("批量结果编号无效，请重试。");
    if (typeof event.src === "string" && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(event.src) || /^\/api\/image-canvas\/output\?id=[A-Za-z0-9%._-]+$/.test(event.src))) {
      callbacks.onResult(event.src, event.index); completed += 1;
    } else if (typeof event.error === "string" && event.error.trim()) errors.push(`第 ${event.index + 1} 张：${event.error}`);
    else throw new Error("服务器返回了无效图片结果。");
    seen.add(event.index); callbacks.onProgress(seen.size);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 16_000_000) throw new Error("单张图片结果过大，请减少分辨率。");
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) { consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); }
      if (done) { consume(buffer); break; }
    }
    if (seen.size !== count) errors.push(`${count - seen.size} 张结果未返回，已有图片保留。`);
    return { completed, errors };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
