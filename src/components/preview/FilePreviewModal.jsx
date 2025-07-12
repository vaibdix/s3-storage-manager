// components/preview/FilePreviewModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, RotateCcw,
  FileText, Image as ImageIcon, Video, Music, File,
  AlertCircle, Loader2, Maximize, RefreshCw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { shikiService } from '../../services/ShikiService';
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
  const handleUpdate = useCallback(({ x, y, scale }) => {
    const { current: img } = imageRef;
    if (img) {
      const value = make3dTransformValue({ x, y, scale });
      img.style.setProperty("transform", `${value} rotate(${rotation}deg)`);
      setTransform({ x, y, scale });
    }
  }, [rotation]);
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b"
        style={{ flexShrink: 0 }}
      >
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

        <div className="text-sm text-muted-foreground">
          Pinch to zoom • Drag to pan
        </div>
      </div>

      {/* Image Container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
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

const CodePreview = ({ url, fileName }) => {
  const [content, setContent] = useState('');
  const [highlightedCode, setHighlightedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('github-dark');
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState('');
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
        const detectedLang = shikiService.getLanguageFromFileName(fileName);
        setLanguage(detectedLang);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchContent();
  }, [url, fileName]);

  useEffect(() => {
    if (!content) return;
    const highlightCode = async () => {
      try {
        setLoading(true);
        setError(null);
        let result;
        try {
          result = await shikiService.highlightCodeShorthand(content, fileName, theme);
        } catch (shorthandError) {
          result = await shikiService.highlightCode(content, fileName, theme);
        }
        if (result.success) {
          setHighlightedCode(result.html);
        } else {
          const escapedContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          setHighlightedCode(`<pre style="margin: 0; padding: 1rem; background: #1e1e1e; color: #d4d4d4; font-family: monospace; white-space: pre; overflow: visible;"><code>${escapedContent}</code></pre>`);
        }
        setLoading(false);
      } catch (err) {
        console.error('Code highlighting failed:', err);
        const escapedContent = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        setHighlightedCode(`<pre style="margin: 0; padding: 1rem; background: #1e1e1e; color: #d4d4d4; font-family: monospace; white-space: pre; overflow: visible;"><code>${escapedContent}</code></pre>`);
        setError('Syntax highlighting unavailable');
        setLoading(false);
      }
    };

    highlightCode();
  }, [content, fileName, theme]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading code...</span>
        </div>
      </div>
    );
  }

  if (error && !highlightedCode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <AlertCircle className="w-12 h-12" />
          <span>Failed to load file: {error}</span>
        </div>
      </div>
    );
  }

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between p-4 border-b bg-muted/20"
        style={{ flexShrink: 0 }}
      >
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="font-mono">
            {language.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {lineCount.toLocaleString()} lines • {charCount.toLocaleString()} chars
          </span>
          {error && (
            <Badge variant="destructive" className="text-xs">
              ⚠️ Fallback mode
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="px-3 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          >
            {shikiService.getAvailableThemes().map(themeOption => (
              <option key={themeOption.value} value={themeOption.value}>
                {themeOption.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className={copied ? 'text-green-600' : ''}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </Button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          backgroundColor: '#1e1e1e',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace'
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
};

const PDFPreview = ({ url, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between p-4 border-b bg-muted/20"
        style={{ flexShrink: 0 }}
      >
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

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
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
          style={{ width: '100%', height: '100%', border: 'none' }}
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between p-4 border-b bg-muted/20"
        style={{ flexShrink: 0 }}
      >
        <Badge variant="outline">Video</Badge>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black', padding: '1rem', minHeight: 0 }}>
        <video
          src={url}
          controls
          style={{ maxWidth: '100%', maxHeight: '100%' }}
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between p-4 border-b bg-muted/20"
        style={{ flexShrink: 0 }}
      >
        <Badge variant="outline">Audio</Badge>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: 0 }}>
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="flex items-center justify-between p-4 border-b bg-muted/20"
        style={{ flexShrink: 0 }}
      >
        <Badge variant="outline">Text Document</Badge>
        <span className="text-sm text-muted-foreground">
          {content.split('\n').length} lines, {content.length} characters
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1rem', minHeight: 0 }}>
        <div className="max-w-4xl mx-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .modal-code-container .shiki {
            overflow-x: auto !important;
            overflow-y: visible !important;
            max-width: 100% !important;
            white-space: pre !important;
            margin: 0 !important;
            min-width: 0 !important;
            word-wrap: normal !important;
            word-break: normal !important;
            box-sizing: border-box !important;
          }

          .modal-code-container .shiki:focus {
            outline: 2px solid #0066cc;
            outline-offset: 2px;
          }

          [data-radix-dialog-content] {
            max-height: 85vh !important;
            height: 85vh !important;
            overflow: hidden !important;
          }
        `
      }} />

      <Dialog open={isOpen} onOpenChange={onClose}>
        {/* CRITICAL: Force explicit height and overflow */}
        <DialogContent
          className="max-w-7xl w-[95vw] flex flex-col p-0"
          style={{
            height: '85vh',
            maxHeight: '85vh',
            overflow: 'hidden'
          }}
        >
          <DialogHeader
            className="p-6 pb-4 border-b"
            style={{ flexShrink: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
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
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              height: 'calc(85vh - 120px)' // Force exact height
            }}
          >
            {renderPreview()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FilePreviewModal;