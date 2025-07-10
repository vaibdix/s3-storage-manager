import React, { useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";

function UploadModal({ isOpen, onClose, onUpload, isUploading = false }) {
  const fileInputRef = useRef(null);

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
      const files = e.dataTransfer.files;
      if (files?.length) {
        onUpload(Array.from(files));
      }
    },
    [onUpload]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogClose asChild>
           
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={handleBrowseClick}
            className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-center cursor-pointer"
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-1">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports multiple files. Large files will be uploaded in chunks.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(UploadModal);
