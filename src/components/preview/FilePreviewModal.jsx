// components/preview/FilePreviewModal.jsx - Complete Enhanced Version
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, RotateCcw,
  FileText, Image as ImageIcon, Video, Music, File,
  AlertCircle, Loader2, Hand, Move
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// File type detection
const getFileCategory = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const categories = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'],
    video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'],
    pdf: ['pdf'],
    document: ['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'],
    spreadsheet: ['xls', 'xlsx', 'csv', 'ods', 'numbers'],
    presentation: ['ppt', 'pptx', 'odp', 'key'],
    code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'swift', 'json', 'xml', 'yml', 'yaml'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) return category;
  }
  return 'other';
};

// Enhanced Image Preview Component with Pan & Zoom
const ImagePreview = ({ url, fileName }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Calculate fit-to-container zoom
  const calculateFitZoom = useCallback((imgWidth, imgHeight, containerWidth, containerHeight) => {
    if (!imgWidth || !imgHeight || !containerWidth || !containerHeight) return 1;

    const padding = 80;
    const scaleX = (containerWidth - padding) / imgWidth;
    const scaleY = (containerHeight - padding) / imgHeight;
    return Math.min(scaleX, scaleY, 1);
  }, []);

  // Update container dimensions on resize
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Reset pan when zoom changes or image loads
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [zoom, rotation, imageDimensions]);

  const handleImageLoad = useCallback((e) => {
    const img = e.target;
    const container = containerRef.current;

    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setContainerDimensions({ width: containerRect.width, height: containerRect.height });

    // Calculate and set fit zoom
    const fitZoom = calculateFitZoom(
      img.naturalWidth,
      img.naturalHeight,
      containerRect.width,
      containerRect.height
    );
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
    setLoading(false);
  }, [calculateFitZoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.1));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleRotateCounter = () => setRotation(prev => (prev - 90 + 360) % 360);

  const handleFitToContainer = () => {
    const fitZoom = calculateFitZoom(
      imageDimensions.width,
      imageDimensions.height,
      containerDimensions.width,
      containerDimensions.height
    );
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleActualSize = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleFillContainer = () => {
    if (!imageDimensions.width || !imageDimensions.height || !containerDimensions.width || !containerDimensions.height) return;

    const padding = 80;
    const scaleX = (containerDimensions.width - padding) / imageDimensions.width;
    const scaleY = (containerDimensions.height - padding) / imageDimensions.height;
    const fillZoom = Math.max(scaleX, scaleY);

    setZoom(fillZoom);
    setPan({ x: 0, y: 0 });
  };

  // Mouse event handlers for panning
  const handleMouseDown = (e) => {
    if (zoom <= 1.1) return;

    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1.1) return;

    e.preventDefault();
    const newPan = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    // Constrain panning
    const scaledWidth = imageDimensions.width * zoom;
    const scaledHeight = imageDimensions.height * zoom;
    const maxPanX = Math.max(0, (scaledWidth - containerDimensions.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerDimensions.height) / 2);

    newPan.x = Math.max(-maxPanX, Math.min(maxPanX, newPan.x));
    newPan.y = Math.max(-maxPanY, Math.min(maxPanY, newPan.y));

    setPan(newPan);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch events for mobile
  const handleTouchStart = (e) => {
    if (zoom <= 1.1 || e.touches.length !== 1) return;

    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - pan.x,
      y: touch.clientY - pan.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoom <= 1.1 || e.touches.length !== 1) return;

    e.preventDefault();
    const touch = e.touches[0];
    const newPan = {
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    };

    const scaledWidth = imageDimensions.width * zoom;
    const scaledHeight = imageDimensions.height * zoom;
    const maxPanX = Math.max(0, (scaledWidth - containerDimensions.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerDimensions.height) / 2);

    newPan.x = Math.max(-maxPanX, Math.min(maxPanX, newPan.x));
    newPan.y = Math.max(-maxPanY, Math.min(maxPanY, newPan.y));

    setPan(newPan);
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isDragging, dragStart, pan, zoom, imageDimensions, containerDimensions]);

  const canPan = zoom > 1.1;
  const cursorStyle = canPan ? (isDragging ? 'grabbing' : 'grab') : 'default';

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Enhanced Image Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-mono min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button variant="outline" size="sm" onClick={handleRotateCounter}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button variant="outline" size="sm" onClick={handleFitToContainer}>
            Fit
          </Button>
          <Button variant="outline" size="sm" onClick={handleFillContainer}>
            Fill
          </Button>
          <Button variant="outline" size="sm" onClick={handleActualSize}>
            100%
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {canPan && (
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Hand className="w-4 h-4" />
              <span>Drag to pan</span>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {imageDimensions.width} × {imageDimensions.height}
          </div>
        </div>
      </div>

      {/* Full-Size Image Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative"
        style={{ cursor: cursorStyle }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Loading image...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-2 text-muted-foreground">
              <AlertCircle className="w-12 h-12" />
              <span>Failed to load image</span>
            </div>
          </div>
        )}

        <img
          ref={imageRef}
          src={url}
          alt={fileName}
          className="max-w-none select-none transition-transform duration-200"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            display: loading || error ? 'none' : 'block',
            transformOrigin: 'center center'
          }}
          onLoad={handleImageLoad}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          draggable={false}
        />

        {/* Pan indicator */}
        {canPan && !loading && !error && (
          <div className="absolute bottom-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {isDragging ? 'Panning...' : 'Scroll wheel to zoom • Drag to pan'}
          </div>
        )}

        {/* Zoom indicator */}
        {zoom !== 1 && !loading && !error && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};

// Code Preview Component
const CodePreview = ({ url, fileName }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading file...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <AlertCircle className="w-12 h-12" />
          <span>Failed to load file: {error}</span>
        </div>
      </div>
    );
  }

  const getLanguage = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', php: 'php',
      rb: 'ruby', go: 'go', rs: 'rust', swift: 'swift',
      html: 'html', css: 'css', scss: 'scss', sass: 'sass',
      json: 'json', xml: 'xml', yml: 'yaml', yaml: 'yaml',
      md: 'markdown', sql: 'sql', sh: 'bash'
    };
    return langMap[ext] || 'text';
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{getLanguage(fileName)}</Badge>
          <span className="text-sm text-muted-foreground">
            {content.split('\n').length} lines
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 h-full overflow-auto">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};

// PDF Preview Component
const PDFPreview = ({ url, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <Badge variant="outline">PDF Document</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(url, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in New Tab
        </Button>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 text-muted-foreground">
              <AlertCircle className="w-12 h-12" />
              <span>Failed to load PDF</span>
              <Button variant="outline" onClick={() => window.open(url, '_blank')}>
                Open in New Tab
              </Button>
            </div>
          </div>
        )}

        <iframe
          src={url}
          className="w-full h-full border-0"
          title={fileName}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      </div>
    </div>
  );
};

// Video Preview Component
const VideoPreview = ({ url, fileName }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <Badge variant="outline">Video</Badge>
      </div>

      <div className="flex-1 flex items-center justify-center bg-black p-4">
        <video
          src={url}
          controls
          className="max-w-full max-h-full"
          preload="metadata"
        >
          Your browser does not support video playback.
        </video>
      </div>
    </div>
  );
};

// Audio Preview Component
const AudioPreview = ({ url, fileName }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <Badge variant="outline">Audio</Badge>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <Music className="w-24 h-24 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-medium">{fileName}</h3>
          <audio src={url} controls className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    </div>
  );
};

// Text/Document Preview Component
const TextPreview = ({ url, fileName }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading document...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <AlertCircle className="w-12 h-12" />
          <span>Failed to load document: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <Badge variant="outline">Text Document</Badge>
        <span className="text-sm text-muted-foreground">
          {content.split('\n').length} lines, {content.length} characters
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Unsupported File Component
const UnsupportedPreview = ({ fileName, fileSize, onDownload }) => {
  const category = getFileCategory(fileName);

  const getIcon = () => {
    switch (category) {
      case 'archive': return <File className="w-16 h-16 text-orange-500" />;
      case 'spreadsheet': return <FileText className="w-16 h-16 text-green-500" />;
      case 'presentation': return <FileText className="w-16 h-16 text-blue-500" />;
      default: return <File className="w-16 h-16 text-gray-500" />;
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        {getIcon()}
        <div>
          <h3 className="text-lg font-medium mb-2">{fileName}</h3>
          <p className="text-muted-foreground mb-4">
            {formatSize(fileSize)} • {category} file
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Preview not available for this file type
          </p>
          <Button onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main File Preview Modal
const FilePreviewModal = ({
  isOpen,
  onClose,
  file,
  s3Service
}) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && file && s3Service) {
      generatePreviewUrl();
    }
  }, [isOpen, file, s3Service]);

  const generatePreviewUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = s3Service.getDownloadUrl(file.fullPath);
      setPreviewUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [file, s3Service]);

  const handleDownload = useCallback(() => {
    if (previewUrl) {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [previewUrl, file]);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>Loading preview...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-2 text-muted-foreground">
            <AlertCircle className="w-12 h-12" />
            <span>Failed to load preview: {error}</span>
          </div>
        </div>
      );
    }

    const category = getFileCategory(file.name);

    switch (category) {
      case 'image':
        return <ImagePreview url={previewUrl} fileName={file.name} />;
      case 'code':
        return <CodePreview url={previewUrl} fileName={file.name} />;
      case 'pdf':
        return <PDFPreview url={previewUrl} fileName={file.name} />;
      case 'video':
        return <VideoPreview url={previewUrl} fileName={file.name} />;
      case 'audio':
        return <AudioPreview url={previewUrl} fileName={file.name} />;
      case 'document':
        return <TextPreview url={previewUrl} fileName={file.name} />;
      default:
        return (
          <UnsupportedPreview
            fileName={file.name}
            fileSize={file.size}
            onDownload={handleDownload}
          />
        );
    }
  };

  if (!file) return null;

  const category = getFileCategory(file.name);
  const canPreview = ['image', 'code', 'pdf', 'video', 'audio', 'document'].includes(category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] flex flex-col p-0">
        {/* Clean header without duplicate X button */}
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold truncate">
                {file.name}
              </DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{category}</Badge>
                <span className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {canPreview && (
                  <Badge variant="secondary">Preview Available</Badge>
                )}
              </div>
            </div>

            {/* Single download button */}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;