import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, compact }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  if (compact) {
    return (
      <div className="inline-block">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="image/*"
          multiple
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          Add Images
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : isDark
          ? 'border-gray-700 bg-gray-800/50 hover:border-indigo-400 hover:bg-gray-800'
          : 'border-slate-300 bg-white hover:border-indigo-500 hover:bg-slate-50 shadow-sm'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/*"
        multiple
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div
          className={`p-4 rounded-full ${
            isDark ? 'bg-gray-700/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          <ImageIcon className="w-8 h-8" />
        </div>
        <div>
          <p className={`text-base font-semibold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
            Drag & drop images here, or <span className="text-indigo-500 underline">browse</span>
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Supports PNG, JPEG, WebP, GIF, BMP and other common browser image formats.
          </p>
        </div>
      </div>
    </div>
  );
};
