import React, { useRef } from 'react';
import {
  WatermarkOptions,
  SinglePosition,
  RepeatPosition,
  TextWatermarkSettings,
  LogoWatermarkSettings,
  ExportSettings,
} from '../types/watermark';
import {
  Type,
  Image as ImageIcon,
  Square,
  Repeat,
  Sparkles,
  Download,
  Upload,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ControlPanelProps {
  options: WatermarkOptions;
  onChange: (options: WatermarkOptions) => void;
  onApplyBatch: () => void;
  isProcessing: boolean;
  fileCount: number;
}

const FONT_FAMILIES = [
  { label: 'Sans-Serif (Inter/Arial)', value: 'sans-serif' },
  { label: 'Serif (Times New Roman)', value: 'serif' },
  { label: 'Monospace (Courier New)', value: 'monospace' },
  { label: 'Impact / Bold Display', value: 'Impact, sans-serif' },
  { label: 'Cursive / Script', value: 'cursive' },
];

const REPEAT_POSITIONS: Array<{ label: string; value: RepeatPosition }> = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Left - Right (Alternating)', value: 'alternating' },
];

const POSITIONS: Array<{ label: string; value: SinglePosition }> = [
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Center', value: 'top-center' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Center Left', value: 'center-left' },
  { label: 'Center', value: 'center' },
  { label: 'Center Right', value: 'center-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Right', value: 'bottom-right' },
  { label: 'Custom (% Pos)', value: 'custom' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  options,
  onChange,
  onApplyBatch,
  isProcessing,
  fileCount,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const logoInputRef = useRef<HTMLInputElement>(null);

  const updateText = (partial: Partial<TextWatermarkSettings>) => {
    onChange({
      ...options,
      text: { ...options.text, ...partial },
    });
  };

  const updateLogo = (partial: Partial<LogoWatermarkSettings>) => {
    onChange({
      ...options,
      logo: { ...options.logo, ...partial },
    });
  };

  const updateExport = (partial: Partial<ExportSettings>) => {
    onChange({
      ...options,
      export: { ...options.export, ...partial },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          updateLogo({
            enabled: true,
            imageSrc: src,
            imageElement: img,
            imageFileName: file.name,
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClass = isDark
    ? 'bg-gray-900 border-gray-700 text-gray-100 focus:outline-none focus:border-indigo-500'
    : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs';

  const sectionBoxClass = isDark
    ? 'p-3 bg-gray-800/50 rounded-lg border border-gray-700/60 space-y-3 mt-2'
    : 'p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 mt-2';

  const sliderClass = `w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${
    isDark ? 'bg-gray-700' : 'bg-slate-200'
  }`;

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden border transition-colors ${
        isDark
          ? 'bg-gray-900 border-gray-800 text-gray-200 shadow-xl'
          : 'bg-white border-slate-200 text-slate-800 shadow-md'
      }`}
    >
      <div
        className={`p-4 border-b flex items-center gap-2 ${
          isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-100/80 border-slate-200'
        }`}
      >
        <Sparkles className="w-5 h-5 text-indigo-500" />
        <h2 className={`font-semibold text-base ${isDark ? 'text-gray-100' : 'text-slate-900'}`}>
          Watermark Controls
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
        {/* 1. Mode Selection */}
        <div className="space-y-2">
          <label
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            Watermark Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChange({ ...options, mode: 'single' })}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-medium text-xs transition-all cursor-pointer ${
                options.mode === 'single'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : isDark
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Square className="w-4 h-4" />
              Single Watermark
            </button>
            <button
              onClick={() => onChange({ ...options, mode: 'repeated' })}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-medium text-xs transition-all cursor-pointer ${
                options.mode === 'repeated'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : isDark
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Repeat className="w-4 h-4" />
              Repeated Watermark
            </button>
          </div>

          {(options.mode === 'single' || options.mode === 'repeated') && (
            <div className={sectionBoxClass}>
              <div>
                <label
                  className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                >
                  Watermark Position
                </label>
                <select
                  value={options.repeat?.position || 'center'}
                  onChange={(e) =>
                    onChange({
                      ...options,
                      repeat: {
                        position: e.target.value as RepeatPosition,
                        spacing: options.repeat?.spacing ?? 3000,
                      },
                    })
                  }
                  className={`w-full rounded-lg px-2 py-1.5 text-xs ${inputClass}`}
                >
                  {REPEAT_POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {options.mode === 'repeated' && (
                <div>
                  <label
                    className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                  >
                    Watermark Spacing (px)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={
                      options.repeat?.spacing === 0 || isNaN(options.repeat?.spacing ?? 3000)
                        ? ''
                        : options.repeat?.spacing ?? 3000
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        onChange({
                          ...options,
                          repeat: {
                            position: options.repeat?.position || 'center',
                            spacing: 0,
                          },
                        });
                        return;
                      }
                      const val = parseInt(raw, 10);
                      onChange({
                        ...options,
                        repeat: {
                          position: options.repeat?.position || 'center',
                          spacing: isNaN(val) ? 0 : val,
                        },
                      });
                    }}
                    onBlur={() => {
                      if (!options.repeat?.spacing || options.repeat.spacing <= 0) {
                        onChange({
                          ...options,
                          repeat: {
                            position: options.repeat?.position || 'center',
                            spacing: 3000,
                          },
                        });
                      }
                    }}
                    className={`w-full rounded-lg px-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>
              )}
            </div>
          )}

          {options.mode === 'tiled' && (
            <div className={sectionBoxClass}>
              <div>
                <div
                  className={`flex justify-between text-xs mb-1 ${
                    isDark ? 'text-gray-300' : 'text-slate-700'
                  }`}
                >
                  <span>Horizontal Tile Spacing</span>
                  <span className="font-mono text-indigo-500">{options.tiling.spacingX}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={options.tiling.spacingX}
                  onChange={(e) =>
                    onChange({
                      ...options,
                      tiling: { ...options.tiling, spacingX: Number(e.target.value) },
                    })
                  }
                  className={sliderClass}
                />
              </div>

              <div>
                <div
                  className={`flex justify-between text-xs mb-1 ${
                    isDark ? 'text-gray-300' : 'text-slate-700'
                  }`}
                >
                  <span>Vertical Tile Spacing</span>
                  <span className="font-mono text-indigo-500">{options.tiling.spacingY}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={options.tiling.spacingY}
                  onChange={(e) =>
                    onChange({
                      ...options,
                      tiling: { ...options.tiling, spacingY: Number(e.target.value) },
                    })
                  }
                  className={sliderClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Text Watermark Settings */}
        <div className={`border-t pt-4 space-y-3 ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 font-semibold ${
                isDark ? 'text-gray-200' : 'text-slate-800'
              }`}
            >
              <Type className="w-4 h-4 text-indigo-500" />
              <span>Text Watermark</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.text.enabled}
                onChange={(e) => updateText({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div
                className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                  isDark ? 'bg-gray-700' : 'bg-slate-300'
                }`}
              ></div>
            </label>
          </div>

          {options.text.enabled && (
            <div
              className={`space-y-3 p-3 rounded-lg border ${
                isDark
                  ? 'bg-gray-800/40 border-gray-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <label
                  className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                >
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={options.text.text}
                  onChange={(e) => updateText({ text: e.target.value })}
                  placeholder="Enter watermark text..."
                  className={`w-full rounded-lg px-3 py-1.5 text-xs ${inputClass}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                  >
                    Font Family
                  </label>
                  <select
                    value={options.text.fontFamily}
                    onChange={(e) => updateText({ fontFamily: e.target.value })}
                    className={`w-full rounded-lg px-2 py-1.5 text-xs ${inputClass}`}
                  >
                    {FONT_FAMILIES.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                  >
                    Weight
                  </label>
                  <select
                    value={options.text.fontWeight}
                    onChange={(e) => updateText({ fontWeight: e.target.value })}
                    className={`w-full rounded-lg px-2 py-1.5 text-xs ${inputClass}`}
                  >
                    <option value="300">Light</option>
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="900">Black / Ultra</option>
                  </select>
                </div>
              </div>

              {/* Size & Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div
                    className={`flex justify-between items-center text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-slate-500'
                    }`}
                  >
                    <span>Size</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateText({
                          fontSizeUnit: options.text.fontSizeUnit === 'px' ? '%' : 'px',
                        })
                      }
                      className="text-[10px] text-indigo-500 hover:underline cursor-pointer"
                    >
                      Unit: {options.text.fontSizeUnit}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={options.text.fontSize}
                    onChange={(e) => updateText({ fontSize: Number(e.target.value) })}
                    className={`w-full rounded-lg px-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                  >
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={options.text.color}
                      onChange={(e) => updateText({ color: e.target.value })}
                      className={`w-8 h-8 rounded border bg-transparent cursor-pointer p-0 ${
                        isDark ? 'border-gray-700' : 'border-slate-300'
                      }`}
                    />
                    <span className="font-mono text-xs uppercase">{options.text.color}</span>
                  </div>
                </div>
              </div>

              {/* Opacity & Rotation */}
              <div>
                <div
                  className={`flex justify-between text-xs mb-1 ${
                    isDark ? 'text-gray-300' : 'text-slate-700'
                  }`}
                >
                  <span>Opacity</span>
                  <span className="font-mono text-indigo-500">
                    {Math.round(options.text.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={options.text.opacity}
                  onChange={(e) => updateText({ opacity: Number(e.target.value) })}
                  className={sliderClass}
                />
              </div>

              <div>
                <div
                  className={`flex justify-between text-xs mb-1 ${
                    isDark ? 'text-gray-300' : 'text-slate-700'
                  }`}
                >
                  <span>Rotation</span>
                  <span className="font-mono text-indigo-500">{options.text.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={options.text.rotation}
                  onChange={(e) => updateText({ rotation: Number(e.target.value) })}
                  className={sliderClass}
                />
              </div>

              {/* Position (Single Mode) */}
              {options.mode === 'single' && (
                <div>
                  <label
                    className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                  >
                    Position Preset
                  </label>
                  <select
                    value={options.text.position}
                    onChange={(e) =>
                      updateText({ position: e.target.value as SinglePosition })
                    }
                    className={`w-full rounded-lg px-2 py-1.5 text-xs ${inputClass}`}
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>

                  {options.text.position === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <span
                          className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                        >
                          X (%):
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={options.text.customX}
                          onChange={(e) => updateText({ customX: Number(e.target.value) })}
                          className={`w-full rounded px-2 py-1 text-xs ${inputClass}`}
                        />
                      </div>
                      <div>
                        <span
                          className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                        >
                          Y (%):
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={options.text.customY}
                          onChange={(e) => updateText({ customY: Number(e.target.value) })}
                          className={`w-full rounded px-2 py-1 text-xs ${inputClass}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outline & Shadow options */}
              <div
                className={`border-t pt-2 space-y-2 ${
                  isDark ? 'border-gray-700/50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    Text Outline
                  </span>
                  <input
                    type="checkbox"
                    checked={options.text.outlineEnabled}
                    onChange={(e) => updateText({ outlineEnabled: e.target.checked })}
                    className="accent-indigo-600 cursor-pointer"
                  />
                </div>
                {options.text.outlineEnabled && (
                  <div className="flex items-center gap-2 pl-2">
                    <input
                      type="color"
                      value={options.text.outlineColor}
                      onChange={(e) => updateText({ outlineColor: e.target.value })}
                      className={`w-6 h-6 rounded border bg-transparent cursor-pointer p-0 ${
                        isDark ? 'border-gray-700' : 'border-slate-300'
                      }`}
                    />
                    <span
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                    >
                      Width:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={options.text.outlineWidth}
                      onChange={(e) => updateText({ outlineWidth: Number(e.target.value) })}
                      className={`w-16 rounded px-2 py-0.5 text-xs ${inputClass}`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                    Text Shadow
                  </span>
                  <input
                    type="checkbox"
                    checked={options.text.shadowEnabled}
                    onChange={(e) => updateText({ shadowEnabled: e.target.checked })}
                    className="accent-indigo-600 cursor-pointer"
                  />
                </div>
                {options.text.shadowEnabled && (
                  <div className="flex items-center gap-2 pl-2">
                    <input
                      type="color"
                      value={options.text.shadowColor}
                      onChange={(e) => updateText({ shadowColor: e.target.value })}
                      className={`w-6 h-6 rounded border bg-transparent cursor-pointer p-0 ${
                        isDark ? 'border-gray-700' : 'border-slate-300'
                      }`}
                    />
                    <span
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                    >
                      Blur:
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={options.text.shadowBlur}
                      onChange={(e) => updateText({ shadowBlur: Number(e.target.value) })}
                      className={`w-16 rounded px-2 py-0.5 text-xs ${inputClass}`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Logo Watermark Settings */}
        <div className={`border-t pt-4 space-y-3 ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 font-semibold ${
                isDark ? 'text-gray-200' : 'text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <span>Image / Logo Watermark</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.logo.enabled}
                onChange={(e) => updateLogo({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div
                className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                  isDark ? 'bg-gray-700' : 'bg-slate-300'
                }`}
              ></div>
            </label>
          </div>

          {options.logo.enabled && (
            <div
              className={`space-y-3 p-3 rounded-lg border ${
                isDark
                  ? 'bg-gray-800/40 border-gray-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isDark
                    ? 'border-gray-700 hover:border-indigo-500 text-gray-300 hover:text-indigo-400 bg-gray-900'
                    : 'border-slate-300 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 bg-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                {options.logo.imageFileName
                  ? `Logo: ${options.logo.imageFileName}`
                  : 'Upload Logo / Image'}
              </button>

              {options.logo.imageSrc && (
                <>
                  <div>
                    <div
                      className={`flex justify-between text-xs mb-1 ${
                        isDark ? 'text-gray-300' : 'text-slate-700'
                      }`}
                    >
                      <span>Logo Scale</span>
                      <span className="font-mono text-indigo-500">{options.logo.scale}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={options.logo.scale}
                      onChange={(e) => updateLogo({ scale: Number(e.target.value) })}
                      className={sliderClass}
                    />
                  </div>

                  <div>
                    <div
                      className={`flex justify-between text-xs mb-1 ${
                        isDark ? 'text-gray-300' : 'text-slate-700'
                      }`}
                    >
                      <span>Opacity</span>
                      <span className="font-mono text-indigo-500">
                        {Math.round(options.logo.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={options.logo.opacity}
                      onChange={(e) => updateLogo({ opacity: Number(e.target.value) })}
                      className={sliderClass}
                    />
                  </div>

                  <div>
                    <div
                      className={`flex justify-between text-xs mb-1 ${
                        isDark ? 'text-gray-300' : 'text-slate-700'
                      }`}
                    >
                      <span>Rotation</span>
                      <span className="font-mono text-indigo-500">{options.logo.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={options.logo.rotation}
                      onChange={(e) => updateLogo({ rotation: Number(e.target.value) })}
                      className={sliderClass}
                    />
                  </div>

                  {options.mode === 'single' && (
                    <div>
                      <label
                        className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                      >
                        Position Preset
                      </label>
                      <select
                        value={options.logo.position}
                        onChange={(e) =>
                          updateLogo({ position: e.target.value as SinglePosition })
                        }
                        className={`w-full rounded-lg px-2 py-1.5 text-xs ${inputClass}`}
                      >
                        {POSITIONS.map((pos) => (
                          <option key={pos.value} value={pos.value}>
                            {pos.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Export Format Settings */}
        <div className={`border-t pt-4 space-y-3 ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
          <label
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            Export Options
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => updateExport({ format: fmt })}
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold uppercase transition-all cursor-pointer ${
                  options.export.format === fmt
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {options.export.format !== 'png' && (
            <div>
              <div
                className={`flex justify-between text-xs mb-1 ${
                  isDark ? 'text-gray-300' : 'text-slate-700'
                }`}
              >
                <span>Output Quality</span>
                <span className="font-mono text-indigo-500">
                  {Math.round(options.export.quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={options.export.quality}
                onChange={(e) => updateExport({ quality: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
          )}

          <div>
            <label
              className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
            >
              Filename Suffix
            </label>
            <input
              type="text"
              value={options.export.filenameSuffix}
              onChange={(e) => updateExport({ filenameSuffix: e.target.value })}
              placeholder="_watermarked"
              className={`w-full rounded-lg px-3 py-1.5 text-xs ${inputClass}`}
            />
          </div>
        </div>
      </div>

      {/* Process Action */}
      <div
        className={`p-4 border-t ${
          isDark ? 'bg-gray-800/80 border-gray-800' : 'bg-slate-100/80 border-slate-200'
        }`}
      >
        <button
          onClick={onApplyBatch}
          disabled={isProcessing || fileCount === 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg text-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {isProcessing
            ? 'Processing Images...'
            : `Process & Watermark (${fileCount} ${fileCount === 1 ? 'image' : 'images'})`}
        </button>
      </div>
    </div>
  );
};
