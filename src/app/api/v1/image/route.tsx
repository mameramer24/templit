import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

function resolveText(layer: any, vars: Record<string, string>): string {
  const raw = layer.text || "";
  if (layer.name && vars[layer.name] !== undefined) return vars[layer.name]!;
  return raw;
}

function esc(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\n/g, "<br>");
}

function hexRgba(hex: string, a: number) {
  if (!hex?.startsWith("#")) return hex;
  return `rgba(${parseInt(hex.slice(1,3),16)||0},${parseInt(hex.slice(3,5),16)||0},${parseInt(hex.slice(5,7),16)||0},${a})`;
}

function buildHTML(canvas: any, layers: any[], vars: Record<string, string>): string {
  const W = canvas.width || 1200;
  const H = canvas.height || 630;
  const bg = canvas.background || "#ffffff";

  let els = "";
  for (const L of layers.filter((l: any) => l.visible !== false)) {
    const x = Math.round(L.x ?? 0), y = Math.round(L.y ?? 0);
    const w = Math.round(L.width ?? 100), h = Math.round(L.height ?? 40);
    const op = L.opacity ?? 1, rot = L.rotation ?? 0;
    const tf = rot ? `transform:rotate(${rot}deg);` : "";
    const sh = (L.shadowOpacity > 0 && L.shadowColor)
      ? `${L.shadowOffsetX||0}px ${L.shadowOffsetY||0}px ${L.shadowBlur||0}px ${hexRgba(L.shadowColor, L.shadowOpacity)}` : "none";
    const cr = L.cornerRadius || 0;

    if (L.type === "rect") {
      els += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${L.fill||"#ccc"};border-radius:${cr}px;box-shadow:${sh};opacity:${op};${tf}"></div>`;
    }
    if (L.type === "image") {
      const src = (L.name && vars[L.name]) ? vars[L.name] : (L.src || "");
      if (src) els += `<img src="${src}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${op};border-radius:${cr}px;box-shadow:${sh};object-fit:cover;${tf}" crossorigin="anonymous"/>`;
    }
    if (L.type === "text") {
      const text = resolveText(L, vars);
      if (!text) continue;
      const isAr = /[\u0600-\u06FF]/.test(text);
      const fs = L.fontSize ?? 24;
      let fam = (L.fontFamily || "Tajawal").split(",")[0]!.replace(/['"]/g, "").trim();
      if (fam.includes(":")) fam = fam.split(":")[0]!;
      const align = L.align || (isAr ? "right" : "left");
      const dir = isAr ? "rtl" : "ltr";
      const ts = (L.shadowOpacity > 0 && L.shadowColor)
        ? `text-shadow:${L.shadowOffsetX||0}px ${L.shadowOffsetY||0}px ${L.shadowBlur||0}px ${hexRgba(L.shadowColor, L.shadowOpacity)};` : "";
      els += `<div dir="${dir}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;color:${L.fill||"#000"};font-family:'${fam}',sans-serif;font-size:${fs}px;line-height:${L.lineHeight||1.3};letter-spacing:${L.letterSpacing??0}px;text-align:${align};direction:${dir};opacity:${op};overflow:hidden;word-wrap:break-word;${ts}${tf}">${esc(text)}</div>`;
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&family=Cairo:wght@200;300;400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'beIN Normal';src:url('https://raw.githubusercontent.com/abdalali/fonts/master/beIN-Normal.ttf') format('truetype')}
@font-face{font-family:'Dubai';src:url('https://raw.githubusercontent.com/MizterThe1st/fonts/master/Dubai-Regular.ttf') format('truetype')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
.c{width:${W}px;height:${H}px;background:${bg};position:relative;overflow:hidden}
</style></head><body><div class="c">${els}</div></body></html>`;
}

const CHROMIUM_URL = "https://github.com/nichochar/chromium-binaryies/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

export async function GET(request: NextRequest) {
  let browser: any = null;
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId");
    const varsParam = url.searchParams.get("vars");
    if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

    let variables: Record<string, string> = {};
    if (varsParam) { try { variables = JSON.parse(Buffer.from(varsParam, "base64").toString("utf-8")); } catch {} }

    const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canvas = template.canvas as any;
    const layers = (template.layers as any[]) || [];
    const W = canvas.width || 1200;
    const H = canvas.height || 630;
    const html = buildHTML(canvas, layers, variables);

    const chromium = (await import("@sparticuz/chromium-min")).default;
    const puppeteer = (await import("puppeteer-core")).default;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: W, height: H, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(CHROMIUM_URL),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" as const });
    // Wait for fonts
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 500));

    const screenshot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
    await browser.close();
    browser = null;

    return new Response(new Uint8Array(screenshot), {
      headers: { "Content-Type": "image/png" },
    });
  } catch (err) {
    if (browser) try { await browser.close(); } catch {}
    console.error("[GET /api/v1/image] Error:", err);
    return NextResponse.json({ error: "Failed", details: String(err) }, { status: 500 });
  }
}
