import React from 'react';
import JSZip from 'jszip';
import { Download, Trash2, CheckCircle2, AlertCircle, Loader2, Archive } from 'lucide-react';
import { ProcessedImageItem, ExportSettings } from '../types/watermark';
import { generateOutputFilename } from '../utils/watermark';
import { useTheme } from '../context/ThemeContext';

interface BatchManagerProps {
  items: ProcessedImageItem[];
  selectedId: string | null;
  exportSettings: ExportSettings;
  onSelectItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  items,
  selectedId,
  exportSettings,
  onSelectItem,
  onRemoveItem,
  onClearAll,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (items.length === 0) return null;

  const completedItems = items.filter((item) => item.status === 'done' && item.processedBlob);

  const handleDownloadSingle = (item: ProcessedImageItem) => {
    if (!item.processedBlob) return;
    const filename = generateOutputFilename(
      item.originalName,
      exportSettings.filenameSuffix,
      exportSettings.format
    );
    const url = URL.createObjectURL(item.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    if (completedItems.length === 0) return;

    const zip = new JSZip();
    completedItems.forEach((item) => {
      if (item.processedBlob) {
        const filename = generateOutputFilename(
          item.originalName,
          exportSettings.filenameSuffix,
          exportSettings.format
        );
        zip.file(filename, item.processedBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watermarked_images_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`rounded-xl border p-4 space-y-4 transition-colors ${
        isDark
          ? 'bg-gray-900 border-gray-800 text-gray-200 shadow-xl'
          : 'bg-white border-slate-200 text-slate-800 shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
            Image Queue ({items.length})
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {completedItems.length} of {items.length} processed
          </p>
        </div>

        <div className="flex items-center gap-2">
          {completedItems.length > 0 && (
            <button
              onClick={handleDownloadAllZip}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Archive className="w-3.5 h-3.5" />
              Download ZIP ({completedItems.length})
            </button>
          )}

          <button
            onClick={onClearAll}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer border ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Clear all images"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Clear
          </button>
        </div>
      </div>

      {/* Image Thumbnail Grid / Queue */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-60 overflow-y-auto p-1">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                  : isDark
                  ? 'border-gray-800 bg-gray-800/40 hover:border-gray-700'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div
                className={`aspect-square relative flex items-center justify-center overflow-hidden ${
                  isDark ? 'bg-gray-950' : 'bg-slate-200'
                }`}
              >
                <img
                  src={item.processedUrl || item.previewUrl}
                  alt={item.originalName}
                  className="w-full h-full object-cover"
                />

                {/* Status Overlay Icon */}
                <div className="absolute top-1 right-1">
                  {item.status === 'processing' && (
                    <span className="p-1 bg-gray-900/80 rounded-full text-indigo-400 block">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="p-1 bg-emerald-950/80 rounded-full text-emerald-400 block">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="p-1 bg-red-950/80 rounded-full text-red-400 block">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Single Download button on hover if ready */}
                {item.status === 'done' && item.processedBlob && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSingle(item);
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium gap-1"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download</span>
                  </button>
                )}
              </div>

              {/* Item Info Footer */}
              <div
                className={`p-1.5 flex items-center justify-between text-[11px] ${
                  isDark ? 'bg-gray-900/90 text-gray-300' : 'bg-slate-100/90 text-slate-700'
                }`}
              >
                <span className="truncate max-w-[80px]" title={item.originalName}>
                  {item.originalName}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className={`p-0.5 hover:text-red-500 ${
                    isDark ? 'text-gray-500' : 'text-slate-400'
                  }`}
                  title="Remove image"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
