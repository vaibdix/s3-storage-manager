// components/FileBrowser/UploadModal.jsx
import React, { useRef, useCallback, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

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

const UploadProgressItem = ({ fileName, progress, stats, onCancel }) => {
  const { size = 0, uploaded = 0, smoothedSpeed = 0, timeRemaining = 0, error = null, failed = false } = stats || {};

  const status = React.useMemo(() => {
    if (failed || error) return 'error';
    if (progress >= 100) return 'completed';
    return 'uploading';
  }, [progress, failed, error]);
  const progressBarColor = React.useMemo(() => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  }, [status]);

  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="flex-shrink-0">
            {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
            {status === 'uploading' && <Upload className="w-4 h-4 text-blue-600 animate-pulse" />}
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
          <Badge variant="outline" className={
            status === 'completed' ? 'text-green-600' :
              status === 'error' ? 'text-red-600' : 'text-blue-600'
          }>
            {progress}%
          </Badge>

          {(status === 'uploading' || status === 'error') && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              title="Cancel upload"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="mb-2">
        <Progress
          value={progress}
          className="h-2"
        />
        <div
          className={`h-2 w-full rounded-full overflow-hidden bg-muted`}
          style={{ marginTop: '-8px' }}
        >
          <div
            className={`h-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-3">
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
              ✓ Complete
            </span>
          )}
        </div>

        {error && (
          <span className="text-red-600 font-medium text-xs">
            Error: {error}
          </span>
        )}
      </div>
    </div>
  );
};

function UploadModal({ isOpen, onClose, onUpload, isUploading = false, uploadProgress = {}, uploadStats = {}, onCancelUpload, onCancelAllUploads }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const handleFileSelect = useCallback(
    (e) => {
      const files = e.target.files;
      if (files?.length) {
        onUpload(Array.from(files));
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files?.length) {
        onUpload(Array.from(files));
      }
    },
    [onUpload]
  );
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const uploadFiles = Object.keys(uploadProgress);
  const hasUploads = uploadFiles.length > 0;
  const completedFiles = uploadFiles.filter(fileName => uploadProgress[fileName] >= 100).length;
  const failedFiles = uploadFiles.filter(fileName => uploadStats[fileName]?.failed).length;
  const activeFiles = uploadFiles.length - completedFiles - failedFiles;
  const overallProgress = uploadFiles.length > 0
    ? Math.round(uploadFiles.reduce((sum, fileName) => sum + uploadProgress[fileName], 0) / uploadFiles.length)
    : 0;
  const totalSpeed = uploadFiles.reduce((sum, fileName) => {
    const stats = uploadStats[fileName];
    return sum + (stats?.smoothedSpeed || 0);
  }, 0);
  const allUploadsComplete = hasUploads && activeFiles === 0;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            {hasUploads ?
              `Upload progress: ${completedFiles}/${uploadFiles.length} files completed` :
              "Upload files to your S3 bucket. You can drag and drop files or click to browse."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasUploads && (
            <div
              onClick={handleBrowseClick}
              className={`w-full p-8 border-2 border-dashed rounded-lg transition-colors text-center cursor-pointer ${dragOver
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-1">
                {dragOver ? 'Drop files here' : 'Drag and drop files here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supports multiple files. Large files will be uploaded in chunks.
              </p>
            </div>
          )}

          {hasUploads && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Upload Progress
                  </h3>
                  <Badge variant="outline">
                    {completedFiles}/{uploadFiles.length} files
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
                <div className="h-2 w-full rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full transition-all duration-300 bg-primary"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
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
                    onCancel={() => onCancelUpload?.(fileName)}
                  />
                ))}
              </div>
              {!isUploading && (
                <div className="border-t pt-4">
                  <div
                    onClick={handleBrowseClick}
                    className="w-full p-4 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-center cursor-pointer"
                  >
                    <Plus className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Add more files
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" disabled={isUploading}
          />

          <div className="flex justify-end space-x-2">
            {!hasUploads && (
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
            )}

            {hasUploads && (
              <Button
                onClick={onClose}
                disabled={isUploading && !allUploadsComplete}
              >
                {allUploadsComplete ? 'Done' : 'Close'}
              </Button>
            )}
          </div>

          {!hasUploads && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Upload Tips:
              </h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Files larger than 5MB will be uploaded using multipart upload</li>
                <li>• You can upload multiple files at once</li>
                <li>• Supported file types: All file types are supported</li>
                <li>• Maximum file size: Limited by your S3 bucket settings</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(UploadModal);