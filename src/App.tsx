import React, { useState } from 'react';
import './App.css';

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface TextWatermarkConfig {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  color: string;
}

export interface ImageWatermarkConfig {
  imageUrl: string | null;
  imageName: string;
  size: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
}

export interface UploadedImage {
  id: string;
  name: string;
  url: string;
}

const POSITION_OPTIONS: { id: WatermarkPosition; label: string }[] = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'center', label: 'Center' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
];

export function App() {
  // Uploaded images state
  const [images, setImages] = useState<UploadedImage[]>([
    {
      id: 'sample-1',
      name: 'Sample Image 1.jpg',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'sample-2',
      name: 'Sample Image 2.jpg',
      url: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1000&q=80',
    },
  ]);

  const [selectedImageId, setSelectedImageId] = useState<string>('sample-1');
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Text watermark settings
  const [textConfig, setTextConfig] = useState<TextWatermarkConfig>({
    text: 'Watermark Tool',
    fontSize: 28,
    opacity: 80,
    rotation: -25,
    position: 'center',
    color: '#ffffff',
  });

  // Image watermark settings
  const [imageConfig, setImageConfig] = useState<ImageWatermarkConfig>({
    imageUrl: null,
    imageName: '',
    size: 25,
    opacity: 85,
    rotation: 0,
    position: 'bottom-right',
  });

  const selectedImage = images.find((img) => img.id === selectedImageId) || images[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Handle uploading base images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const newImages: UploadedImage[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    if (newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }
  };

  // Handle PNG watermark upload
  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    setImageConfig((prev) => ({
      ...prev,
      imageUrl: url,
      imageName: file.name,
    }));
  };

  // Handle drag and drop for base images
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length === 0) return;

      const newImages: UploadedImage[] = files.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        url: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...newImages]);
      setSelectedImageId(newImages[0].id);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = images.filter((img) => img.id !== id);
    setImages(filtered);
    if (selectedImageId === id && filtered.length > 0) {
      setSelectedImageId(filtered[0].id);
    }
  };

  const handleApplyToAll = () => {
    showToast(`Applied ${activeTab === 'text' ? 'text' : 'image'} watermark settings to all ${images.length} images!`);
  };

  const handleDownload = () => {
    if (!selectedImage) {
      showToast('No image selected to download.');
      return;
    }
    showToast(`Downloading current image (${selectedImage.name})...`);
  };

  const handleDownloadZip = () => {
    if (images.length === 0) {
      showToast('No images available to download.');
      return;
    }
    showToast(`Downloading ZIP archive containing ${images.length} images...`);
  };

  // Style calculator for watermark overlay preview
  const getWatermarkPositionStyle = (pos: WatermarkPosition) => {
    const style: React.CSSProperties = {
      position: 'absolute',
    };

    switch (pos) {
      case 'top-left':
        style.top = '12px';
        style.left = '12px';
        break;
      case 'top-center':
        style.top = '12px';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        style.top = '12px';
        style.right = '12px';
        break;
      case 'center':
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
        break;
      case 'bottom-left':
        style.bottom = '12px';
        style.left = '12px';
        break;
      case 'bottom-center':
        style.bottom = '12px';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        break;
      case 'bottom-right':
        style.bottom = '12px';
        style.right = '12px';
        break;
    }

    return style;
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <svg className="header-icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/>
          </svg>
          <h1>Watermark Tool</h1>
        </div>
      </header>

      {/* Main Layout */}
      <main className="app-main">
        {/* Left / Top Section: Upload Area & Workspace */}
        <section className="workspace-section">
          {/* File Upload Drop Zone */}
          <div
            className="upload-card"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
            <label htmlFor="image-upload" className="upload-label">
              <svg className="upload-icon" viewBox="0 0 24 24" width="32" height="32">
                <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
              </svg>
              <div>
                <strong>Choose images</strong> or drag & drop here
              </div>
              <span className="upload-hint">Supports PNG, JPG, WEBP (Multiple images allowed)</span>
            </label>
          </div>

          {/* Image Workspace Preview */}
          <div className="preview-card">
            <div className="preview-header">
              <h2>Main Workspace</h2>
              {selectedImage && (
                <span className="selected-filename">{selectedImage.name}</span>
              )}
            </div>

            <div className="preview-viewport">
              {selectedImage ? (
                <div className="image-container">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    className="base-image"
                  />

                  {/* Watermark Overlay Preview */}
                  {activeTab === 'text' && textConfig.text && (
                    <div
                      className="watermark-overlay text-overlay"
                      style={{
                        ...getWatermarkPositionStyle(textConfig.position),
                        opacity: textConfig.opacity / 100,
                        transform: `${getWatermarkPositionStyle(textConfig.position).transform || ''} rotate(${textConfig.rotation}deg)`.trim(),
                        fontSize: `${textConfig.fontSize}px`,
                        color: textConfig.color,
                      }}
                    >
                      {textConfig.text}
                    </div>
                  )}

                  {activeTab === 'image' && (
                    imageConfig.imageUrl ? (
                      <div
                        className="watermark-overlay image-overlay"
                        style={{
                          ...getWatermarkPositionStyle(imageConfig.position),
                          opacity: imageConfig.opacity / 100,
                          transform: `${getWatermarkPositionStyle(imageConfig.position).transform || ''} rotate(${imageConfig.rotation}deg)`.trim(),
                          width: `${imageConfig.size}%`,
                        }}
                      >
                        <img
                          src={imageConfig.imageUrl}
                          alt="Watermark"
                          className="watermark-img"
                        />
                      </div>
                    ) : (
                      <div
                        className="watermark-overlay placeholder-overlay"
                        style={{
                          ...getWatermarkPositionStyle(imageConfig.position),
                          opacity: imageConfig.opacity / 100,
                          transform: `${getWatermarkPositionStyle(imageConfig.position).transform || ''} rotate(${imageConfig.rotation}deg)`.trim(),
                        }}
                      >
                        <span className="placeholder-badge">PNG Watermark Placeholder</span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="empty-workspace">
                  <p>No image selected. Please upload or select an image.</p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails Gallery */}
          {images.length > 0 && (
            <div className="gallery-card">
              <div className="gallery-header">
                <h3>Uploaded Images ({images.length})</h3>
              </div>
              <div className="thumbnail-list">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`thumbnail-item ${selectedImageId === img.id ? 'active' : ''}`}
                    onClick={() => setSelectedImageId(img.id)}
                  >
                    <img src={img.url} alt={img.name} className="thumbnail-img" />
                    <button
                      className="remove-thumb-btn"
                      onClick={(e) => removeImage(img.id, e)}
                      title="Remove image"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right / Side Panel: Settings Panel */}
        <section className="settings-section">
          <div className="settings-card">
            {/* Tabs Header */}
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                Text Watermark
              </button>
              <button
                className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
                onClick={() => setActiveTab('image')}
              >
                Image Watermark
              </button>
            </div>

            {/* Tab Contents */}
            <div className="tab-content">
              {activeTab === 'text' ? (
                <div className="settings-group">
                  {/* Text Input */}
                  <div className="control-item">
                    <label htmlFor="text-input">Watermark Text</label>
                    <input
                      id="text-input"
                      type="text"
                      className="text-input"
                      value={textConfig.text}
                      onChange={(e) =>
                        setTextConfig((prev) => ({ ...prev, text: e.target.value }))
                      }
                      placeholder="Enter watermark text"
                    />
                  </div>

                  {/* Font Size */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="font-size-slider">Font Size</label>
                      <span className="control-value">{textConfig.fontSize}px</span>
                    </div>
                    <input
                      id="font-size-slider"
                      type="range"
                      min="12"
                      max="80"
                      value={textConfig.fontSize}
                      onChange={(e) =>
                        setTextConfig((prev) => ({
                          ...prev,
                          fontSize: Number(e.target.value),
                        }))
                      }
                      className="range-slider"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="text-opacity-slider">Opacity</label>
                      <span className="control-value">{textConfig.opacity}%</span>
                    </div>
                    <input
                      id="text-opacity-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={textConfig.opacity}
                      onChange={(e) =>
                        setTextConfig((prev) => ({
                          ...prev,
                          opacity: Number(e.target.value),
                        }))
                      }
                      className="range-slider"
                    />
                  </div>

                  {/* Rotation */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="text-rotation-slider">Rotation</label>
                      <span className="control-value">{textConfig.rotation}°</span>
                    </div>
                    <input
                      id="text-rotation-slider"
                      type="range"
                      min="-180"
                      max="180"
                      value={textConfig.rotation}
                      onChange={(e) =>
                        setTextConfig((prev) => ({
                          ...prev,
                          rotation: Number(e.target.value),
                        }))
                      }
                      className="range-slider"
                    />
                  </div>

                  {/* Position selector */}
                  <div className="control-item">
                    <label>Position</label>
                    <div className="position-grid">
                      {POSITION_OPTIONS.map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          className={`position-btn ${
                            textConfig.position === pos.id ? 'selected' : ''
                          }`}
                          onClick={() =>
                            setTextConfig((prev) => ({ ...prev, position: pos.id }))
                          }
                          title={pos.label}
                        >
                          <span className={`pos-dot pos-${pos.id}`}></span>
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="settings-group">
                  {/* PNG Watermark Upload */}
                  <div className="control-item">
                    <label htmlFor="watermark-png-upload">PNG Watermark Image</label>
                    <div className="png-upload-box">
                      <input
                        id="watermark-png-upload"
                        type="file"
                        accept="image/png,image/*"
                        onChange={handleWatermarkImageUpload}
                        className="file-input"
                      />
                      <label htmlFor="watermark-png-upload" className="png-upload-button">
                        {imageConfig.imageName ? 'Change PNG Watermark' : 'Upload PNG Watermark'}
                      </label>
                      {imageConfig.imageName && (
                        <span className="watermark-filename">{imageConfig.imageName}</span>
                      )}
                    </div>
                  </div>

                  {/* Size */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="image-size-slider">Size</label>
                      <span className="control-value">{imageConfig.size}%</span>
                    </div>
                    <input
                      id="image-size-slider"
                      type="range"
                      min="5"
                      max="80"
                      value={imageConfig.size}
                      onChange={(e) =>
                        setImageConfig((prev) => ({
                          ...prev,
                          size: Number(e.target.value),
                        }))
                      }
                      className="range-slider"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="image-opacity-slider">Opacity</label>
                      <span className="control-value">{imageConfig.opacity}%</span>
                    </div>
                    <input
                      id="image-opacity-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={imageConfig.opacity}
                      onChange={(e) =>
                        setImageConfig((prev) => ({
                          ...prev,
                          opacity: Number(e.target.value),
                        }))
                      }
                      className="range-slider"
                    />
                  </div>

                  {/* Rotation */}
                  <div className="control-item">
                    <div className="control-label-row">
                      <label htmlFor="image-rotation-slider">Rotation</label>
                      <span className="control-value">{imageConfig.rotation}°</span>
                    </div>
                    <input
                      id="image-rotation-slider"
                      type="range"
                      min="-180"
                      max="180"
                      value={imageConfig.rotation}
                      onChange={(e) =>
                        setImageConfig((prev) => ({
                          ...prev,
                          rotation: Number(e.target.value),
                        }))
                      }
                      className="range-slider"
                    />
                  </div>

                  {/* Position selector */}
                  <div className="control-item">
                    <label>Position</label>
                    <div className="position-grid">
                      {POSITION_OPTIONS.map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          className={`position-btn ${
                            imageConfig.position === pos.id ? 'selected' : ''
                          }`}
                          onClick={() =>
                            setImageConfig((prev) => ({ ...prev, position: pos.id }))
                          }
                          title={pos.label}
                        >
                          <span className={`pos-dot pos-${pos.id}`}></span>
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-group">
              <button
                type="button"
                className="action-btn secondary-btn"
                onClick={handleApplyToAll}
              >
                Apply to All
              </button>
              <button
                type="button"
                className="action-btn primary-btn"
                onClick={handleDownload}
              >
                Download
              </button>
              <button
                type="button"
                className="action-btn outline-btn"
                onClick={handleDownloadZip}
              >
                Download ZIP
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
