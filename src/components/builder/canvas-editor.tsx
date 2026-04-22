"use client";

/**
 * CanvasEditor — React-Konva based template builder
 *
 * Features (MVP):
 *  - Infinite-scroll stage with zoom / pan via wheel + drag
 *  - Draggable, resizable, selectable layers (text, rect, image)
 *  - Layer panel on the left (add / delete / lock / visibility)
 *  - Properties panel on the right (position, size, fill, font)
 *  - Toolbar: add text, add rect, undo, redo, export PNG
 *  - Auto-saves canvas JSON to parent via onCanvasChange callback
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Transformer,
  Image as KonvaImage,
} from "react-konva";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Type,
  Square,
  Image as ImageIcon,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Download,
  Plus,
  Layers,
} from "lucide-react";
import type { Template } from "@/lib/db/schema";

// ── Types ────────────────────────────────────────────────────────────────────

type LayerType = "text" | "rect" | "image";

interface CanvasLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  // text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  // rect
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  // image
  src?: string;
}

interface CanvasConfig {
  width: number;
  height: number;
  background: string;
}

interface CanvasEditorProps {
  /** Initial template data (optional — new template if undefined) */
  template?: Pick<Template, "canvas" | "layers" | "name">;
  /** Called whenever canvas state changes */
  onCanvasChange?: (canvas: CanvasConfig, layers: CanvasLayer[]) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeDefaultText(): CanvasLayer {
  return {
    id: generateId(),
    type: "text",
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: "Double-click to edit",
    fontSize: 24,
    fontFamily: "Inter, sans-serif",
    fill: "#1a1a2e",
  };
}

function makeDefaultRect(): CanvasLayer {
  return {
    id: generateId(),
    type: "rect",
    x: 150,
    y: 150,
    width: 200,
    height: 120,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: "#6366f1",
    stroke: "#4338ca",
    strokeWidth: 2,
    cornerRadius: 8,
  };
}

// ── Layer Shape Components ────────────────────────────────────────────────────

interface ShapeProps {
  layer: CanvasLayer;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<CanvasLayer>) => void;
}

function TextShape({ layer, isSelected, onSelect, onChange }: ShapeProps) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Text
        ref={shapeRef}
        id={layer.id}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        visible={layer.visible}
        text={layer.text ?? ""}
        fontSize={layer.fontSize ?? 24}
        fontFamily={layer.fontFamily ?? "sans-serif"}
        fill={layer.fill ?? "#000000"}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({ x: e.target.x(), y: e.target.y() })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            rotation: node.rotation(),
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
          }
        />
      )}
    </>
  );
}

function RectShape({ layer, isSelected, onSelect, onChange }: ShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        id={layer.id}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        visible={layer.visible}
        fill={layer.fill ?? "#6366f1"}
        {...(layer.stroke !== undefined ? { stroke: layer.stroke } : {})}
        {...(layer.strokeWidth !== undefined ? { strokeWidth: layer.strokeWidth } : {})}
        cornerRadius={layer.cornerRadius ?? 0}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({ x: e.target.x(), y: e.target.y() })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            rotation: node.rotation(),
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
          }
        />
      )}
    </>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export default function CanvasEditor({
  template,
  onCanvasChange,
}: CanvasEditorProps) {
  // ── State ────────────────────────────────────────────────────────────────

  const [canvas, setCanvas] = useState<CanvasConfig>(() => ({
    width: (template?.canvas as CanvasConfig | null | undefined)?.width ?? 1200,
    height: (template?.canvas as CanvasConfig | null | undefined)?.height ?? 630,
    background:
      (template?.canvas as CanvasConfig | null | undefined)?.background ??
      "#ffffff",
  }));

  const [layers, setLayers] = useState<CanvasLayer[]>(
    () =>
      ((template?.layers as CanvasLayer[] | null | undefined) ?? []) as CanvasLayer[]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasLayer[][]>([layers]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const stageRef = useRef<Konva.Stage>(null);

  // ── History helpers ───────────────────────────────────────────────────────

  const pushHistory = useCallback(
    (newLayers: CanvasLayer[]) => {
      const next = history.slice(0, historyIdx + 1).concat([newLayers]);
      setHistory(next);
      setHistoryIdx(next.length - 1);
    },
    [history, historyIdx]
  );

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      const prev = historyIdx - 1;
      setHistoryIdx(prev);
      setLayers(history[prev] ?? []);
    }
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const next = historyIdx + 1;
      setHistoryIdx(next);
      setLayers(history[next] ?? []);
    }
  }, [history, historyIdx]);

  // ── Layer mutations ───────────────────────────────────────────────────────

  const updateLayers = useCallback(
    (newLayers: CanvasLayer[]) => {
      setLayers(newLayers);
      pushHistory(newLayers);
      onCanvasChange?.(canvas, newLayers);
    },
    [canvas, onCanvasChange, pushHistory]
  );

  const addLayer = useCallback(
    (layer: CanvasLayer) => {
      updateLayers([...layers, layer]);
      setSelectedId(layer.id);
    },
    [layers, updateLayers]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    updateLayers(layers.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, layers, updateLayers]);

  const updateLayer = useCallback(
    (id: string, updates: Partial<CanvasLayer>) => {
      const newLayers = layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      updateLayers(newLayers);
    },
    [layers, updateLayers]
  );

  const toggleLayerProp = useCallback(
    (id: string, prop: "locked" | "visible") => {
      const newLayers = layers.map((l) =>
        l.id === id ? { ...l, [prop]: !l[prop] } : l
      );
      setLayers(newLayers);
      onCanvasChange?.(canvas, newLayers);
    },
    [layers, canvas, onCanvasChange]
  );

  // ── Export PNG ────────────────────────────────────────────────────────────

  const exportPng = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = `${template?.name ?? "canvas"}.png`;
    link.href = dataUrl;
    link.click();
  }, [template?.name]);

  // ── Selected layer (for properties panel) ────────────────────────────────

  const selectedLayer = layers.find((l) => l.id === selectedId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0f0f1a] text-white overflow-hidden">
      {/* ── LEFT: Layer Panel ─────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-[#16162a] border-r border-white/10 flex flex-col">
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white/80">Layers</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[...layers].reverse().map((layer) => (
            <button
              key={layer.id}
              id={`layer-btn-${layer.id}`}
              onClick={() =>
                setSelectedId(selectedId === layer.id ? null : layer.id)
              }
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                selectedId === layer.id
                  ? "bg-indigo-600/50 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex-1 truncate text-left">
                {layer.type === "text"
                  ? layer.text?.slice(0, 18) ?? "Text"
                  : `${layer.type} ${layer.id.slice(-4)}`}
              </span>
              <button
                id={`visibility-btn-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerProp(layer.id, "visible");
                }}
                className="opacity-50 hover:opacity-100"
              >
                {layer.visible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </button>
              <button
                id={`lock-btn-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerProp(layer.id, "locked");
                }}
                className="opacity-50 hover:opacity-100"
              >
                {layer.locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </button>
            </button>
          ))}

          {layers.length === 0 && (
            <p className="text-xs text-white/30 text-center p-4">
              No layers yet. Add one from the toolbar.
            </p>
          )}
        </div>
      </aside>

      {/* ── CENTER: Toolbar + Canvas ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 bg-[#16162a] border-b border-white/10 flex items-center gap-2 px-4">
          <Button
            id="add-text-btn"
            size="sm"
            variant="ghost"
            onClick={() => addLayer(makeDefaultText())}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>

          <Button
            id="add-rect-btn"
            size="sm"
            variant="ghost"
            onClick={() => addLayer(makeDefaultRect())}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Square className="h-4 w-4 mr-1" />
            Rect
          </Button>

          <Separator orientation="vertical" className="h-6 bg-white/10" />

          <Button
            id="undo-btn"
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={historyIdx === 0}
            className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </Button>

          <Button
            id="redo-btn"
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={historyIdx >= history.length - 1}
            className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {selectedId && (
              <Button
                id="delete-layer-btn"
                size="sm"
                variant="ghost"
                onClick={deleteSelected}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              id="export-png-btn"
              size="sm"
              onClick={exportPng}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              Export PNG
            </Button>
          </div>
        </div>

        {/* Stage container */}
        <div className="flex-1 overflow-hidden bg-[#0c0c1a] flex items-center justify-center">
          <div className="relative shadow-2xl shadow-black/50">
            <Stage
              id="konva-stage"
              ref={stageRef}
              width={canvas.width}
              height={canvas.height}
              style={{ cursor: "default" }}
              onMouseDown={(e) => {
                // Deselect when clicking on empty stage area
                if (e.target === e.target.getStage()) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                {/* Canvas background */}
                <Rect
                  x={0}
                  y={0}
                  width={canvas.width}
                  height={canvas.height}
                  fill={canvas.background}
                  listening={false}
                />

                {/* Render layers in order */}
                {layers.map((layer) => {
                  const props: ShapeProps = {
                    layer,
                    isSelected: selectedId === layer.id,
                    onSelect: () => setSelectedId(layer.id),
                    onChange: (updates) => updateLayer(layer.id, updates),
                  };

                  if (layer.type === "text") return <TextShape key={layer.id} {...props} />;
                  if (layer.type === "rect") return <RectShape key={layer.id} {...props} />;
                  return null;
                })}
              </Layer>
            </Stage>

            {/* Canvas size badge */}
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 bg-black/60 text-white/60 text-[10px]"
            >
              {canvas.width} × {canvas.height}px
            </Badge>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Properties Panel ────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-[#16162a] border-l border-white/10 flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white/80">
            {selectedLayer ? "Properties" : "Canvas"}
          </span>
        </div>

        <div className="p-3 space-y-4">
          {!selectedLayer ? (
            /* Canvas properties */
            <>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Width</label>
                <Input
                  id="canvas-width"
                  type="number"
                  value={canvas.width}
                  onChange={(e) =>
                    setCanvas((c) => ({
                      ...c,
                      width: parseInt(e.target.value) || c.width,
                    }))
                  }
                  className="h-7 bg-white/5 border-white/10 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Height</label>
                <Input
                  id="canvas-height"
                  type="number"
                  value={canvas.height}
                  onChange={(e) =>
                    setCanvas((c) => ({
                      ...c,
                      height: parseInt(e.target.value) || c.height,
                    }))
                  }
                  className="h-7 bg-white/5 border-white/10 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Background</label>
                <div className="flex gap-2 items-center">
                  <input
                    id="canvas-bg"
                    type="color"
                    value={canvas.background}
                    onChange={(e) =>
                      setCanvas((c) => ({ ...c, background: e.target.value }))
                    }
                    className="h-7 w-10 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={canvas.background}
                    onChange={(e) =>
                      setCanvas((c) => ({ ...c, background: e.target.value }))
                    }
                    className="h-7 flex-1 bg-white/5 border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Layer properties */
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">X</label>
                  <Input
                    id="layer-x"
                    type="number"
                    value={Math.round(selectedLayer.x)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        x: parseInt(e.target.value),
                      })
                    }
                    className="h-7 bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Y</label>
                  <Input
                    id="layer-y"
                    type="number"
                    value={Math.round(selectedLayer.y)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        y: parseInt(e.target.value),
                      })
                    }
                    className="h-7 bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">W</label>
                  <Input
                    id="layer-width"
                    type="number"
                    value={Math.round(selectedLayer.width)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        width: parseInt(e.target.value),
                      })
                    }
                    className="h-7 bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">H</label>
                  <Input
                    id="layer-height"
                    type="number"
                    value={Math.round(selectedLayer.height)}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        height: parseInt(e.target.value),
                      })
                    }
                    className="h-7 bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              {selectedLayer.type === "text" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Text</label>
                    <Input
                      id="layer-text"
                      value={selectedLayer.text ?? ""}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { text: e.target.value })
                      }
                      className="h-7 bg-white/5 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Font size</label>
                    <Input
                      id="layer-fontsize"
                      type="number"
                      value={selectedLayer.fontSize ?? 24}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          fontSize: parseInt(e.target.value),
                        })
                      }
                      className="h-7 bg-white/5 border-white/10 text-white text-xs"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs text-white/50">Fill color</label>
                <div className="flex gap-2 items-center">
                  <input
                    id="layer-fill"
                    type="color"
                    value={selectedLayer.fill ?? "#6366f1"}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, { fill: e.target.value })
                    }
                    className="h-7 w-10 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <Input
                    value={selectedLayer.fill ?? "#6366f1"}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, { fill: e.target.value })
                    }
                    className="h-7 flex-1 bg-white/5 border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/50">
                  Opacity ({Math.round(selectedLayer.opacity * 100)}%)
                </label>
                <input
                  id="layer-opacity"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={selectedLayer.opacity}
                  onChange={(e) =>
                    updateLayer(selectedLayer.id, {
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
