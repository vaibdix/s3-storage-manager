import React, { useState, useCallback, useEffect } from 'react';
import { X, Folder } from 'lucide-react';

// FIXED: Import the validation function from utils
import { validateFolderName } from '../../utils/validators';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function NewFolderModal({
  isOpen,
  onClose,
  onCreateFolder,
  isCreating = false
}) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = folderName.trim();

    if (!trimmedName) {
      setError('Folder name cannot be empty');
      return;
    }

    try {
      // Validate folder name
      validateFolderName(trimmedName);

      console.log('Creating folder with name:', trimmedName);
      await onCreateFolder(trimmedName);

      // Only clear if successful and modal closes
      setFolderName('');
    } catch (err) {
      console.error('Folder creation error:', err);
      setError(err.message);
    }
  }, [folderName, onCreateFolder]);

  const handleClose = useCallback(() => {
    if (!isCreating) {
      setFolderName('');
      setError('');
      onClose();
    }
  }, [isCreating, onClose]);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setFolderName(value);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  }, [error]);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
    }
  }, [isOpen]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        const input = document.getElementById('folderName');
        if (input) {
          input.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent onEscapeKeyDown={handleClose}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Folder className="w-5 h-5 text-primary mr-2" />
              <DialogTitle>Create New Folder</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            Enter a name for the new folder. Folder names should be descriptive and follow S3 naming conventions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm font-medium">Error</p>
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="folderName" className="text-sm font-medium">
              Folder Name *
            </Label>
            <Input
              id="folderName"
              type="text"
              value={folderName}
              onChange={handleInputChange}
              placeholder="Enter folder name (e.g., Documents, Images)"
              required
              disabled={isCreating}
              maxLength={255}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Avoid special characters: {'< > : " / \\ | ? *'}
            </p>
          </div>

          <DialogFooter className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || isCreating}
              className="min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Folder className="w-4 h-4 mr-2" />
                  Create Folder
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
            📁 Folder Guidelines:
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use descriptive names for better organization</li>
            <li>• Avoid special characters and spaces when possible</li>
            <li>• Folders appear as directories in your S3 bucket</li>
            <li>• You can create nested folders by navigating into them</li>
            <li>• Folder names are case-sensitive</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(NewFolderModal);