import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * GET /api/v1/image?templateId=XXX&vars=BASE64_JSON
 * Renders a template to a PNG image using sharp.
 */
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
      try {
        variables = JSON.parse(Buffer.from(varsParam, "base64").toString("utf-8"));
      } catch {
        // ignore malformed vars
      }
    }

    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const canvas = template.canvas as {
      width: number;
      height: number;
      background: string;
    };

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

    // Escape XML special chars
    function esc(str: string): string {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    }

    // Helper to fetch images and convert to base64 for sharp
    async function getBase64Image(url: string) {
      if (url.startsWith("data:")) return url;
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = res.headers.get("content-type") || "image/png";
        return `data:${mimeType};base64,${buffer.toString("base64")}`;
      } catch (err) {
        console.error("Failed to fetch image for rendering:", url, err);
        return "";
      }
    }

    async function getGoogleFontBase64(fontFamily: string) {
      const familyName = fontFamily.split(",")[0].replace(/['"]/g, "").trim();
      if (!familyName || familyName === "sans-serif" || familyName === "serif") return null;

      // Handle Custom External Fonts (beIN / Dubai)
      let externalUrl = "";
      if (familyName === "beIN Normal") {
        externalUrl = "https://raw.githubusercontent.com/abdalali/fonts/master/beIN-Normal.ttf";
      } else if (familyName === "Dubai") {
        externalUrl = "https://raw.githubusercontent.com/MizterThe1st/fonts/master/Dubai-Regular.ttf";
      }

      if (externalUrl) {
        try {
          const res = await fetch(externalUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return `
@font-face {
  font-family: '${familyName}';
  src: url(data:font/ttf;base64,${buffer.toString("base64")}) format('truetype');
}`;
          }
        } catch(e) {
          console.error("Failed to fetch custom external font:", familyName);
        }
      }

      // Handle standard Google Fonts
      try {
        const url = `https://fonts.googleapis.com/css2?family=${familyName.replace(/ /g, "+")}:wght@400;700`;
        const cssRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:33.0) Gecko/20120101 Firefox/33.0"
          }
        });
        if (!cssRes.ok) return null;
        const cssText = await cssRes.text();
        const ttfUrl = cssText.match(/url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
        if (!ttfUrl) return null;

        const fontRes = await fetch(ttfUrl);
        const arrayBuffer = await fontRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return `
@font-face {
  font-family: '${familyName}';
  src: url(data:font/ttf;base64,${buffer.toString("base64")}) format('truetype');
}`;
      } catch (err) {
        console.error("Failed to fetch Google Font CSS for:", familyName, err);
        return null;
      }
    }

    // Pre-fetch all necessary fonts
    const uniqueFonts = new Set<string>();
    layers.forEach((l: any) => {
      if (l.type === "text" && l.visible !== false) {
        uniqueFonts.add(l.fontFamily || "Inter, sans-serif");
      }
    });

    const fontStyles = await Promise.all(
      Array.from(uniqueFonts).map(f => getGoogleFontBase64(f))
    );
    const fontsCss = fontStyles.filter(Boolean).join("\n");

    // Generate SVG elements for each layer
    const layersSvgPromises = layers
      .filter((l: any) => l.visible !== false)
      .map(async (layer: any) => {
        const x = Math.round(layer.x ?? 0);
        const y = Math.round(layer.y ?? 0);
        const w = Math.round(layer.width ?? 100);
        const h = Math.round(layer.height ?? 40);
        const opacity = layer.opacity ?? 1;

        if (layer.type === "rect") {
          const fill = layer.fill || "#cccccc";
          const rx = layer.cornerRadius ?? 0;
          return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${esc(fill)}" opacity="${opacity}" rx="${rx}" ry="${rx}"/>`;
        }

        if (layer.type === "text") {
          const text = resolveText(layer);
          const fill = layer.fill || "#000000";
          const fontSize = layer.fontSize ?? 24;
          const letterSpacing = layer.letterSpacing ?? 0;
          const textAnchor = layer.align === "center" ? "middle" : layer.align === "right" ? "end" : "start";
          const anchorX = layer.align === "center" ? x + w / 2 : layer.align === "right" ? x + w : x;

          // Split text into lines for multi-line support
          const lines = text.split("\n");
          const lineHeight = layer.lineHeight ? fontSize * layer.lineHeight : fontSize * 1.3;

          // Check if text contains Arabic characters to apply RTL shaping safely
          const isArabic = /[\u0600-\u06FF]/.test(text);
          const dirAttr = isArabic ? 'direction="rtl"' : '';

          return lines.map((line: string, i: number) => 
            `<text x="${anchorX}" y="${y + fontSize + (i * lineHeight)}" fill="${esc(fill)}" font-size="${fontSize}" opacity="${opacity}" text-anchor="${textAnchor}" letter-spacing="${letterSpacing}" font-family="${esc(layer.fontFamily || 'sans-serif')}" ${dirAttr}>${esc(line)}</text>`
          ).join("\n");
        }

        if (layer.type === "image") {
          const src = (layer.name && variables[layer.name]) ? variables[layer.name]! : (layer.src || null);
          if (!src) return "";
          const base64Url = await getBase64Image(src);
          if (!base64Url) return "";
          return `<image href="${esc(base64Url)}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>`;
        }

        return "";
      });

    const resolvedLayers = await Promise.all(layersSvgPromises);
    const layersSvg = resolvedLayers.join("\n");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      ${fontsCss}
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="${esc(bg)}"/>
  ${layersSvg}
</svg>`;

    // Render SVG string into PNG Buffer using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 100 })
      .toBuffer();

    return new NextResponse(pngBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/image]", err);
    return NextResponse.json(
      { error: "Image rendering failed", details: String(err) },
      { status: 500 }
    );
  }
}
