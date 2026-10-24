import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { WatermarkOptions, ProcessedImageItem } from '../types/watermark';
import { applyWatermarkToCanvas } from '../utils/watermark';

interface ImagePreviewProps {
  item: ProcessedImageItem | null;
  options: WatermarkOptions;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ item, options }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const handleZoomIn = () => setZoom((z) => Math.min(5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z - 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 && pan.x === 0 && pan.y === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => setIsDragging(false);

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-dashed border-gray-700 rounded-xl bg-gray-800/30 text-gray-500">
        <p className="text-sm">Select or upload an image to preview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700 text-xs text-gray-300">
        <div className="truncate font-medium max-w-[200px]" title={item.originalName}>
          {item.originalName} ({item.width} × {item.height}px)
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-xs font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-300 transition-colors ml-1"
            title="Reset Zoom & Position"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Canvas Workspace */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 min-h-[350px] overflow-hidden flex items-center justify-center bg-[radial-gradient(#2a2d3d_1px,transparent_1px)] [background-size:16px_16px] bg-gray-950 cursor-grab active:cursor-grabbing select-none"
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
