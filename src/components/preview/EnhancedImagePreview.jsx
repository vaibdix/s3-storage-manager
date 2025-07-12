// components/preview/EnhancedImagePreview.jsx - Custom Pinch-Zoom Implementation
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize, Minimize,
  Move, Hand, MousePointer, RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const EnhancedImagePreview = ({ url, fileName }) => {
  const [imageState, setImageState] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0
  });

  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactionMode, setInteractionMode] = useState('pan'); // 'pan' or 'zoom'

  // Refs
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const lastTouchRef = useRef(null);
  const lastDistanceRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);

  // Constants
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;
  const ZOOM_SENSITIVITY = 0.001;
  const TOUCH_ZOOM_SENSITIVITY = 0.01;

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

  // Calculate fit-to-container scale
  const calculateFitScale = useCallback((imgWidth, imgHeight, containerWidth, containerHeight) => {
    if (!imgWidth || !imgHeight || !containerWidth || !containerHeight) return 1;

    const padding = 40;
    const scaleX = (containerWidth - padding) / imgWidth;
    const scaleY = (containerHeight - padding) / imgHeight;
    return Math.min(scaleX, scaleY, 1);
  }, []);

  // Constrain translation based on current scale
  const constrainTranslation = useCallback((translateX, translateY, scale) => {
    if (scale <= 1) return { x: 0, y: 0 };

    const scaledWidth = imageDimensions.width * scale;
    const scaledHeight = imageDimensions.height * scale;
    const maxX = Math.max(0, (scaledWidth - containerDimensions.width) / 2);
    const maxY = Math.max(0, (scaledHeight - containerDimensions.height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, translateX)),
      y: Math.max(-maxY, Math.min(maxY, translateY))
    };
  }, [imageDimensions, containerDimensions]);

  // Update image state with constraints
  const updateImageState = useCallback((updates) => {
    setImageState(prevState => {
      const newState = { ...prevState, ...updates };

      // Constrain scale
      newState.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newState.scale));

      // Constrain translation
      const constrainedTranslation = constrainTranslation(
        newState.translateX,
        newState.translateY,
        newState.scale
      );
      newState.translateX = constrainedTranslation.x;
      newState.translateY = constrainedTranslation.y;

      return newState;
    });
  }, [constrainTranslation]);

  // Handle image load
  const handleImageLoad = useCallback((e) => {
    const img = e.target;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    setImageDimensions({ width: naturalWidth, height: naturalHeight });

    if (containerDimensions.width && containerDimensions.height) {
      const fitScale = calculateFitScale(
        naturalWidth,
        naturalHeight,
        containerDimensions.width,
        containerDimensions.height
      );

      setImageState({
        scale: fitScale,
        translateX: 0,
        translateY: 0,
        rotation: 0
      });
    }

    setLoading(false);
  }, [containerDimensions, calculateFitScale]);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    updateImageState({ scale: imageState.scale * 1.5 });
  }, [imageState.scale, updateImageState]);

  const handleZoomOut = useCallback(() => {
    updateImageState({ scale: imageState.scale / 1.5 });
  }, [imageState.scale, updateImageState]);

  const handleFitToScreen = useCallback(() => {
    const fitScale = calculateFitScale(
      imageDimensions.width,
      imageDimensions.height,
      containerDimensions.width,
      containerDimensions.height
    );

    setImageState({
      scale: fitScale,
      translateX: 0,
      translateY: 0,
      rotation: imageState.rotation
    });
  }, [imageDimensions, containerDimensions, imageState.rotation, calculateFitScale]);

  const handleActualSize = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      scale: 1,
      translateX: 0,
      translateY: 0
    }));
  }, []);

  const handleRotate = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  const handleRotateCounter = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360
    }));
  }, []);

  const handleReset = useCallback(() => {
    handleFitToScreen();
    setImageState(prev => ({ ...prev, rotation: 0 }));
  }, [handleFitToScreen]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (!containerRef.current) return;

    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate mouse position relative to image center
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, imageState.scale * (1 + delta)));
    const scaleFactor = newScale / imageState.scale;

    // Zoom towards mouse position
    const newTranslateX = imageState.translateX - mouseX * (scaleFactor - 1);
    const newTranslateY = imageState.translateY - mouseY * (scaleFactor - 1);

    updateImageState({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    });
  }, [imageState, updateImageState]);

  // Mouse events for panning
  const handleMouseDown = useCallback((e) => {
    if (imageState.scale <= 1.1) return;

    e.preventDefault();
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setIsInteracting(true);
    document.body.style.cursor = 'grabbing';
  }, [imageState.scale]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;

    e.preventDefault();

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    updateImageState({
      translateX: imageState.translateX + deltaX,
      translateY: imageState.translateY + deltaY
    });

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, [imageState.translateX, imageState.translateY, updateImageState]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsInteracting(false);
    document.body.style.cursor = '';
  }, []);

  // Touch events for pinch-zoom and pan
  const getTouchDistance = useCallback((touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchCenter = useCallback((touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }, []);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      // Single touch - start panning
      if (imageState.scale > 1.1) {
        isDraggingRef.current = true;
        lastMousePosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        setIsInteracting(true);
      }
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      isDraggingRef.current = false;
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);

      lastDistanceRef.current = distance;
      lastTouchRef.current = center;
      setIsInteracting(true);
    }
  }, [imageState.scale, getTouchDistance, getTouchCenter]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDraggingRef.current) {
      // Single touch panning
      const deltaX = e.touches[0].clientX - lastMousePosRef.current.x;
      const deltaY = e.touches[0].clientY - lastMousePosRef.current.y;

      updateImageState({
        translateX: imageState.translateX + deltaX,
        translateY: imageState.translateY + deltaY
      });

      lastMousePosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);

      if (lastDistanceRef.current && lastTouchRef.current) {
        const scaleFactor = distance / lastDistanceRef.current;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, imageState.scale * scaleFactor));

        // Calculate translation to zoom towards touch center
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const touchX = center.x - rect.left - centerX;
        const touchY = center.y - rect.top - centerY;

        const scaleChange = newScale / imageState.scale;
        const newTranslateX = imageState.translateX - touchX * (scaleChange - 1);
        const newTranslateY = imageState.translateY - touchY * (scaleChange - 1);

        updateImageState({
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY
        });

        lastDistanceRef.current = distance;
        lastTouchRef.current = center;
      }
    }
  }, [imageState, updateImageState, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    lastDistanceRef.current = null;
    lastTouchRef.current = null;
    setIsInteracting(false);
  }, []);

  // Event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('touchstart', handleTouchStart);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const canPan = imageState.scale > 1.1;
  const zoomPercentage = Math.round(imageState.scale * 100);

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={imageState.scale <= MIN_SCALE}>
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Badge variant="outline" className="min-w-[70px] font-mono text-center">
            {zoomPercentage}%
          </Badge>

          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={imageState.scale >= MAX_SCALE}>
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

          <Button variant="outline" size="sm" onClick={handleFitToScreen}>
            <Maximize className="w-4 h-4 mr-1" />
            Fit
          </Button>
          <Button variant="outline" size="sm" onClick={handleActualSize}>
            <Minimize className="w-4 h-4 mr-1" />
            100%
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {canPan && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {isInteracting ? (
                <>
                  <Move className="w-4 h-4" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <Hand className="w-4 h-4" />
                  <span>Drag to pan • Wheel/Pinch to zoom</span>
                </>
              )}
            </div>
          )}

          {!canPan && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MousePointer className="w-4 h-4" />
              <span>Wheel/Pinch to zoom</span>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {imageDimensions.width} × {imageDimensions.height}
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden flex items-center justify-center relative select-none ${
          canPan
            ? isInteracting
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-zoom-in'
        }`}
        style={{ touchAction: 'none' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-3 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading image...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-3 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <span>Failed to load image</span>
            </div>
          </div>
        )}

        <img
          ref={imageRef}
          src={url}
          alt={fileName}
          className={`max-w-none transition-transform origin-center ${
            isInteracting ? 'transition-none' : 'duration-200 ease-out'
          }`}
          style={{
            transform: `translate(${imageState.translateX}px, ${imageState.translateY}px) scale(${imageState.scale}) rotate(${imageState.rotation}deg)`,
            display: loading || error ? 'none' : 'block',
            willChange: isInteracting ? 'transform' : 'auto'
          }}
          onLoad={handleImageLoad}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          draggable={false}
        />

        {/* Zoom indicator overlay */}
        {(isInteracting && imageState.scale !== 1) && (
          <div className="absolute top-4 right-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm font-mono">
            {zoomPercentage}%
          </div>
        )}

        {/* Pan indicator overlay */}
        {(isInteracting && canPan) && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
            {isDraggingRef.current ? 'Panning...' : 'Pinch to zoom • Drag to pan'}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedImagePreview;