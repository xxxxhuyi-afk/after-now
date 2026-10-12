/** One authenticated, quota-reserved request starts all images concurrently. */
export function streamImageBatch(count: number, generate: () => Promise<string>, headers: HeadersInit = {}) {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await Promise.all(Array.from({ length: count }, async (_, index) => {
        let event: { index: number; src?: string; error?: string };
        try { event = { index, src: await generate() }; }
        catch (error) { event = { index, error: error instanceof Error ? error.message : "生图失败，请稍后重试。" }; }
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }));
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; },
  });
  return new Response(stream, { headers: { ...Object.fromEntries(new Headers(headers)), "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Canvas-Count": String(count) } });
}
