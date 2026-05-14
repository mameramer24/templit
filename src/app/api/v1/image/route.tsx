import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import fs from "fs";

export const runtime = "nodejs";

const FONT_CACHE = "/tmp/templit-fonts";

async function getFont(name: string, url: string): Promise<string> {
  const p = `${FONT_CACHE}/${name}.ttf`;
  if (fs.existsSync(p)) return p;
  fs.mkdirSync(FONT_CACHE, { recursive: true });
  const r = await fetch(url);
  fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  return p;
}

function getFontUrl(fam: string, w: number): string {
  if (fam === "Tajawal") return w >= 700
    ? "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf"
    : "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
  if (fam === "Cairo") return w >= 700
    ? "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Bold.ttf"
    : "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf";
  return "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
}

function hexRgb(hex: string) {
  if (!hex?.startsWith("#")) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(hex.slice(1, 3), 16) || 0,
    g: parseInt(hex.slice(3, 5), 16) || 0,
    b: parseInt(hex.slice(5, 7), 16) || 0,
  };
}

function esc(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId");
    const varsParam = url.searchParams.get("vars");
    if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

    let variables: Record<string, string> = {};
    if (varsParam) {
      try { variables = JSON.parse(Buffer.from(varsParam, "base64").toString("utf-8")); } catch {}
    }

    const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canvas = template.canvas as { width: number; height: number; background: string };
    const layers = (template.layers as any[]) || [];
    const W = canvas.width || 1200;
    const H = canvas.height || 630;
    const bg = hexRgb(canvas.background || "#ffffff");

    const composites: sharp.OverlayOptions[] = [];

    for (const layer of layers.filter((l: any) => l.visible !== false)) {
      let x = Math.max(0, Math.round(layer.x ?? 0));
      let y = Math.max(0, Math.round(layer.y ?? 0));
      let w = Math.max(1, Math.round(layer.width ?? 100));
      let h = Math.max(1, Math.round(layer.height ?? 40));

      // Clamp to canvas bounds
      if (x >= W || y >= H) continue;
      if (x + w > W) w = W - x;
      if (y + h > H) h = H - y;
      if (w < 1 || h < 1) continue;

      if (layer.type === "rect") {
        const c = hexRgb(layer.fill || "#cccccc");
        const cr = layer.cornerRadius || 0;
        const op = layer.opacity ?? 1;
        const svg = `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${cr}" ry="${cr}" fill="rgb(${c.r},${c.g},${c.b})" opacity="${op}"/></svg>`;
        composites.push({ input: Buffer.from(svg), left: x, top: y });
      }

      if (layer.type === "image") {
        const src = (layer.name && variables[layer.name]) ? variables[layer.name]! : (layer.src || "");
        if (src) {
          try {
            const imgRes = await fetch(src);
            const imgBuf = Buffer.from(await imgRes.arrayBuffer());
            const resized = await sharp(imgBuf).resize(w, h, { fit: "cover" }).png().toBuffer();
            composites.push({ input: resized, left: x, top: y });
          } catch {}
        }
      }

      if (layer.type === "text") {
        const raw = layer.text || "";
        const text = (layer.name && variables[layer.name] !== undefined) ? variables[layer.name]! : raw;
        if (!text) continue;

        const fontSize = layer.fontSize ?? 24;
        let fam = (layer.fontFamily || "Tajawal").split(",")[0]!.replace(/['"]/g, "").trim();
        if (fam.includes(":")) fam = fam.split(":")[0]!;
        const color = hexRgb(layer.fill || "#000000");
        const align = layer.align === "center" ? "centre" : layer.align === "left" ? "left" : "right";

        const fontPath = await getFont(`${fam}-400`, getFontUrl(fam, 400));
        const pangoSize = fontSize * 1024;

        try {
          let textBuf = await sharp({
            text: {
              text: `<span foreground="rgb(${color.r},${color.g},${color.b})" font_family="${fam}" font_size="${pangoSize}">${esc(text)}</span>`,
              fontfile: fontPath,
              width: w,
              height: h,
              align: align as any,
              rgba: true,
              dpi: 72,
            },
          }).png().toBuffer();

          // Ensure text image fits within bounds
          const meta = await sharp(textBuf).metadata();
          if (meta.width && meta.height && (meta.width > w || meta.height > h)) {
            textBuf = await sharp(textBuf).resize(w, h, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
          }

          composites.push({ input: textBuf, left: x, top: y });
        } catch (e) {
          console.error("Text render error:", e);
        }
      }
    }

    const result = await sharp({
      create: { width: W, height: H, channels: 4, background: { ...bg, alpha: 255 } },
    }).composite(composites).png().toBuffer();

    return new Response(new Uint8Array(result), { headers: { "Content-Type": "image/png" } });
  } catch (err) {
    console.error("[GET /api/v1/image] Error:", err);
    return NextResponse.json({ error: "Failed", details: String(err) }, { status: 500 });
  }
}
