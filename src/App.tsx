import { useState, useCallback } from 'react';
import {
  WatermarkOptions,
  ProcessedImageItem,
} from './types/watermark';
import { FileUploader } from './components/FileUploader';
import { ImagePreview } from './components/ImagePreview';
import { ControlPanel } from './components/ControlPanel';
import { BatchManager } from './components/BatchManager';
import { processWatermarkImage } from './utils/watermark';
import { Droplet, Layers } from 'lucide-react';

const DEFAULT_OPTIONS: WatermarkOptions = {
  mode: 'single',
  text: {
    enabled: true,
    text: 'WATERMARK',
    fontFamily: 'sans-serif',
    fontSize: 28,
    fontSizeUnit: 'px',
    fontWeight: 'bold',
    color: '#ffffff',
    opacity: 0.7,
    rotation: -30,
    position: 'center',
    customX: 50,
    customY: 50,
    outlineEnabled: true,
    outlineColor: '#000000',
    outlineWidth: 2,
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
  },
  logo: {
    enabled: false,
    imageSrc: null,
    imageElement: null,
    imageFileName: null,
    scale: 25,
    opacity: 0.8,
    rotation: 0,
    position: 'bottom-right',
    customX: 90,
    customY: 90,
  },
  tiling: {
    spacingX: 120,
    spacingY: 100,
  },
  export: {
    format: 'png',
    quality: 0.9,
    filenameSuffix: '_wm',
  },
};

export default function App() {
  const [items, setItems] = useState<ProcessedImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<WatermarkOptions>(DEFAULT_OPTIONS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: ProcessedImageItem[] = files.map((file) => {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);
      return {
        id,
        file,
        originalName: file.name,
        width: 0,
        height: 0,
        previewUrl,
        status: 'idle',
      };
    });

    // Extract natural dimensions asynchronously
    newItems.forEach((item) => {
      const img = new Image();
      img.onload = () => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, width: img.width, height: img.height } : i))
        );
      };
      img.src = item.previewUrl;
    });

    setItems((prev) => [...prev, ...newItems]);
    if (!selectedId && newItems.length > 0) {
      setSelectedId(newItems[0].id);
    }
  }, [selectedId]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.processedUrl) URL.revokeObjectURL(target.processedUrl);
      }
      const filtered = prev.filter((i) => i.id !== id);
      if (selectedId === id) {
        setSelectedId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [selectedId]);

  const handleClearAll = useCallback(() => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });
    setItems([]);
    setSelectedId(null);
  }, [items]);

  const handleApplyBatch = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);

    // Mark all as processing
    setItems((prev) => prev.map((item) => ({ ...item, status: 'processing' })));

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      try {
        const blob = await processWatermarkImage(current.file, options);
        const processedUrl = URL.createObjectURL(blob);

        setItems((prev) =>
          prev.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  processedBlob: blob,
                  processedUrl,
                  status: 'done',
                }
              : item
          )
        );
      } catch (err) {
        console.error(`Error processing image ${current.originalName}:`, err);
        setItems((prev) =>
          prev.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: err instanceof Error ? err.message : 'Unknown error',
                }
              : item
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const selectedItem = items.find((i) => i.id === selectedId) || (items.length > 0 ? items[0] : null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-500/20 shadow-lg text-white">
            <Droplet className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              WMTool <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">v1.0</span>
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">Client-side Batch Image Watermarking Engine</p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <FileUploader onFilesSelected={handleFilesSelected} compact />
          </div>
        )}
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        {items.length === 0 ? (
          <div className="my-auto py-16 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
              <Layers className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Browser-Based Watermark Editor</h2>
              <p className="text-sm text-gray-400">
                Watermark single or multiple PNG, JPEG, and WebP images instantly in your browser. No files are ever uploaded to a server.
              </p>
            </div>
            <div className="w-full">
              <FileUploader onFilesSelected={handleFilesSelected} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
            {/* Left/Center: Image Preview & Batch Queue (Cols 7 or 8) */}
            <div className="w-full lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              <div className="h-[500px] lg:h-[600px] w-full">
                <ImagePreview item={selectedItem} options={options} />
              </div>

              <BatchManager
                items={items}
                selectedId={selectedItem?.id || null}
                exportSettings={options.export}
                onSelectItem={(id) => setSelectedId(id)}
                onRemoveItem={handleRemoveItem}
                onClearAll={handleClearAll}
              />
            </div>

            {/* Right: Control Panel (Cols 5 or 4) */}
            <div className="w-full lg:col-span-5 xl:col-span-4 h-full lg:sticky lg:top-20">
              <ControlPanel
                options={options}
                onChange={setOptions}
                onApplyBatch={handleApplyBatch}
                isProcessing={isProcessing}
                fileCount={items.length}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-gray-900/50 py-3 px-4 text-center text-xs text-gray-500">
        WMTool — Local & Private Browser Watermarking App
      </footer>
    </div>
  );
}
