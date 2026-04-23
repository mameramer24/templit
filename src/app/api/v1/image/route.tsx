import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/v1/image?templateId=XXX&vars=BASE64_JSON
 *
 * Renders a template to a PNG image server-side using Satori (via next/og).
 * Variables are passed as base64-encoded JSON in the `vars` query param.
 */
export async function GET(request: NextRequest) {
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

  // Load Cairo font for Arabic text support
  let cairoFont: ArrayBuffer | null = null;
  try {
    const res = await fetch(
      "https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvalIhTp2mxdt0UX8a.woff2",
      { next: { revalidate: 86400 } }
    );
    cairoFont = await res.arrayBuffer();
  } catch {
    // font load failed, use system font
  }

  const fontConfig = cairoFont
    ? [{ name: "Cairo", data: cairoFont, weight: 400 as const }]
    : [];

  // Derive text substitution: variables can match by layer "name" or layer text key
  function resolveText(layer: any): string {
    const raw = layer.text || "";
    // Try matching by layer name (if set)
    if (layer.name && variables[layer.name] !== undefined) {
      return variables[layer.name];
    }
    // Try matching by current text value as key
    if (variables[raw] !== undefined) {
      return variables[raw];
    }
    return raw;
  }

  const W = canvas.width;
  const H = canvas.height;
  const bg = canvas.background || "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          backgroundColor: bg,
          position: "relative",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {layers
          .filter((l: any) => l.visible !== false)
          .map((layer: any, i: number) => {
            const x = Math.round(layer.x ?? 0);
            const y = Math.round(layer.y ?? 0);
            const w = Math.round(layer.width ?? 100);
            const h = Math.round(layer.height ?? 40);
            const opacity = layer.opacity ?? 1;

            if (layer.type === "rect") {
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    backgroundColor: layer.fill || "#cccccc",
                    opacity,
                    borderRadius: layer.cornerRadius ?? 0,
                  }}
                />
              );
            }

            if (layer.type === "text") {
              const text = resolveText(layer);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: w,
                    fontSize: layer.fontSize ?? 24,
                    color: layer.fill || "#000000",
                    opacity,
                    fontFamily: cairoFont ? "Cairo" : "sans-serif",
                    lineHeight: layer.lineHeight ?? 1.2,
                    letterSpacing: layer.letterSpacing ?? 0,
                    textAlign: (layer.align as any) ?? "left",
                    display: "flex",
                    flexWrap: "wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {text}
                </div>
              );
            }

            if (layer.type === "image" && layer.src) {
              const src = variables[layer.name || ""] || layer.src;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={w}
                  height={h}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    opacity,
                    objectFit: "cover",
                  }}
                />
              );
            }

            return null;
          })}
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fontConfig,
    }
  );
}
