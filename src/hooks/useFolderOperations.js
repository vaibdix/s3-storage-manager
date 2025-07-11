import { useState, useCallback } from 'react'

export const useFolderOperations = (s3Service, currentPath, onOperationComplete) => {
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [itemToRename, setItemToRename] = useState(null)
  const [itemToMove, setItemToMove] = useState(null)
  const [itemToShare, setItemToShare] = useState(null)
  const [renameLoading, setRenameLoading] = useState(false)
  const [moveLoading, setMoveLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)

  const createFolder = useCallback(
    async (folderName, execute) => {
      await execute(async () => {
        const folderPath = currentPath + folderName.trim() + '/'
        await s3Service.createFolder(folderPath)
        setShowNewFolder(false)
        if (onOperationComplete) await onOperationComplete()
      })
    },
    [currentPath, s3Service, onOperationComplete]
  )

  const handleRename = useCallback(
    async (newName) => {
      if (!itemToRename) return;

      setRenameLoading(true);
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
        if (onOperationComplete) await onOperationComplete();
      } catch (error) {
        console.error('Rename error:', error);
        alert(`Rename failed: ${error.message}`);
      } finally {
        setRenameLoading(false);
      }
    },
    [itemToRename, currentPath, s3Service, onOperationComplete]
  );

  const handleMove = useCallback(
    async (destinationPath) => {
      if (!itemToMove) return;

      setMoveLoading(true);
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
        if (onOperationComplete) await onOperationComplete();
      } catch (error) {
        console.error('Move error:', error);
        alert(`Move failed: ${error.message}`);
      } finally {
        setMoveLoading(false);
      }
    },
    [itemToMove, s3Service, onOperationComplete]
  );

  const openMoveModal = useCallback((item) => {
    setItemToMove(item);
    setShowMove(true);
  }, []);

  const openRenameModal = useCallback((item) => {
    setItemToRename(item);
    setShowRename(true);
  }, []);

  const openShareModal = useCallback((item) => {
    setItemToShare(item);
    setShowShare(true);
  }, []);

  const downloadFile = useCallback(
    (item) => {
      try {
        const url = s3Service.getDownloadUrl(item.fullPath)
        const a = document.createElement('a')
        a.href = url
        a.download = item.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (error) {
        console.error('Download error:', error)
        alert(`Download failed: ${error.message}`)
      }
    },
    [s3Service]
  )

  const deleteItems = useCallback(
    async (keys, selectedItems, execute) => {
      const toDelete = keys ?? Array.from(selectedItems)
      if (toDelete.length === 0) return
      if (
        !window.confirm(
          `Delete ${toDelete.length} item${toDelete.length > 1 ? 's' : ''}?`
        )
      )
        return
      await execute(async () => {
        await s3Service.deleteObjects(toDelete)
        if (onOperationComplete) await onOperationComplete()
      })
    },
    [s3Service, onOperationComplete]
  )

  return {
    showNewFolder,
    setShowNewFolder,
    showRename,
    setShowRename,
    showMove,
    setShowMove,
    showShare,
    setShowShare,
    itemToRename,
    setItemToRename,
    itemToMove,
    setItemToMove,
    itemToShare,
    setItemToShare,
    renameLoading,
    moveLoading,
    shareLoading,
    createFolder,
    handleRename,
    handleMove,
    openMoveModal,
    openRenameModal,
    openShareModal,
    downloadFile,
    deleteItems
  }
}