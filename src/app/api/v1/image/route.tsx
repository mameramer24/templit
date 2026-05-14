import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

async function getFontBuffer(family: string, weight: number = 400): Promise<ArrayBuffer | null> {
  const name = family.replace(/['"]/g, "").trim();
  let url = "";
  if (name === "Tajawal") url = weight >= 700
    ? "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf"
    : "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
  else if (name === "Cairo") url = weight >= 700
    ? "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Bold.ttf"
    : "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf";
  else if (name === "beIN Normal") url = "https://raw.githubusercontent.com/abdalali/fonts/master/beIN-Normal.ttf";
  else if (name === "Dubai") url = "https://raw.githubusercontent.com/MizterThe1st/fonts/master/Dubai-Regular.ttf";
  else url = "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
  try { const r = await fetch(url); if (r.ok) return await r.arrayBuffer(); } catch {}
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId");
    const varsParam = url.searchParams.get("vars");
    if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

    let variables: Record<string, string> = {};
    if (varsParam) { try { variables = JSON.parse(Buffer.from(varsParam, "base64").toString("utf-8")); } catch {} }

    const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canvas = template.canvas as { width: number; height: number; background: string };
    const layers = (template.layers as any[]) || [];
    const W = canvas.width || 1200;
    const H = canvas.height || 630;

    function hexRgba(hex: string, a: number) {
      if (!hex?.startsWith("#")) return hex;
      return `rgba(${parseInt(hex.slice(1,3),16)||0},${parseInt(hex.slice(3,5),16)||0},${parseInt(hex.slice(5,7),16)||0},${a})`;
    }

    function resolveText(layer: any): string {
      const raw = layer.text || "";
      if (layer.name && variables[layer.name] !== undefined) return variables[layer.name]!;
      return raw;
    }

    // Collect fonts
    const fontSet = new Map<string, number>();
    layers.forEach((l: any) => {
      if (l.type === "text" && l.visible !== false) {
        let fam = (l.fontFamily || "Tajawal").split(",")[0]!.replace(/['"]/g, "").trim();
        if (fam.includes(":")) fam = fam.split(":")[0]!;
        fontSet.set(fam, 400);
      }
    });
    const fontsData: any[] = [];
    for (const [family, weight] of fontSet) {
      const buf = await getFontBuffer(family, weight);
      if (buf) fontsData.push({ name: family, data: buf, weight, style: "normal" as const });
    }
    if (fontsData.length === 0) {
      const buf = await getFontBuffer("Tajawal", 400);
      if (buf) fontsData.push({ name: "Tajawal", data: buf, weight: 400, style: "normal" as const });
    }

    const element = (
      <div style={{ display: "flex", width: W, height: H, backgroundColor: canvas.background || "#fff", position: "relative", overflow: "hidden" }}>
        {layers.filter((l: any) => l.visible !== false).map((layer: any) => {
          const x = Math.round(layer.x ?? 0);
          const y = Math.round(layer.y ?? 0);
          const w = Math.round(layer.width ?? 100);
          const h = Math.round(layer.height ?? 40);
          const op = layer.opacity ?? 1;
          const shadow = (layer.shadowOpacity > 0 && layer.shadowColor)
            ? `${layer.shadowOffsetX||0}px ${layer.shadowOffsetY||0}px ${layer.shadowBlur||0}px ${hexRgba(layer.shadowColor, layer.shadowOpacity)}` : undefined;
          const cr = `${layer.cornerRadius || 0}px`;

          if (layer.type === "rect") return (
            <div key={layer.id} style={{ display: "flex", position: "absolute", left: x, top: y, width: w, height: h,
              backgroundColor: layer.fill || "#ccc", borderRadius: cr, ...(shadow ? { boxShadow: shadow } : {}), opacity: op }} />
          );

          if (layer.type === "image") {
            const src = (layer.name && variables[layer.name]) ? variables[layer.name]! : (layer.src || "");
            if (!src) return null;
            return <img key={layer.id} src={src} style={{ position: "absolute", left: x, top: y, width: w, height: h,
              opacity: op, borderRadius: cr, ...(shadow ? { boxShadow: shadow } : {}), objectFit: "cover" as const }} />;
          }

          if (layer.type === "text") {
            const text = resolveText(layer);
            const fontSize = layer.fontSize ?? 24;
            let fam = (layer.fontFamily || "Tajawal").split(",")[0]!.replace(/['"]/g, "").trim();
            if (fam.includes(":")) fam = fam.split(":")[0]!;
            const isAr = /[\u0600-\u06FF]/.test(text);
            const align = layer.align || (isAr ? "right" : "left");

            return (
              <div key={layer.id} dir={isAr ? "rtl" : "ltr"} style={{
                display: "flex", position: "absolute", left: x, top: y, width: w, height: h,
                color: layer.fill || "#000", fontSize, fontFamily: `"${fam}"`,
                lineHeight: layer.lineHeight || 1.3,
                letterSpacing: layer.letterSpacing ?? 0,
                textAlign: align as any, opacity: op,
                ...(shadow ? { textShadow: shadow } : {}),
                overflow: "hidden", wordBreak: "break-word" as any,
              }}>
                {text}
              </div>
            );
          }
          return null;
        })}
      </div>
    );

    return new ImageResponse(element, { width: W, height: H, fonts: fontsData });
  } catch (err) {
    console.error("[GET /api/v1/image] Error:", err);
    return NextResponse.json({ error: "Failed", details: String(err) }, { status: 500 });
  }
}
