import React, { useState, useCallback, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
export const validateFolderNameForS3 = (folderName) => {
  if (!folderName || folderName.trim().length === 0) {
    throw new Error('Folder name cannot be empty');
  }
  const trimmedName = folderName.trim();
  const invalidChars = /[<>:"/\\|?*\x00-\x1f\x80-\xff]/;
  if (invalidChars.test(trimmedName)) {
    throw new Error('Folder name contains invalid characters. Use only letters, numbers, hyphens, and underscores.');
  }
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(trimmedName.toUpperCase())) {
    throw new Error('Folder name cannot be a reserved system name');
  }
  if (trimmedName.startsWith('.') || trimmedName.startsWith('-')) {
    throw new Error('Folder name cannot start with a dot or hyphen');
  }
  if (trimmedName.endsWith('.') || trimmedName.endsWith('-')) {
    throw new Error('Folder name cannot end with a dot or hyphen');
  }
  if (trimmedName.includes('..')) {
    throw new Error('Folder name cannot contain consecutive dots');
  }
  return true;
};

export const validateFileNameForS3 = (fileName) => {
  if (!fileName || fileName.trim().length === 0) {
    throw new Error('File name cannot be empty');
  }
  const trimmedName = fileName.trim();
  const invalidChars = /[<>:"/\\|?*\x00-\x1f\x80-\xff]/;
  if (invalidChars.test(trimmedName)) {
    throw new Error('File name contains invalid characters. Use only letters, numbers, hyphens, underscores, and dots.');
  }
  return true;
};

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function RenameModal({
  isOpen,
  onClose,
  onRename,
  item,
  currentPath = '',
  isRenaming = false
}) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const isFolder = item?.type === 'folder';
  const originalName = item?.name || '';
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    if (newName.trim() === originalName) {
      setError('New name must be different from current name');
      return;
    }
    try {
      if (isFolder) {
        validateFolderNameForS3(newName.trim());
      } else {
        validateFileNameForS3(newName.trim());
      }
      await onRename(newName.trim());
      setNewName('');
    } catch (err) {
      setError(err.message);
    }
  }, [newName, originalName, onRename, isFolder]);

  const handleClose = useCallback(() => {
    if (!isRenaming) {
      setNewName('');
      setError('');
      onClose();
    }
  }, [isRenaming, onClose]);

  const handleInputChange = useCallback((e) => {
    setNewName(e.target.value);
    setError('');
  }, []);

  useEffect(() => {
    if (isOpen && item) {
      if (isFolder) {
        setNewName(originalName);
      } else {
        setNewName(originalName);
      }
      setError('');
    }
  }, [isOpen, item, originalName, isFolder]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent onEscapeKeyDown={handleClose}>
        <DialogHeader>
          <div className="flex items-center">
            <Edit2 className="w-5 h-5 text-primary mr-2" />
            <DialogTitle>
              Rename {isFolder ? 'Folder' : 'File'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Enter a new name for "{originalName}"
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="newName" className="mb-2 block">
              {isFolder ? 'Folder' : 'File'} Name
            </Label>
            <Input
              id="newName"
              type="text"
              value={newName}
              onChange={handleInputChange}
              placeholder={`Enter new ${isFolder ? 'folder' : 'file'} name`}
              required
              disabled={isRenaming}
              maxLength={255}
              autoFocus
              onFocus={(e) => {
                if (!isFolder && newName.includes('.')) {
                  const lastDotIndex = newName.lastIndexOf('.');
                  e.target.setSelectionRange(0, lastDotIndex);
                } else {
                  e.target.select();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isFolder
                ? "Use only letters, numbers, hyphens, and underscores. Cannot start/end with dots or hyphens."
                : "Use only letters, numbers, hyphens, underscores, and dots. Avoid special characters."
              }
            </p>
          </div>

          <DialogFooter className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newName.trim() || newName.trim() === originalName || isRenaming}
            >
              {isRenaming ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-medium text-amber-800 mb-1">⚠️ Important:</h4>
          <ul className="text-xs text-amber-700 space-y-1">
            {isFolder ? (
              <>
                <li>• Folder renaming is limited to folders with 50 or fewer items</li>
                <li>• Large folders cannot be renamed due to S3 limitations</li>
                <li>• Consider creating a new folder and moving files manually for large directories</li>
                <li>• All files and subfolders will be moved to the new location</li>
              </>
            ) : (
              <>
                <li>• File will be downloaded and re-uploaded with the new name</li>
                <li>• Original file will be deleted after successful rename</li>
                <li>• Large files may take some time to rename</li>
              </>
            )}
            <li>• Any shared links to this {isFolder ? 'folder' : 'file'} will no longer work</li>
            <li>• This action cannot be undone</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(RenameModal);