"use client";

/**
 * Mp4Renderer — Client-side MP4 rendering via @ffmpeg/ffmpeg (WebAssembly)
 *
 * Architecture:
 *  1. Accept a Konva Stage reference + frame count + FPS.
 *  2. Capture each frame as a PNG blob using stage.toDataURL().
 *  3. Write every frame into FFmpeg.wasm's virtual FS as frame_00001.png …
 *  4. Run ffmpeg -framerate <fps> -i frame_%05d.png -c:v libx264 output.mp4
 *  5. Read the output MP4 blob, create an object URL, and return it.
 *
 * Prerequisites (already set in next.config.ts):
 *  Cross-Origin-Opener-Policy: same-origin
 *  Cross-Origin-Embedder-Policy: require-corp
 *  (SharedArrayBuffer must be available for FFmpeg.wasm threading)
 */

import React, { useCallback, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface RenderConfig {
  /** Total number of frames to capture */
  totalFrames: number;
  /** Frames per second for the output video */
  fps: number;
  /** Output video width (defaults to stage width) */
  width?: number;
  /** Output video height (defaults to stage height) */
  height?: number;
  /** Called each time a new frame is requested so the caller can update animations */
  onFrameRequest?: (frameIndex: number) => void;
}

interface Mp4RendererProps {
  templateName: string;
  /** The Konva Stage to capture. Pass the stage ref from CanvasEditor. */
  stageRef: React.RefObject<Konva.Stage | null>;
  config: RenderConfig;
  /** Optional: called when rendering finishes with the output blob URL */
  onComplete?: (blobUrl: string) => void;
}

type RenderState =
  | { status: "idle" }
  | { status: "loading_wasm" }
  | { status: "capturing"; frame: number; total: number }
  | { status: "encoding"; progress: number }
  | { status: "done"; url: string; sizeKb: number }
  | { status: "error"; message: string };

// ── FFmpeg CDN URLs (versioned for cache stability) ───────────────────────────
const FFMPEG_BASE_URL =
  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

// ── Helper: zero-padded frame filename ────────────────────────────────────────
function frameFilename(index: number): string {
  return `frame_${String(index).padStart(5, "0")}.png`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Mp4Renderer({
  templateName,
  stageRef,
  config,
  onComplete,
}: Mp4RendererProps) {
  const [renderState, setRenderState] = useState<RenderState>({
    status: "idle",
  });

  // Persist the FFmpeg instance so we only load WASM once per session
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // ── Load FFmpeg WASM ────────────────────────────────────────────────────

  const loadFfmpeg = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    // Log output from FFmpeg to the browser console in development
    if (process.env.NODE_ENV === "development") {
      ffmpeg.on("log", ({ message }) => {
        console.debug("[ffmpeg]", message);
      });
    }

    // Progress callback — fires during the encoding phase
    ffmpeg.on("progress", ({ progress }) => {
      setRenderState({ status: "encoding", progress: Math.round(progress * 100) });
    });

    setRenderState({ status: "loading_wasm" });

    // Load core + wasm from CDN (using toBlobURL to satisfy CORP requirements)
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${FFMPEG_BASE_URL}/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        `${FFMPEG_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    return ffmpeg;
  }, []);

  // ── Main render function ────────────────────────────────────────────────

  const startRender = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) {
      setRenderState({ status: "error", message: "Stage is not mounted." });
      return;
    }

    try {
      // 1. Load FFmpeg WASM (cached after first load)
      const ffmpeg = await loadFfmpeg();

      const { totalFrames, fps, onFrameRequest } = config;
      const pixelRatio = 2; // 2× for crisp output

      // 2. Capture each frame
      for (let i = 0; i < totalFrames; i++) {
        setRenderState({ status: "capturing", frame: i + 1, total: totalFrames });

        // Notify caller to tick animations to frame i
        onFrameRequest?.(i);

        // Give React/Konva one tick to paint the frame
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        // Capture stage as PNG blob
        const dataUrl = stage.toDataURL({ pixelRatio });
        const blob = await fetch(dataUrl).then((r) => r.blob());
        const arrayBuffer = await blob.arrayBuffer();

        // Write to FFmpeg FS
        await ffmpeg.writeFile(
          frameFilename(i),
          new Uint8Array(arrayBuffer)
        );
      }

      // 3. Encode frames to MP4
      setRenderState({ status: "encoding", progress: 0 });

      const outputWidth = config.width ?? stage.width();
      const outputHeight = config.height ?? stage.height();

      // Ensure dimensions are divisible by 2 (libx264 requirement)
      const safeWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth - 1;
      const safeHeight =
        outputHeight % 2 === 0 ? outputHeight : outputHeight - 1;

      await ffmpeg.exec([
        "-framerate", String(fps),
        "-i", "frame_%05d.png",
        // Scale to safe dimensions
        "-vf", `scale=${safeWidth}:${safeHeight}`,
        // H.264 high-quality preset
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        // Needed for QuickTime / iOS compatibility
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      // 4. Read the output file
      const data = await ffmpeg.readFile("output.mp4");
      const uint8 =
        data instanceof Uint8Array
          ? new Uint8Array(data.buffer as ArrayBuffer)
          : new TextEncoder().encode(data as string);
      const outputBlob = new Blob([uint8.buffer as ArrayBuffer], { type: "video/mp4" });
      const url = URL.createObjectURL(outputBlob);
      const sizeKb = Math.round(outputBlob.size / 1024);

      // 5. Clean up frame files from FS to free memory
      for (let i = 0; i < totalFrames; i++) {
        await ffmpeg.deleteFile(frameFilename(i)).catch(() => {/* ignore */});
      }
      await ffmpeg.deleteFile("output.mp4").catch(() => {/* ignore */});

      setRenderState({ status: "done", url, sizeKb });
      onComplete?.(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setRenderState({ status: "error", message });
    }
  }, [config, loadFfmpeg, onComplete, stageRef]);

  // ── Download helper ─────────────────────────────────────────────────────

  const downloadVideo = useCallback(() => {
    if (renderState.status !== "done") return;
    const a = document.createElement("a");
    a.href = renderState.url;
    a.download = "templit-render.mp4";
    a.click();
  }, [renderState]);

  // ── Progress value for UI ───────────────────────────────────────────────

  const progressValue: number = (() => {
    switch (renderState.status) {
      case "idle":
      case "loading_wasm":
        return 0;
      case "capturing":
        return Math.round((renderState.frame / renderState.total) * 50);
      case "encoding":
        return 50 + Math.round(renderState.progress / 2);
      case "done":
        return 100;
      case "error":
        return 0;
    }
  })();

  const isRunning =
    renderState.status === "loading_wasm" ||
    renderState.status === "capturing" ||
    renderState.status === "encoding";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-white/10 bg-[#16162a] p-5 space-y-4 w-full max-w-md">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold text-white text-sm">MP4 Renderer</h3>
        <Badge
          variant="outline"
          className="ml-auto border-white/20 text-white/50 text-[10px]"
        >
          FFmpeg.wasm
        </Badge>
      </div>

      {/* Render info */}
      <div className="text-xs text-white/50 space-y-0.5">
        <p>
          {config.totalFrames} frames @ {config.fps} fps ={" "}
          {(config.totalFrames / config.fps).toFixed(1)}s
        </p>
        <p>Rendering happens 100% in your browser — no server involved.</p>
      </div>

      {/* Status messages */}
      {renderState.status !== "idle" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            {renderState.status === "loading_wasm" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                <span className="text-white/70">Loading FFmpeg WASM…</span>
              </>
            )}
            {renderState.status === "capturing" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
                <span className="text-white/70">
                  Capturing frame {renderState.frame} / {renderState.total}
                </span>
              </>
            )}
            {renderState.status === "encoding" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                <span className="text-white/70">
                  Encoding H.264… {renderState.progress}%
                </span>
              </>
            )}
            {renderState.status === "done" && (
              <>
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-green-400">
                  Done! {renderState.sizeKb} KB
                </span>
              </>
            )}
            {renderState.status === "error" && (
              <>
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className="text-red-400 truncate">
                  {renderState.message}
                </span>
              </>
            )}
          </div>

          {(isRunning || renderState.status === "done") && (
            <Progress
              value={progressValue}
              className="h-1.5 bg-white/10 [&>div]:bg-indigo-500"
            />
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          id="start-render-btn"
          size="sm"
          disabled={isRunning}
          onClick={() => startRender()}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Video className="h-4 w-4 mr-1" />
          )}
          {isRunning ? "Rendering…" : "Render MP4"}
        </Button>

        {renderState.status === "done" && (
          <Button
            id="download-video-btn"
            size="sm"
            onClick={downloadVideo}
            className="bg-green-600 hover:bg-green-500 text-white"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        )}
      </div>

      {/* Video preview */}
      {renderState.status === "done" && (
        <video
          id="render-preview"
          src={renderState.url}
          controls
          loop
          className="w-full rounded-lg border border-white/10 mt-2"
        />
      )}
    </div>
  );
}
