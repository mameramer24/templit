import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

// Use raw Github TTFs to ensure exact TTF format for Font buffer
async function getFontBuffer(fontFamily: string, weight: number = 400): Promise<ArrayBuffer | null> {
  const familyPart = fontFamily.split(",")[0];
  if (!familyPart) return null;
  const familyName = familyPart.replace(/['"]/g, "").trim();
  let url = "";

  if (familyName === "beIN Normal") {
    url = "https://raw.githubusercontent.com/abdalali/fonts/master/beIN-Normal.ttf";
  } else if (familyName === "Dubai") {
    url = "https://raw.githubusercontent.com/MizterThe1st/fonts/master/Dubai-Regular.ttf";
  } else if (familyName === "Tajawal") {
    url = weight === 700 
      ? "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf"
      : "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf";
  } else if (familyName === "Cairo") {
    url = weight === 700 
      ? "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Bold.ttf"
      : "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf";
  } else if (familyName === "Inter") {
    url = weight === 700
      ? "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bslnt%2Cwght%5D.ttf"
      : "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bslnt%2Cwght%5D.ttf";
  }

  // Fallback to Google Fonts API if not hardcoded above
  if (!url && familyName !== "sans-serif" && familyName !== "serif") {
    try {
      const gUrl = `https://fonts.googleapis.com/css2?family=${familyName.replace(/ /g, "+")}:wght@${weight}`;
      const cssRes = await fetch(gUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:33.0) Gecko/20120101 Firefox/33.0" }
      });
      if (cssRes.ok) {
        const cssText = await cssRes.text();
        const match = cssText.match(/url\((https:\/\/[^)]+\.ttf)\)/);
        if (match && match[1]) url = match[1];
      }
    } catch(e) {}
  }

  if (!url) return null;

  try {
    const res = await fetch(url);
    if (res.ok) return await res.arrayBuffer();
  } catch(e) {}
  return null;
}

export async function GET(request: NextRequest) {
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

    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    function hexToRgba(hex: string, alpha: number) {
      if (!hex.startsWith("#")) return hex;
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const canvas = template.canvas as { width: number; height: number; background: string; };
    const layers = (template.layers as any[]) || [];
    const W = canvas.width || 1200;
    const H = canvas.height || 630;
    const bg = canvas.background || "#ffffff";

    function resolveText(layer: any): string {
      const raw = layer.text || "";
      if (layer.name && variables[layer.name] !== undefined) return variables[layer.name]!;
      if (variables[raw] !== undefined) return variables[raw]!;
      return raw;
    }

    // Determine requested fonts
    const uniqueFonts = new Set<{ family: string, weight: number }>();
    layers.forEach((l: any) => {
      if (l.type === "text" && l.visible !== false) {
        let weight = 400;
        let familyPart = (l.fontFamily || "Inter").split(",")[0];
        let familyName = (familyPart || "").replace(/['"]/g, "").trim();
        if (familyName.includes(":")) {
          const parts = familyName.split(":");
          familyName = parts[0];
          weight = parseInt(parts[1]) || 400;
        }
        uniqueFonts.add({ family: familyName, weight });
      }
    });

    const fontsData: any[] = [];
    for (const { family, weight } of uniqueFonts) {
      const buf = await getFontBuffer(family, weight);
      if (buf) {
        fontsData.push({
          name: family,
          data: buf,
          weight,
          style: "normal"
        });
      }
    }

    // Fallback standard font if none loaded
    if (fontsData.length === 0) {
      const fallbackBuf = await getFontBuffer("Inter", 400);
      if (fallbackBuf) {
        fontsData.push({ name: "Inter", data: fallbackBuf, weight: 400, style: "normal" });
      }
    }

    // Render Satori Element
    const element = (
      <div
        style={{
          display: "flex",
          width: W,
          height: H,
          backgroundColor: bg,
          position: "relative",
          overflow: "hidden"
        }}
      >
        {layers.filter((l:any) => l.visible !== false).map((layer: any) => {
          const x = Math.round(layer.x ?? 0);
          const y = Math.round(layer.y ?? 0);
          const w = Math.round(layer.width ?? 100);
          const h = Math.round(layer.height ?? 40);
          const opacity = layer.opacity ?? 1;

          const shadow = (layer.shadowOpacity && layer.shadowOpacity > 0 && layer.shadowColor)
            ? `${layer.shadowOffsetX || 0}px ${layer.shadowOffsetY || 0}px ${layer.shadowBlur || 0}px ${hexToRgba(layer.shadowColor, layer.shadowOpacity)}`
            : null;

          const radiusTL = (Array.isArray(layer.cornerRadius) ? (layer.cornerRadius[0] || 0) : (layer.cornerRadius || 0)) + "px";
          const radiusTR = (Array.isArray(layer.cornerRadius) ? (layer.cornerRadius[1] || 0) : (layer.cornerRadius || 0)) + "px";
          const radiusBR = (Array.isArray(layer.cornerRadius) ? (layer.cornerRadius[2] || 0) : (layer.cornerRadius || 0)) + "px";
          const radiusBL = (Array.isArray(layer.cornerRadius) ? (layer.cornerRadius[3] || 0) : (layer.cornerRadius || 0)) + "px";

          if (layer.type === "rect") {
            return (
              <div
                key={layer.id}
                style={{
                  display: "flex",
                  position: "absolute",
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  backgroundColor: layer.fill || "#cccccc",
                  borderTopLeftRadius: radiusTL,
                  borderTopRightRadius: radiusTR,
                  borderBottomRightRadius: radiusBR,
                  borderBottomLeftRadius: radiusBL,
                  ...(shadow ? { boxShadow: shadow } : {}),
                  opacity
                }}
              />
            );
          }

          if (layer.type === "image") {
            const src = (layer.name && variables[layer.name]) ? variables[layer.name]! : (layer.src || null);
            if (!src) return null;
            return (
              <img
                key={layer.id}
                src={src}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  opacity,
                  borderTopLeftRadius: radiusTL,
                  borderTopRightRadius: radiusTR,
                  borderBottomRightRadius: radiusBR,
                  borderBottomLeftRadius: radiusBL,
                  ...(shadow ? { boxShadow: shadow } : {}),
                  objectFit: layer.objectFit || "cover"
                }}
              />
            );
          }

          if (layer.type === "text") {
            const text = resolveText(layer);
            const fontSize = layer.fontSize ?? 24;
            let familyPart = (layer.fontFamily || "Inter").split(",")[0];
            let familyName = (familyPart || "").replace(/['"]/g, "").trim();
            if (familyName.includes(":")) {
              familyName = familyName.split(":")[0];
            }
            
            return (
              <div
                key={layer.id}
                style={{
                  display: "flex",
                  position: "absolute",
                  left: x,
                  top: y,
                  width: w,
                  flexDirection: "column",
                  color: layer.fill || "#000000",
                  fontSize: fontSize,
                  fontFamily: `"${familyName}"`,
                  letterSpacing: layer.letterSpacing ?? 0,
                  opacity,
                  ...(shadow ? { textShadow: shadow } : {}),
                  lineHeight: layer.lineHeight || 1.3,
                  justifyContent: layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start",
                  alignItems: layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start",
                  textAlign: layer.align === "center" ? "center" : layer.align === "right" ? "right" : "left",
                }}
              >
                {text.split("\\n").map((line: string, i: number) => (
                  <span key={i} style={{ display: "flex" }}>{line}</span>
                ))}
              </div>
            );
          }

          return null;
        })}
      </div>
    );

    return new ImageResponse(element, {
      width: W,
      height: H,
      fonts: fontsData
    });

  } catch (err) {
    console.error("[GET /api/v1/image] Satori render Error:", err);
    return NextResponse.json(
      { error: "Image rendering failed", details: String(err) },
      { status: 500 }
    );
  }
}
