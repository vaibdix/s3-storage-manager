// hooks/useFolderOperations.js
import { useState, useCallback } from 'react';

export const useFolderOperations = (s3Service, currentPath, onOperationComplete) => {
  // Modal states
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Selected items for operations
  const [itemToRename, setItemToRename] = useState(null);
  const [itemToMove, setItemToMove] = useState(null);
  const [itemToShare, setItemToShare] = useState(null);

  // Loading states
  const [operationLoading, setOperationLoading] = useState({
    rename: false,
    move: false,
    share: false,
    create: false,
    delete: false
  });

  const setLoading = useCallback((operation, loading) => {
    setOperationLoading(prev => ({ ...prev, [operation]: loading }));
  }, []);

  const createFolder = useCallback(async (folderName) => {
    if (!s3Service || !currentPath !== undefined) return;

    setLoading('create', true);
    try {
      const folderPath = currentPath + folderName.trim() + '/';
      await s3Service.createFolder(folderPath);
      setShowNewFolder(false);

      if (onOperationComplete) {
        await onOperationComplete();
      }
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    } finally {
      setLoading('create', false);
    }
  }, [currentPath, s3Service, onOperationComplete, setLoading]);

  const handleRename = useCallback(async (newName) => {
    if (!itemToRename || !s3Service) return;

    setLoading('rename', true);
    try {
      const isFolder = itemToRename.type === 'folder';

      if (isFolder) {
        const oldPath = itemToRename.fullPath;
        const parentPath = currentPath;
        const newPath = parentPath + newName + '/';
        await s3Service.renameFolder(oldPath, newPath);
      } else {
        const oldPath = itemToRename.fullPath;
        const newPath = currentPath + newName;
        await s3Service.renameObject(oldPath, newPath);
      }

      setShowRename(false);
      setItemToRename(null);

      if (onOperationComplete) {
        await onOperationComplete();
      }
    } catch (error) {
      console.error('Rename error:', error);
      throw error;
    } finally {
      setLoading('rename', false);
    }
  }, [itemToRename, currentPath, s3Service, onOperationComplete, setLoading]);

  const handleMove = useCallback(async (destinationPath) => {
    if (!itemToMove || !s3Service) return;

    setLoading('move', true);
    try {
      const isFolder = itemToMove.type === 'folder';
      const sourcePath = itemToMove.fullPath;
      const newPath = destinationPath + itemToMove.name + (isFolder ? '/' : '');

      if (isFolder) {
        await s3Service.renameFolder(sourcePath, newPath);
      } else {
        await s3Service.renameObject(sourcePath, newPath);
      }

      setShowMove(false);
      setItemToMove(null);

      if (onOperationComplete) {
        await onOperationComplete();
      }
    } catch (error) {
      console.error('Move error:', error);
      throw error;
    } finally {
      setLoading('move', false);
    }
  }, [itemToMove, s3Service, onOperationComplete, setLoading]);

  const deleteItems = useCallback(async (keys, selectedItems) => {
    if (!s3Service) return;

    const toDelete = keys ?? Array.from(selectedItems);
    if (toDelete.length === 0) return;

    if (!window.confirm(
      `Delete ${toDelete.length} item${toDelete.length > 1 ? 's' : ''}? This action cannot be undone.`
    )) {
      return;
    }

    setLoading('delete', true);
    try {
      await s3Service.deleteObjects(toDelete);

      if (onOperationComplete) {
        await onOperationComplete();
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    } finally {
      setLoading('delete', false);
    }
  }, [s3Service, onOperationComplete, setLoading]);

  const downloadFile = useCallback((item) => {
    if (!s3Service) return;

    try {
      const url = s3Service.getDownloadUrl(item.fullPath);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
  }, [s3Service]);

  // Modal control functions
  const openRenameModal = useCallback((item) => {
    setItemToRename(item);
    setShowRename(true);
  }, []);

  const closeRenameModal = useCallback(() => {
    setShowRename(false);
    setItemToRename(null);
  }, []);

  const openMoveModal = useCallback((item) => {
    setItemToMove(item);
    setShowMove(true);
  }, []);

  const closeMoveModal = useCallback(() => {
    setShowMove(false);
    setItemToMove(null);
  }, []);

  const openShareModal = useCallback((item) => {
    setItemToShare(item);
    setShowShare(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setShowShare(false);
    setItemToShare(null);
  }, []);

  const openNewFolderModal = useCallback(() => {
    setShowNewFolder(true);
  }, []);

  const closeNewFolderModal = useCallback(() => {
    setShowNewFolder(false);
  }, []);

  return {
    // Modal states
    showNewFolder,
    showRename,
    showMove,
    showShare,

    // Selected items
    itemToRename,
    itemToMove,
    itemToShare,

    // Loading states
    operationLoading,

    // Operations
    createFolder,
    handleRename,
    handleMove,
    deleteItems,
    downloadFile,

    // Modal controls
    openRenameModal,
    closeRenameModal,
    openMoveModal,
    closeMoveModal,
    openShareModal,
    closeShareModal,
    openNewFolderModal,
    closeNewFolderModal
  };
};