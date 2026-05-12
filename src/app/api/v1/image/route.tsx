import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 30;

function resolveText(layer: any, variables: Record<string, string>): string {
  const raw = layer.text || "";
  if (layer.name && variables[layer.name] !== undefined) return variables[layer.name]!;
  if (variables[raw] !== undefined) return variables[raw]!;
  return raw;
}

function esc(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\n/g, "<br>");
}

function hexRgba(hex: string, a: number) {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

function buildHTML(
  canvas: { width: number; height: number; background: string },
  layers: any[],
  variables: Record<string, string>
): string {
  const W = canvas.width || 1200;
  const H = canvas.height || 630;
  const bg = canvas.background || "#ffffff";

  let html = "";
  for (const layer of layers.filter((l: any) => l.visible !== false)) {
    const x = Math.round(layer.x ?? 0);
    const y = Math.round(layer.y ?? 0);
    const w = Math.round(layer.width ?? 100);
    const h = Math.round(layer.height ?? 40);
    const op = layer.opacity ?? 1;
    const rot = layer.rotation ?? 0;
    const transform = rot ? `transform:rotate(${rot}deg);` : "";

    const shadow = (layer.shadowOpacity > 0 && layer.shadowColor)
      ? `${layer.shadowOffsetX || 0}px ${layer.shadowOffsetY || 0}px ${layer.shadowBlur || 0}px ${hexRgba(layer.shadowColor, layer.shadowOpacity)}`
      : "none";

    const cr = Array.isArray(layer.cornerRadius)
      ? `${layer.cornerRadius[0] || 0}px ${layer.cornerRadius[1] || 0}px ${layer.cornerRadius[2] || 0}px ${layer.cornerRadius[3] || 0}px`
      : `${layer.cornerRadius || 0}px`;

    if (layer.type === "rect") {
      html += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${layer.fill || "#ccc"};border-radius:${cr};box-shadow:${shadow};opacity:${op};${transform}"></div>`;
    }

    if (layer.type === "image") {
      const src = (layer.name && variables[layer.name]) ? variables[layer.name] : (layer.src || "");
      if (src) {
        html += `<img src="${src}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${op};border-radius:${cr};box-shadow:${shadow};object-fit:${layer.objectFit || "cover"};${transform}" crossorigin="anonymous"/>`;
      }
    }

    if (layer.type === "text") {
      const text = resolveText(layer, variables);
      const isAr = /[\u0600-\u06FF]/.test(text);
      const fontSize = layer.fontSize ?? 24;
      let fam = (layer.fontFamily || "Inter").split(",")[0]!.replace(/['"]/g, "").trim();
      if (fam.includes(":")) fam = fam.split(":")[0]!;
      const align = layer.align || (isAr ? "right" : "left");
      const dir = isAr ? "rtl" : "ltr";
      const ts = (layer.shadowOpacity > 0 && layer.shadowColor)
        ? `text-shadow:${layer.shadowOffsetX || 0}px ${layer.shadowOffsetY || 0}px ${layer.shadowBlur || 0}px ${hexRgba(layer.shadowColor, layer.shadowOpacity)};`
        : "";

      html += `<div dir="${dir}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;color:${layer.fill || "#000"};font-family:'${fam}',sans-serif;font-size:${fontSize}px;line-height:${layer.lineHeight || 1.3};letter-spacing:${layer.letterSpacing ?? 0}px;text-align:${align};direction:${dir};opacity:${op};overflow:hidden;word-wrap:break-word;overflow-wrap:break-word;${ts}${transform}">${esc(text)}</div>`;
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&family=Cairo:wght@200;300;400;500;600;700;800;900&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'beIN Normal';src:url('https://raw.githubusercontent.com/abdalali/fonts/master/beIN-Normal.ttf') format('truetype')}
@font-face{font-family:'Dubai';src:url('https://raw.githubusercontent.com/MizterThe1st/fonts/master/Dubai-Regular.ttf') format('truetype')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;-webkit-font-smoothing:antialiased}
.c{width:${W}px;height:${H}px;background:${bg};position:relative;overflow:hidden}
</style></head><body><div class="c">${html}</div></body></html>`;
}

export async function GET(request: NextRequest) {
  let browser;
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId");
    const varsParam = url.searchParams.get("vars");

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    let variables: Record<string, string> = {};
    if (varsParam) {
      try { variables = JSON.parse(Buffer.from(varsParam, "base64").toString("utf-8")); } catch {}
    }

    const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const canvas = template.canvas as { width: number; height: number; background: string };
    const layers = (template.layers as any[]) || [];
    const W = canvas.width || 1200;
    const H = canvas.height || 630;

    const pageHTML = buildHTML(canvas, layers, variables);

    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: W, height: H, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(pageHTML, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const screenshot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
    await browser.close();
    browser = null;

    return new Response(Buffer.from(screenshot), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    if (browser) try { await browser.close(); } catch {}
    console.error("[GET /api/v1/image] Render Error:", err);
    return NextResponse.json({ error: "Image rendering failed", details: String(err) }, { status: 500 });
  }
}
