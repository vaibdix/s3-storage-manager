// components/upload/UploadProgress.jsx
import React, { useMemo } from 'react';
import { X, CheckCircle, AlertCircle, Upload, Pause, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return '0 B/s';
  return formatBytes(bytesPerSecond) + '/s';
};

const formatTime = (seconds) => {
  if (!seconds || seconds === Infinity || isNaN(seconds)) return '--';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const UploadProgressItem = ({
  fileName,
  progress,
  stats,
  onCancel,
  onPause,
  onResume,
  isPaused = false
}) => {
  const {
    size = 0,
    uploaded = 0,
    smoothedSpeed = 0,
    timeRemaining = 0,
    error = null,
    failed = false
  } = stats || {};

  const status = useMemo(() => {
    if (failed || error) return 'error';
    if (progress >= 100) return 'completed';
    if (isPaused) return 'paused';
    return 'uploading';
  }, [progress, failed, error, isPaused]);

  const statusColor = useMemo(() => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'paused': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  }, [status]);

  const progressBarColor = useMemo(() => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  }, [status]);

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="flex-shrink-0">
            {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            {status === 'paused' && <Pause className="w-5 h-5 text-yellow-600" />}
            {status === 'uploading' && <Upload className="w-5 h-5 text-blue-600 animate-pulse" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate" title={fileName}>
              {fileName}
            </p>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>{formatBytes(size)}</span>
              {status === 'uploading' && smoothedSpeed > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 font-medium">{formatSpeed(smoothedSpeed)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className={statusColor}>
            {progress}%
          </Badge>

          {/* Control buttons */}
          <div className="flex items-center space-x-1">
            {status === 'uploading' && onPause && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPause}
                className="h-8 w-8 p-0"
                title="Pause upload"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}

            {status === 'paused' && onResume && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResume}
                className="h-8 w-8 p-0"
                title="Resume upload"
              >
                <Play className="w-4 h-4" />
              </Button>
            )}

            {(status === 'uploading' || status === 'paused' || status === 'error') && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Cancel upload"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <Progress
          value={progress}
          className="h-2"
          indicatorClassName={progressBarColor}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>
            {formatBytes(uploaded)} / {formatBytes(size)}
          </span>

          {status === 'uploading' && timeRemaining > 0 && (
            <span className="text-primary font-medium">
              {formatTime(timeRemaining)} remaining
            </span>
          )}

          {status === 'completed' && (
            <span className="text-green-600 font-medium">
              ✓ Upload complete
            </span>
          )}

          {status === 'paused' && (
            <span className="text-yellow-600 font-medium">
              ⏸ Paused
            </span>
          )}
        </div>
        {error && (
          <span className="text-red-600 font-medium">
            Error: {error}
          </span>
        )}
      </div>
    </div>
  );
};

const UploadProgress = ({
  uploadProgress,
  uploadStats,
  onCancelUpload,
  onCancelAllUploads,
  onPauseUpload,
  onResumeUpload,
  pausedUploads = new Set(),
  className = ""
}) => {
  const uploadFiles = Object.keys(uploadProgress);
  if (uploadFiles.length === 0) return null;
  const totalFiles = uploadFiles.length;
  const completedFiles = uploadFiles.filter(fileName => uploadProgress[fileName] >= 100).length;
  const failedFiles = uploadFiles.filter(fileName => uploadStats[fileName]?.failed).length;
  const activeFiles = totalFiles - completedFiles - failedFiles;
  const overallProgress = uploadFiles.length > 0
    ? Math.round(uploadFiles.reduce((sum, fileName) => sum + uploadProgress[fileName], 0) / uploadFiles.length)
    : 0;
  const totalSpeed = uploadFiles.reduce((sum, fileName) => {
    const stats = uploadStats[fileName];
    return sum + (stats?.smoothedSpeed || 0);
  }, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-foreground">
            Upload Progress
          </h3>
          <Badge variant="outline">
            {completedFiles}/{totalFiles} files
          </Badge>
          {totalSpeed > 0 && (
            <Badge variant="secondary">
              {formatSpeed(totalSpeed)}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {overallProgress}% overall
          </span>

          {activeFiles > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelAllUploads}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel All
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={overallProgress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            {activeFiles > 0 && (
              <span>{activeFiles} uploading</span>
            )}
            {completedFiles > 0 && (
              <span className="text-green-600">{completedFiles} completed</span>
            )}
            {failedFiles > 0 && (
              <span className="text-red-600">{failedFiles} failed</span>
            )}
          </div>

          {totalSpeed > 0 && (
            <span className="font-medium">
              Total: {formatSpeed(totalSpeed)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {uploadFiles.map(fileName => (
          <UploadProgressItem
            key={fileName}
            fileName={fileName}
            progress={uploadProgress[fileName]}
            stats={uploadStats[fileName]}
            isPaused={pausedUploads.has(fileName)}
            onCancel={() => onCancelUpload?.(fileName)}
            onPause={() => onPauseUpload?.(fileName)}
            onResume={() => onResumeUpload?.(fileName)}
          />
        ))}
      </div>
    </div>
  );
};

export default UploadProgress;