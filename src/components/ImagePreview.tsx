import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { WatermarkOptions, ProcessedImageItem } from '../types/watermark';
import { applyWatermarkToCanvas } from '../utils/watermark';
import { useTheme } from '../context/ThemeContext';
import { calculateBoundedPan } from '../utils/pan';

interface ImagePreviewProps {
  item: ProcessedImageItem | null;
  options: WatermarkOptions;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ item, options }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Active pointers map to support multi-touch gestures (panning & pinch-zoom)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number>(0);
  const initialPinchZoomRef = useRef<number>(1);

  // Load target base image when item changes
  useEffect(() => {
    if (!item) {
      setLoadedImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = item.previewUrl;
    img.onload = () => {
      setLoadedImage(img);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
  }, [item?.previewUrl]);

  // Redraw canvas when image or watermark options update
  useEffect(() => {
    if (!canvasRef.current || !loadedImage) return;
    applyWatermarkToCanvas(canvasRef.current, loadedImage, options);
  }, [loadedImage, options]);

  // Handle native wheel zoom (Ctrl + wheel or wheel when zoomed)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || zoom > 1) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((z) => Math.min(5, Math.max(0.2, z + delta)));
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [zoom]);

  const handleZoomIn = () => setZoom((z) => Math.min(5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z - 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture fails in synthetic test environments
    }

    if (activePointersRef.current.size === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
      setIsDragging(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      const rawX = e.clientX - dragStartRef.current.x;
      const rawY = e.clientY - dragStartRef.current.y;
      const containerW = containerRef.current?.clientWidth || 300;
      const containerH = containerRef.current?.clientHeight || 300;

      const bounded = calculateBoundedPan(rawX, rawY, zoom, containerW, containerH);
      setPan(bounded);
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (initialPinchDistRef.current > 0) {
        const scaleRatio = dist / initialPinchDistRef.current;
        const newZoom = Math.min(5, Math.max(0.2, initialPinchZoomRef.current * scaleRatio));
        setZoom(newZoom);
      }
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if releasePointerCapture fails in synthetic test environments
    }

    if (activePointersRef.current.size === 1) {
      const remaining = Array.from(activePointersRef.current.values())[0];
      dragStartRef.current = { x: remaining.x - pan.x, y: remaining.y - pan.y };
      setIsDragging(true);
    } else if (activePointersRef.current.size === 0) {
      setIsDragging(false);
    }
  };

  if (!item) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full min-h-[400px] border border-dashed rounded-xl ${
          isDark
            ? 'border-gray-700 bg-gray-800/30 text-gray-500'
            : 'border-slate-300 bg-slate-100/50 text-slate-500'
        }`}
      >
        <p className="text-sm">Select or upload an image to preview</p>
      </div>
    );
  }

  // Disable touch scrolling on container when zoomed in or dragging to prevent accidental page scroll
  const isPanLocked = zoom > 1 || isDragging || pan.x !== 0 || pan.y !== 0;

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden border transition-colors ${
        isDark
          ? 'bg-gray-900 border-gray-800 shadow-xl'
          : 'bg-white border-slate-200 shadow-md'
      }`}
    >
      {/* Top Toolbar */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b text-xs transition-colors ${
          isDark
            ? 'bg-gray-800/80 border-gray-700 text-gray-300'
            : 'bg-slate-100/80 border-slate-200 text-slate-700'
        }`}
      >
        <div className="truncate font-medium max-w-[200px]" title={item.originalName}>
          {item.originalName} ({item.width} × {item.height}px)
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-xs font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className={`p-1.5 rounded transition-colors ml-1 cursor-pointer ${
              isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Reset Zoom & Position"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Canvas Workspace */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        style={{ touchAction: isPanLocked ? 'none' : 'auto' }}
        className={`relative flex-1 min-h-[350px] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors ${
          isDark
            ? 'bg-[radial-gradient(#2a2d3d_1px,transparent_1px)] [background-size:16px_16px] bg-gray-950'
            : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="max-w-full max-h-full p-4"
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded"
          />
        </div>
      </div>
    </div>
  );
};
