import React, { useState, useCallback, useEffect } from 'react';
import { Move, Folder, ArrowLeft, Home } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

function MoveModal({ isOpen, onClose, onMove, item, s3Service, currentPath = '', isMoving = false }) {
  const [selectedPath, setSelectedPath] = useState('');
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isFolder = item?.type === 'folder';
  const itemName = item?.name || '';
  const pathSegments = selectedPath.split('/').filter(Boolean);
  const loadFolders = useCallback(async (path = '') => {
    if (!s3Service || !isOpen) return;
    setLoading(true);
    setError('');
    try {
      const result = await s3Service.listObjects(path, false); // Don't need metadata for move
      setFolders(result.folders || []);
    } catch (err) {
      setError(`Failed to load folders: ${err.message}`);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [s3Service, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPath('');
      setError('');
      loadFolders('');
    }
  }, [isOpen, loadFolders]);

  const navigateToRoot = () => {
    setSelectedPath('');
    loadFolders('');
  };
  const navigateToFolder = (folderPath) => {
    setSelectedPath(folderPath);
    loadFolders(folderPath);
  };
  const navigateUp = () => {
    const parentPath = pathSegments.slice(0, -1).join('/');
    const newPath = parentPath ? `${parentPath}/` : '';
    setSelectedPath(newPath);
    loadFolders(newPath);
  };
  const handleMove = useCallback(async () => {
    if (!item) return;
    if (selectedPath === currentPath) {
      setError('Cannot move to the same location');
      return;
    }
    if (isFolder && selectedPath.startsWith(item.fullPath)) {
      setError('Cannot move folder into itself');
      return;
    }
    try {
      await onMove(selectedPath);
    } catch (err) {
      setError(err.message);
    }
  }, [item, selectedPath, currentPath, isFolder, onMove]);

  const handleClose = useCallback(() => {
    if (!isMoving) {setSelectedPath('');
      setError('');
      setFolders([]);
      onClose();
    }
  }, [isMoving, onClose]);

  if (!item) return null;
  const canMove = selectedPath !== currentPath &&
    !(isFolder && selectedPath.startsWith(item.fullPath));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl" onEscapeKeyDown={handleClose}>
        <DialogHeader>
          <div className="flex items-center">
            <Move className="w-5 h-5 text-primary mr-2" />
            <DialogTitle>
              Move {isFolder ? 'Folder' : 'File'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Choose a destination for "{itemName}"
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
        <div className="border-b border-border pb-3">
          <div className="flex items-center space-x-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToRoot}
              className="flex items-center space-x-1 hover:bg-muted"
            >
              <Home className="w-4 h-4" />
              <span>Root</span>
            </Button>
            {pathSegments.map((segment, index) => (
              <React.Fragment key={index}>
                <span className="text-muted-foreground">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const path = pathSegments.slice(0, index + 1).join('/') + '/';
                    navigateToFolder(path);
                  }}
                  className="hover:bg-muted"
                >
                  {segment}
                </Button>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Destination: {selectedPath || 'Root folder'}
            </span>
          </div>
          {canMove && (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
              Valid destination
            </Badge>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto border border-border rounded-lg">
          {loading ? (
            <div className="p-8">
              <LoadingSpinner centered message="Loading folders..." />
            </div>
          ) : folders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No folders in this location</p>
              <p className="text-xs mt-1">You can still move the item here</p>
            </div>
          ) : (
            <div className="p-2">
              {pathSegments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateUp}
                  className="w-full justify-start mb-2 hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>.. (Back)</span>
                </Button>
              )}

              {folders.map((folder) => (
                <Button
                  key={folder.fullPath}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToFolder(folder.fullPath)}
                  className="w-full justify-start p-3 hover:bg-muted"
                  disabled={isFolder && folder.fullPath.startsWith(item.fullPath)}
                >
                  <Folder className="w-4 h-4 mr-3 text-primary" />
                  <span className="truncate">{folder.name}</span>
                  {isFolder && folder.fullPath.startsWith(item.fullPath) && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Cannot move here
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!canMove || isMoving || loading}
          >
            {isMoving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Moving...
              </>
            ) : (
              <>
                <Move className="w-4 h-4 mr-2" />
                Move Here
              </>
            )}
          </Button>
        </DialogFooter>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-1">📁 Move Operation:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• The {isFolder ? 'folder and all its contents' : 'file'} will be moved to the selected destination</li>
            <li>• Original location will no longer contain this item</li>
            {isFolder && <li>• Large folders may take time to move</li>}
            <li>• Shared links will be updated automatically</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(MoveModal);