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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Wand2,
  Loader2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize,
  Library,
} from "lucide-react";
import type { Template } from "@/lib/db/schema";
import { saveTemplateLayersAction } from "@/app/actions/template-actions";
import { toast } from "sonner";
import Mp4Renderer from "@/components/renderer/mp4-renderer";

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
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  // rect
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  // image
  src?: string;
  name?: string; // Variable name for API replacements
}

interface CanvasConfig {
  width: number;
  height: number;
  background: string;
}

interface CanvasEditorProps {
  /** The full template record from the DB */
  template: Template;
  /** Called whenever canvas state changes (local) */
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

function makePlaceholderImage(): CanvasLayer {
  return {
    id: generateId(),
    type: "image",
    x: 150,
    y: 150,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src: "https://placehold.co/400x400/e2e8f0/64748b?text=Image+Placeholder",
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
        lineHeight={layer.lineHeight ?? 1}
        letterSpacing={layer.letterSpacing ?? 0}
        align={layer.align ?? "left"}
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

function useImage(url: string | undefined, crossOrigin = "anonymous") {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  const [status, setStatus] = useState("loading");

  React.useEffect(() => {
    if (!url) {
      setStatus("loaded");
      return;
    }

    const img = new Image();
    img.crossOrigin = crossOrigin;

    const onLoad = () => {
      setImage(img);
      setStatus("loaded");
    };

    const onError = () => {
      setImage(undefined);
      setStatus("failed");
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = url;

    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [url, crossOrigin]);

  return [image, status] as const;
}

function ImageShape({ layer, isSelected, onSelect, onChange }: ShapeProps) {
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [image] = useImage(layer.src);

  React.useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, image]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        id={layer.id}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        visible={layer.visible}
        image={image}
        draggable={!layer.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
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
  // ── Fonts ────────────────────────────────────────────────────────────────
  const FONTS = [
    { name: "Inter", value: "Inter, sans-serif" },
    { name: "Cairo (Arabic)", value: "Cairo, sans-serif" },
    { name: "Montserrat", value: "Montserrat, sans-serif" },
    { name: "Playfair Display", value: "Playfair Display, serif" },
    { name: "Oswald", value: "Oswald, sans-serif" },
    { name: "Roboto", value: "Roboto, sans-serif" },
    { name: "Open Sans", value: "Open Sans, sans-serif" },
  ];

  const SIZE_PRESETS = [
    { name: "Custom", width: 0, height: 0 },
    { name: "Instagram Post", width: 1080, height: 1080 },
    { name: "Instagram Story", width: 1080, height: 1920 },
    { name: "YouTube Thumbnail", width: 1280, height: 720 },
    { name: "Facebook Post", width: 1200, height: 630 },
    { name: "Twitter Header", width: 1500, height: 500 },
    { name: "Full HD", width: 1920, height: 1080 },
  ];
  // ── State ────────────────────────────────────────────────────────────────
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<"layers" | "assets">("layers");
  
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
  const [isSaving, setIsSaving] = useState(false);

  // ── Assets ────────────────────────────────────────────────────────────────
  const PLACEHOLDERS = {
    images: [
      { name: "Avatar", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=60" },
      { name: "Background", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60" },
      { name: "Product", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=60" },
      { name: "Workspace", url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=60" },
    ]
  };

  const handleAddImage = (url: string) => {
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      const newLayer: CanvasLayer = {
        id: generateId(),
        type: "image",
        x: (canvas.width / 2) - 100,
        y: (canvas.height / 2) - 100,
        width: 200,
        height: (200 * img.height) / img.width,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        src: url,
      };
      setLayers([...layers, newLayer]);
      setSelectedId(newLayer.id);
    };
  };

  async function handleSave() {
    if (!template) return;
    setIsSaving(true);
    try {
      await saveTemplateLayersAction(template.id, canvas, layers);
      toast.success("Design saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save design");
    } finally {
      setIsSaving(false);
    }
  }

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

  const handleLocalImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
       const base64 = event.target?.result as string;
       // Create an image object to get original dimensions
       const img = new Image();
       img.onload = () => {
         // Scale down if too large
         let w = img.width;
         let h = img.height;
         const MAX = 600;
         if (w > MAX || h > MAX) {
           const ratio = Math.min(MAX / w, MAX / h);
           w *= ratio;
           h *= ratio;
         }
         addLayer({
           id: generateId(),
           type: "image",
           x: 50,
           y: 50,
           width: w,
           height: h,
           rotation: 0,
           opacity: 1,
           locked: false,
           visible: true,
           src: base64,
           name: "background_or_image",
         });
       };
       img.src = base64;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [addLayer]);

  const updateLayer = useCallback(
    (id: string, updates: Partial<CanvasLayer>) => {
      const newLayers = layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );
      updateLayers(newLayers);
    },
    [layers, updateLayers]
  );

  const moveLayer = useCallback(
    (direction: "up" | "down") => {
      if (!selectedId) return;
      const idx = layers.findIndex((l) => l.id === selectedId);
      if (idx === -1) return;

      const newLayers = [...layers];
      const currentLayer = newLayers[idx];
      if (!currentLayer) return;

      if (direction === "up" && idx < layers.length - 1) {
        const neighboringLayer = newLayers[idx + 1]!;
        newLayers[idx] = neighboringLayer;
        newLayers[idx + 1] = currentLayer;
      } else if (direction === "down" && idx > 0) {
        const neighboringLayer = newLayers[idx - 1]!;
        newLayers[idx] = neighboringLayer;
        newLayers[idx - 1] = currentLayer;
      } else {
        return;
      }
      updateLayers(newLayers);
    },
    [layers, selectedId, updateLayers]
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
      <aside className="w-64 border-r border-white/10 bg-[#0f0f1a] flex flex-col">
        <div className="p-3 border-b border-white/10 flex gap-2">
          <Button
            size="sm"
            variant={activeTab === "layers" ? "secondary" : "ghost"}
            className="flex-1 text-[11px] gap-2"
            onClick={() => setActiveTab("layers")}
          >
            <Layers className="h-3.5 w-3.5" />
            Layers
          </Button>
          <Button
            size="sm"
            variant={activeTab === "assets" ? "secondary" : "ghost"}
            className="flex-1 text-[11px] gap-2"
            onClick={() => setActiveTab("assets")}
          >
            <Library className="h-3.5 w-3.5" />
            Assets
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "layers" ? (
            <div className="p-3 space-y-1">
              {layers.slice().reverse().map((l) => (
                <div
                  key={l.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedId === l.id ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-white/50 hover:bg-white/5"
                  }`}
                  onClick={() => setSelectedId(l.id)}
                >
                  <div className="flex items-center gap-2 max-w-[120px]">
                    {l.type === "text" ? <Type className="h-3.5 w-3.5" /> : l.type === "rect" ? <Square className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    <span className="text-xs truncate font-medium">
                      {l.type === "text" ? (l.text || "Text") : l.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }); }} className="p-1 hover:text-white">
                      {l.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { locked: !l.locked }); }} className="p-1 hover:text-white">
                      {l.locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setLayers(layers.filter(x => x.id !== l.id)); }} className="p-1 hover:text-red-400 opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {layers.length === 0 && <p className="text-xs text-white/20 text-center py-8">No layers yet</p>}
            </div>
          ) : (
            <div className="p-4 space-y-6">
               <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Placeholders</h4>
                  <div className="grid grid-cols-2 gap-3">
                     {PLACEHOLDERS.images.map((img) => (
                        <div 
                          key={img.name}
                          onClick={() => handleAddImage(img.url)}
                          className="group relative h-24 bg-white/5 border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all"
                        >
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={img.url} alt={img.name} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                           <div className="absolute inset-0 flex items-center justify-center p-2">
                              <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm truncate">
                                 {img.name}
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] text-white/20 italic">More professional assets coming soon...</p>
               </div>
            </div>
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

          <Button
            id="add-placeholder-btn"
            size="sm"
            variant="ghost"
            onClick={() => addLayer(makePlaceholderImage())}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            Placeholder
          </Button>

          <div className="relative group overflow-hidden">
            <Button
              size="sm"
              variant="ghost"
              className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              Upload Image
            </Button>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLocalImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Upload from computer"
            />
          </div>

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

          <Separator orientation="vertical" className="h-6 bg-white/10" />

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10" 
              onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <div className="px-2 text-[10px] font-mono text-white/40 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10" 
              onClick={() => setScale(s => Math.min(3, s + 0.1))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10" 
              onClick={() => {
                setScale(1);
                setStagePos({ x: 0, y: 0 });
              }}
              title="Reset Zoom"
            >
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </div>

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
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="border-white/10 text-white hover:bg-white/5"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>

            {template.type === "video" ? (
               <Mp4Renderer 
                 templateName={template.name}
                 stageRef={stageRef}
                 config={{
                   totalFrames: 100,
                   fps: 30,
                   width: canvas.width,
                   height: canvas.height,
                 }}
               />
            ) : (
              <Button
                id="export-png-btn"
                size="sm"
                onClick={exportPng}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Download className="h-4 w-4 mr-1" />
                Export PNG
              </Button>
            )}
          </div>
        </div>

        {/* Stage container */}
        <div className="flex-1 overflow-hidden bg-[#0c0c1a] flex items-center justify-center">
          <div className="relative shadow-2xl shadow-black/50">
            <Stage
              id="konva-stage"
              ref={stageRef}
              width={800} // Visible container width
              height={600} // Visible container height
              scaleX={scale}
              scaleY={scale}
              x={stagePos.x}
              y={stagePos.y}
              draggable={false}
              onDragEnd={(e) => {
                setStagePos({ x: e.target.x(), y: e.target.y() });
              }}
              onWheel={(e) => {
                e.evt.preventDefault();
                const stage = stageRef.current;
                if (!stage) return;

                const oldScale = stage.scaleX();
                const pointer = stage.getPointerPosition();
                if (!pointer) return;

                const mousePointTo = {
                  x: (pointer.x - stage.x()) / oldScale,
                  y: (pointer.y - stage.y()) / oldScale,
                };

                const scaleBy = 1.1;
                const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                const clampedScale = Math.max(0.05, Math.min(5, newScale));
                
                setScale(clampedScale);

                const newPos = {
                  x: pointer.x - mousePointTo.x * clampedScale,
                  y: pointer.y - mousePointTo.y * clampedScale,
                };
                
                setStagePos(newPos);
              }}
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
                  if (layer.type === "image") return <ImageShape key={layer.id} {...props} />;
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
                <label className="text-xs text-white/50">Size Preset</label>
                <Select
                  value={SIZE_PRESETS.find(p => p.width === canvas.width && p.height === canvas.height)?.name || "Custom"}
                  onValueChange={(val) => {
                    const preset = SIZE_PRESETS.find(p => p.name === val);
                    if (preset && preset.name !== "Custom") {
                      setCanvas(c => ({ ...c, width: preset.width, height: preset.height }));
                    }
                  }}
                >
                  <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white text-[10px]">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121225] border-white/10 text-white">
                    {SIZE_PRESETS.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name} {p.width > 0 ? `(${p.width}x${p.height})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
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

              <div className="space-y-1">
                <label className="text-xs text-white/50">Layer Order</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 border-white/10 text-white/70 hover:bg-white/5"
                    onClick={() => moveLayer("up")}
                    disabled={layers.findIndex(l => l.id === selectedId) === layers.length - 1}
                  >
                    Bring Forward
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 border-white/10 text-white/70 hover:bg-white/5"
                    onClick={() => moveLayer("down")}
                    disabled={layers.findIndex(l => l.id === selectedId) === 0}
                  >
                    Send Backward
                  </Button>
                </div>
              </div>

              <div className="space-y-1 mt-4 pt-4 border-t border-white/10">
                <label className="text-xs text-white flex justify-between">
                  <span>API Variable Name</span>
                  <span className="text-[10px] text-white/40">Optional</span>
                </label>
                <p className="text-[10px] text-white/40 leading-snug">
                  Give this layer a name (e.g. <span className="text-indigo-300">avatar</span>, <span className="text-indigo-300">title</span>) so you can send dynamic content to it via the API.
                </p>
                <Input
                  id="layer-name"
                  value={selectedLayer.name || ""}
                  onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                  placeholder="e.g. name2"
                  className="h-8 bg-black/40 border-indigo-500/30 focus-visible:border-indigo-400 text-indigo-100 text-xs font-mono"
                />
              </div>

              {selectedLayer.type === "text" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Font Family</label>
                    <Select
                      value={selectedLayer.fontFamily || "Inter, sans-serif"}
                      onValueChange={(val) => {
                        if (val) updateLayer(selectedLayer.id, { fontFamily: val });
                      }}
                    >
                      <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white text-[10px]">
                        <SelectValue placeholder="Font family" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121225] border-white/10 text-white">
                        {FONTS.map((font) => (
                          <SelectItem
                            key={font.value}
                            value={font.value}
                            style={{ fontFamily: font.value }}
                          >
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Content</label>
                    <Input
                      id="layer-text"
                      value={selectedLayer.text || ""}
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

                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Line Height ({selectedLayer.lineHeight ?? 1})</label>
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={selectedLayer.lineHeight ?? 1}
                      onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 h-1.5 rounded-lg appearance-none bg-white/10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Letter Spacing ({selectedLayer.letterSpacing ?? 0}px)</label>
                    <input
                      type="range"
                      min={-10}
                      max={50}
                      step={1}
                      value={selectedLayer.letterSpacing ?? 0}
                      onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 h-1.5 rounded-lg appearance-none bg-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/50">Alignment</label>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className={`flex-1 h-7 ${selectedLayer.align === "left" ? "bg-indigo-600/20 text-indigo-400" : "text-white/40"}`}
                         onClick={() => updateLayer(selectedLayer.id, { align: "left" })}
                       >
                          Left
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className={`flex-1 h-7 ${selectedLayer.align === "center" ? "bg-indigo-600/20 text-indigo-400" : "text-white/40"}`}
                         onClick={() => updateLayer(selectedLayer.id, { align: "center" })}
                       >
                          Center
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className={`flex-1 h-7 ${selectedLayer.align === "right" ? "bg-indigo-600/20 text-indigo-400" : "text-white/40"}`}
                         onClick={() => updateLayer(selectedLayer.id, { align: "right" })}
                       >
                          Right
                       </Button>
                    </div>
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
