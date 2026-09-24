import pptxgen from "pptxgenjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { title?: string; style?: string; slides?: Array<{ title?: string; body?: string }> };
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "After Now";
  pptx.subject = "After Now PPT Optimizer";
  pptx.title = body.title || "After Now presentation";
  const dark = body.style === "swiss";
  const paper = body.style === "white";
  const bg = dark ? "202124" : paper ? "FFFFFF" : "F8F7F3";
  const fg = dark ? "F5F5F2" : "17191B";
  const muted = dark ? "B9BABD" : "777777";
  for (const [index, item] of (body.slides || []).entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: bg };
    slide.addText(String(index + 1).padStart(2, "0"), { x: 0.65, y: 0.45, w: 0.6, h: 0.25, fontFace: "Courier New", fontSize: 10, color: muted, margin: 0 });
    slide.addText(item.title || body.title || "Untitled", { x: 0.65, y: 1.35, w: 11.8, h: 1.2, fontFace: "Georgia", fontSize: index === 0 ? 34 : 28, bold: index === 0, color: fg, margin: 0, breakLine: false, fit: "shrink" });
    if (item.body) slide.addText(item.body, { x: 0.7, y: 3.0, w: 8.8, h: 1.3, fontFace: "Arial", fontSize: 17, color: muted, breakLine: false, margin: 0.02, fit: "shrink", valign: "top" });
    slide.addText("AFTER NOW / PPT OPTIMIZER", { x: 0.65, y: 6.85, w: 4, h: 0.2, fontFace: "Courier New", fontSize: 8, color: muted, margin: 0 });
  }
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="after-now-deck.pptx"` } });
}
