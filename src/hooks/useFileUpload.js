// hooks/useFileUpload.js
import { useState, useCallback, useRef, useEffect } from 'react';

export const useFileUpload = (s3Service, currentPath, onUploadComplete) => {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStats, setUploadStats] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const uploadRefs = useRef(new Map());
  const cleanupTimers = useRef(new Map());
  const activeUploads = useRef(new Set());
  const cleanup = useCallback(() => {
    cleanupTimers.current.forEach(timer => clearTimeout(timer));
    cleanupTimers.current.clear();
    uploadRefs.current.clear();
    activeUploads.current.clear();
    setUploadProgress({});
    setUploadStats({});
    setIsUploading(false);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateUploadProgress = useCallback((fileName, progress, bytesLoaded, file) => {
    if (!activeUploads.current.has(fileName)) {
      return;
    }
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
    activeUploads.current.add(fileName);
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
        startTime: now,
        failed: false,
        error: null
      }
    }));
  }, []);

  const cleanupUpload = useCallback((fileName, delay = 0) => {
    const doCleanup = () => {
      activeUploads.current.delete(fileName);
      uploadRefs.current.delete(fileName);
      setUploadProgress(prev => {
        const { [fileName]: _, ...rest } = prev;
        return rest;
      });
      setUploadStats(prev => {
        const { [fileName]: _, ...rest } = prev;
        return rest;
      });
      const existingTimer = cleanupTimers.current.get(fileName);
      if (existingTimer) {
        clearTimeout(existingTimer);
        cleanupTimers.current.delete(fileName);
      }
    };

    if (delay > 0) {
      const existingTimer = cleanupTimers.current.get(fileName);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const timer = setTimeout(doCleanup, delay);
      cleanupTimers.current.set(fileName, timer);
    } else {
      doCleanup();
    }
  }, []);

  const markUploadFailed = useCallback((fileName, error) => {
    setUploadStats(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        failed: true,
        error: error.message || 'Upload failed'
      }
    }));
  }, []);

  const handleFileUpload = useCallback(async (files) => {
    if (!s3Service || currentPath === undefined) {
      console.error('S3Service or currentPath not available');
      return;
    }
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
          cleanupUpload(fileName, 3000);
        }).catch((error) => {
          console.error(`Upload failed for ${fileName}:`, error);
          markUploadFailed(fileName, error);
          cleanupUpload(fileName, 10000);
        });

        uploadPromises.push(uploadPromise);
      }
      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      console.log(`Upload batch complete: ${successful} successful, ${failed} failed`);
      if (successful > 0 && onUploadComplete) {
        await onUploadComplete();
      }

    } catch (error) {
      console.error('Upload process error:', error);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        const hasActiveUploads = Array.from(activeUploads.current).some(fileName => {
          const progress = uploadProgress[fileName];
          const stats = uploadStats[fileName];
          return progress < 100 && !stats?.failed;
        });
        const hasErrors = Object.values(uploadStats).some(stats => stats?.failed);
        if (!hasActiveUploads && !hasErrors) {
          setShowUpload(false);
          setTimeout(cleanup, 1000);
        }
      }, 2000);
    }
  }, [
    currentPath,
    s3Service,
    onUploadComplete,
    initializeUpload,
    updateUploadProgress,
    cleanupUpload,
    markUploadFailed,
    uploadProgress,
    uploadStats,
    cleanup
  ]);

  const cancelUpload = useCallback((fileName) => {
    if (s3Service && typeof s3Service.cancelUpload === 'function') {
      const stats = uploadStats[fileName];
      if (stats?.uploadId) {
        s3Service.cancelUpload(stats.uploadId);
      }
    }
    markUploadFailed(fileName, new Error('Cancelled by user'));
    cleanupUpload(fileName, 1000);
  }, [s3Service, uploadStats, markUploadFailed, cleanupUpload]);

  const cancelAllUploads = useCallback(() => {
    const activeFileNames = Array.from(activeUploads.current);
    activeFileNames.forEach(fileName => {
      cancelUpload(fileName);
    });
    setIsUploading(false);
    setTimeout(cleanup, 1000);
  }, [cancelUpload, cleanup]);

  const retryUpload = useCallback((fileName) => {
    const stats = uploadStats[fileName];
    if (stats?.file) {
      setUploadStats(prev => ({
        ...prev,
        [fileName]: {
          ...prev[fileName],
          failed: false,
          error: null
        }
      }));
      handleFileUpload([stats.file]);
    }
  }, [uploadStats, handleFileUpload]);

  const getUploadStats = useCallback(() => {
    const activeCount = activeUploads.current.size;
    const totalFiles = Object.keys(uploadProgress).length;
    const completedFiles = Object.values(uploadProgress).filter(progress => progress >= 100).length;
    const failedFiles = Object.values(uploadStats).filter(stats => stats?.failed).length;

    return {
      active: activeCount,
      total: totalFiles,
      completed: completedFiles,
      failed: failedFiles,
      inProgress: activeCount - completedFiles - failedFiles
    };
  }, [uploadProgress, uploadStats]);

  return {
    showUpload,
    setShowUpload,
    uploadProgress,
    uploadStats,
    isUploading,
    handleFileUpload,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    getUploadStats,
    cleanup
  };
};