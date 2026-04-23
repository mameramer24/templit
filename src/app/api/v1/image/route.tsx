import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/v1/image?templateId=XXX&vars=BASE64_JSON
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
        // ignore
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

    const imageResponse = new ImageResponse(
      {
        type: "div",
        props: {
          style: {
            width: W,
            height: H,
            backgroundColor: bg,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          },
          children: layers
            .filter((l: any) => l.visible !== false)
            .map((layer: any, i: number) => {
              const x = Math.round(layer.x ?? 0);
              const y = Math.round(layer.y ?? 0);
              const w = Math.round(layer.width ?? 100);
              const h = Math.round(layer.height ?? 40);
              const opacity = layer.opacity ?? 1;

              if (layer.type === "rect") {
                return {
                  type: "div",
                  key: String(i),
                  props: {
                    style: {
                      position: "absolute",
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      backgroundColor: layer.fill || "#cccccc",
                      opacity,
                      borderRadius: layer.cornerRadius ?? 0,
                    },
                  },
                };
              }

              if (layer.type === "text") {
                return {
                  type: "div",
                  key: String(i),
                  props: {
                    style: {
                      position: "absolute",
                      left: x,
                      top: y,
                      width: w,
                      fontSize: layer.fontSize ?? 24,
                      color: layer.fill || "#000000",
                      opacity,
                      fontFamily: "sans-serif",
                      lineHeight: String(layer.lineHeight ?? 1.2),
                      letterSpacing: layer.letterSpacing ?? 0,
                      textAlign: layer.align ?? "left",
                      display: "flex",
                      flexWrap: "wrap",
                      wordBreak: "break-word",
                    },
                    children: resolveText(layer),
                  },
                };
              }

              if (layer.type === "image" && (layer.src || (layer.name && variables[layer.name]))) {
                const src = (layer.name && variables[layer.name]) ? variables[layer.name]! : layer.src;
                return {
                  type: "img",
                  key: String(i),
                  props: {
                    src,
                    width: w,
                    height: h,
                    style: {
                      position: "absolute",
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      opacity,
                      objectFit: "cover",
                    },
                  },
                };
              }

              return null;
            })
            .filter(Boolean),
        },
      },
      { width: W, height: H }
    );

    return imageResponse;
  } catch (err) {
    console.error("[GET /api/v1/image] Error:", err);
    return NextResponse.json(
      { error: "Image rendering failed", details: String(err) },
      { status: 500 }
    );
  }
}
