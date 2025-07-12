// components/preview/FilePreviewModal.jsx - Clean version with react-quick-pinch-zoom
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, RotateCcw,
  FileText, Image as ImageIcon, Video, Music, File,
  AlertCircle, Loader2, Maximize, RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// Import the pinch-zoom library (default export)
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';

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

// Enhanced Image Preview with react-quick-pinch-zoom
const ImagePreview = ({ url, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [rotation, setRotation] = useState(0);

  const imageRef = useRef(null);

  const handleImageLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  // Handle updates from the library
  const handleUpdate = useCallback(({ x, y, scale }) => {
    const { current: img } = imageRef;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty("transform", `${value} rotate(${rotation}deg)`);
      setTransform({ x, y, scale });
    }
  }, [rotation]);

  // Manual zoom controls (simulate touch events)
  const zoomIn = useCallback(() => {
    const newScale = Math.min(transform.scale * 1.5, 5);
    const value = make3dTransformValue({
      x: transform.x,
      y: transform.y,
      scale: newScale
    });
    if (imageRef.current) {
      imageRef.current.style.setProperty("transform", `${value} rotate(${rotation}deg)`);
      setTransform(prev => ({ ...prev, scale: newScale }));
    }
  }, [transform, rotation]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(transform.scale / 1.5, 0.5);
    const value = make3dTransformValue({
      x: transform.x,
      y: transform.y,
      scale: newScale
    });
    if (imageRef.current) {
      imageRef.current.style.setProperty("transform", `${value} rotate(${rotation}deg)`);
      setTransform(prev => ({ ...prev, scale: newScale }));
    }
  }, [transform, rotation]);

  const resetZoom = useCallback(() => {
    const value = make3dTransformValue({ x: 0, y: 0, scale: 1 });
    if (imageRef.current) {
      imageRef.current.style.setProperty("transform", `${value} rotate(0deg)`);
      setTransform({ x: 0, y: 0, scale: 1 });
      setRotation(0);
    }
  }, []);

  const fitToScreen = useCallback(() => {
    // Reset to scale 1 (library will auto-fit)
    const value = make3dTransformValue({ x: 0, y: 0, scale: 1 });
    if (imageRef.current) {
      imageRef.current.style.setProperty("transform", `${value} rotate(${rotation}deg)`);
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [rotation]);

  const rotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    const value = make3dTransformValue(transform);
    if (imageRef.current) {
      imageRef.current.style.setProperty("transform", `${value} rotate(${newRotation}deg)`);
      setRotation(newRotation);
    }
  }, [transform, rotation]);

  const zoomPercentage = Math.round(transform.scale * 100);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Controls */}
      <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={transform.scale <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Badge variant="outline" className="min-w-[70px] font-mono text-center">
            {zoomPercentage}%
          </Badge>

          <Button variant="outline" size="sm" onClick={zoomIn} disabled={transform.scale >= 5}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button variant="outline" size="sm" onClick={fitToScreen}>
            <Maximize className="w-4 h-4 mr-1" />
            Fit
          </Button>

          <Button variant="outline" size="sm" onClick={resetZoom}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Pinch to zoom • Drag to pan
          </div>
        </div>
      </div>

      {/* Image Container with QuickPinchZoom */}
      <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-gray-900">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Loading image...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-3 text-muted-foreground">
              <AlertCircle className="w-12 h-12" />
              <span>Failed to load image</span>
            </div>
          </div>
        )}

        <QuickPinchZoom
          onUpdate={handleUpdate}
          tapZoomFactor={2}
          doubleTapZoomOutOnMaxScale={true}
          doubleTapToggleZoom={true}
          minZoom={0.5}
          maxZoom={5}
          centerContained={true}
          wheelScaleFactor={1500}
          style={{
            width: '100%',
            height: '100%',
            display: loading || error ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            ref={imageRef}
            src={url}
            alt={fileName}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none'
            }}
            draggable={false}
          />
        </QuickPinchZoom>
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