import { useState, useCallback, useRef } from 'react';

export const useFileUpload = (s3Service, currentPath, onUploadComplete) => {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStats, setUploadStats] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const uploadRefs = useRef(new Map());

  const updateUploadProgress = useCallback((fileName, progress, bytesLoaded, file) => {
    setUploadProgress(prev => ({ ...prev, [fileName]: progress }));

    const now = Date.now();
    const uploadRef = uploadRefs.current.get(fileName);

    if (uploadRef) {
      const { startTime, lastUpdateTime, lastBytesLoaded } = uploadRef;
      const timeDiff = (now - lastUpdateTime) / 1000;
      const bytesDiff = bytesLoaded - lastBytesLoaded;

      if (timeDiff >= 0.5) {
        const instantSpeed = bytesDiff / timeDiff;
        const totalTime = (now - startTime) / 1000;
        const avgSpeed = bytesLoaded / totalTime;
        const remaining = avgSpeed > 0 ? (file.size - bytesLoaded) / avgSpeed : 0;

        const smoothingFactor = 0.3;
        const smoothedSpeed = uploadRef.smoothedSpeed
          ? (smoothingFactor * instantSpeed) + ((1 - smoothingFactor) * uploadRef.smoothedSpeed)
          : instantSpeed;

        setUploadStats(prev => ({
          ...prev,
          [fileName]: {
            ...prev[fileName],
            instantSpeed: instantSpeed,
            avgSpeed: avgSpeed,
            smoothedSpeed: smoothedSpeed,
            timeRemaining: remaining,
            uploaded: bytesLoaded,
            size: file.size,
            percentage: progress
          }
        }));

        uploadRef.lastUpdateTime = now;
        uploadRef.lastBytesLoaded = bytesLoaded;
        uploadRef.smoothedSpeed = smoothedSpeed;
      }
    }
  }, []);

  const initializeUpload = useCallback((fileName, file) => {
    const now = Date.now();

    uploadRefs.current.set(fileName, {
      startTime: now,
      lastUpdateTime: now,
      lastBytesLoaded: 0,
      smoothedSpeed: 0
    });

    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
    setUploadStats(prev => ({
      ...prev,
      [fileName]: {
        instantSpeed: 0,
        avgSpeed: 0,
        smoothedSpeed: 0,
        timeRemaining: 0,
        uploaded: 0,
        size: file.size,
        percentage: 0,
        startTime: now
      }
    }));
  }, []);

  const cleanupUpload = useCallback((fileName) => {
    uploadRefs.current.delete(fileName);
    setUploadProgress(prev => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
    setUploadStats(prev => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleFileUpload = useCallback(async (files) => {
    if (!s3Service || currentPath === undefined) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    const uploadPromises = [];

    try {
      for (const file of fileArray) {
        const fileName = file.name;
        const key = currentPath + fileName;

        initializeUpload(fileName, file);

        const uploadPromise = s3Service.uploadFile(
          file,
          key,
          (progress, bytesLoaded = 0) => {
            updateUploadProgress(fileName, progress, bytesLoaded, file);
          }
        ).then(() => {
          setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
          // Keep progress visible for 3 seconds after completion
          setTimeout(() => cleanupUpload(fileName), 3000);
        }).catch((error) => {
          console.error(`Upload failed for ${fileName}:`, error);
          setUploadStats(prev => ({
            ...prev,
            [fileName]: {
              ...prev[fileName],
              error: error.message,
              failed: true
            }
          }));
          // Don't cleanup failed uploads immediately so user can see the error
        });

        uploadPromises.push(uploadPromise);
      }

      await Promise.allSettled(uploadPromises);

      if (onUploadComplete) {
        await onUploadComplete();
      }

    } catch (error) {
      console.error('Upload process error:', error);
    } finally {
      setIsUploading(false);

      // Auto-close modal after all uploads complete (with a delay for user to see results)
      setTimeout(() => {
        const hasActiveUploads = Object.values(uploadProgress).some(progress => progress < 100);
        const hasErrors = Object.values(uploadStats).some(stats => stats.failed);

        // Only auto-close if no active uploads and no errors
        if (!hasActiveUploads && !hasErrors) {
          setShowUpload(false);
        }
      }, 2000);
    }
  }, [currentPath, s3Service, onUploadComplete, initializeUpload, updateUploadProgress, cleanupUpload, uploadProgress, uploadStats]);

  const cancelUpload = useCallback((fileName) => {
    cleanupUpload(fileName);
  }, [cleanupUpload]);

  const cancelAllUploads = useCallback(() => {
    const fileNames = Object.keys(uploadProgress);
    fileNames.forEach(fileName => cleanupUpload(fileName));
    setIsUploading(false);
  }, [uploadProgress, cleanupUpload]);

  return {
    showUpload,
    setShowUpload,
    uploadProgress,
    uploadStats,
    isUploading,
    handleFileUpload,
    cancelUpload,
    cancelAllUploads
  };
};