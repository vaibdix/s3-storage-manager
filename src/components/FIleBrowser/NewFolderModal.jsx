import React, { useState, useCallback, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { validateFolderName } from '../../utils';

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

    try {
      validateFolderName(folderName);
      await onCreateFolder(folderName.trim());
      setFolderName('');
    } catch (err) {
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
    setFolderName(e.target.value);
    setError('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
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
            <DialogClose asChild>
              
            </DialogClose>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="folderName" className="mb-2 block">
              Folder Name
            </Label>
            <Input
              id="folderName"
              type="text"
              value={folderName}
              onChange={handleInputChange}
              placeholder="Enter folder name"
              required
              disabled={isCreating}
              maxLength={255}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Folder names cannot contain: {'< > : " / \\ | ? *'}
            </p>
          </div>

          <DialogFooter className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <h4 className="text-sm font-medium text-primary mb-1">📁 Folder Guidelines:</h4>
          <ul className="text-xs text-primary/80 space-y-1">
            <li>• Use descriptive names for better organization</li>
            <li>• Avoid special characters and spaces when possible</li>
            <li>• Folders will appear as directories in your S3 bucket</li>
            <li>• You can create nested folders by navigating into them</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(NewFolderModal);