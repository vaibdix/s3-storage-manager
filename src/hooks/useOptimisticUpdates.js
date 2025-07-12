// hooks/useOptimisticUpdates.js
import { useState, useCallback, useRef } from 'react';

export const useOptimisticUpdates = (initialItems, onRevert) => {
  const [optimisticItems, setOptimisticItems] = useState(initialItems);
  const [pendingOperations, setPendingOperations] = useState(new Map());
  const operationId = useRef(0);
  const generateOperationId = useCallback(() => {
    return `op_${Date.now()}_${++operationId.current}`;
  }, []);

  const applyOptimisticUpdate = useCallback((operation, updateFn, revertFn) => {
    const opId = generateOperationId();
    setOptimisticItems(prev => updateFn(prev));
    setPendingOperations(prev => new Map(prev).set(opId, {
      operation,
      revertFn,
      timestamp: Date.now()
    }));

    return opId;
  }, [generateOperationId]);

  const confirmUpdate = useCallback((operationId) => {
    setPendingOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
  }, []);

  const revertUpdate = useCallback((operationId, error) => {
    const operation = pendingOperations.get(operationId);
    if (operation) {
      setOptimisticItems(prev => operation.revertFn(prev));
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
      if (onRevert) {
        onRevert(operation.operation, error);
      }
    }
  }, [pendingOperations, onRevert]);

  const optimisticOperations = {
    createFolder: useCallback((folderName, parentPath) => {
      const newFolder = {
        name: folderName,
        fullPath: parentPath + folderName + '/',
        type: 'folder',
        size: 0,
        lastModified: new Date(),
        optimistic: true,
        id: generateOperationId()
      };

      const updateFn = (items) => ({
        ...items,
        folders: [newFolder, ...items.folders]
      });

      const revertFn = (items) => ({
        ...items,
        folders: items.folders.filter(folder => folder.id !== newFolder.id)
      });

      return {
        operationId: applyOptimisticUpdate('createFolder', updateFn, revertFn),
        optimisticItem: newFolder
      };
    }, [applyOptimisticUpdate, generateOperationId]),

    deleteItems: useCallback((itemPaths) => {
      const deletedItems = { folders: [], files: [] };

      const updateFn = (items) => {
        const newFolders = items.folders.filter(folder => {
          const shouldDelete = itemPaths.includes(folder.fullPath);
          if (shouldDelete) deletedItems.folders.push(folder);
          return !shouldDelete;
        });

        const newFiles = items.files.filter(file => {
          const shouldDelete = itemPaths.includes(file.fullPath);
          if (shouldDelete) deletedItems.files.push(file);
          return !shouldDelete;
        });

        return { folders: newFolders, files: newFiles };
      };

      const revertFn = (items) => ({
        folders: [...items.folders, ...deletedItems.folders],
        files: [...items.files, ...deletedItems.files]
      });

      return {
        operationId: applyOptimisticUpdate('deleteItems', updateFn, revertFn),
        deletedItems
      };
    }, [applyOptimisticUpdate]),

    renameItem: useCallback((oldPath, newName, currentPath) => {
      let originalItem = null;

      const updateFn = (items) => {
        const isFolder = oldPath.endsWith('/');
        const newPath = currentPath + newName + (isFolder ? '/' : '');

        if (isFolder) {
          const folderIndex = items.folders.findIndex(f => f.fullPath === oldPath);
          if (folderIndex !== -1) {
            originalItem = items.folders[folderIndex];
            const updatedFolders = [...items.folders];
            updatedFolders[folderIndex] = {
              ...originalItem,
              name: newName,
              fullPath: newPath,
              optimistic: true
            };
            return { ...items, folders: updatedFolders };
          }
        } else {
          const fileIndex = items.files.findIndex(f => f.fullPath === oldPath);
          if (fileIndex !== -1) {
            originalItem = items.files[fileIndex];
            const updatedFiles = [...items.files];
            updatedFiles[fileIndex] = {
              ...originalItem,
              name: newName,
              fullPath: newPath,
              optimistic: true
            };
            return { ...items, files: updatedFiles };
          }
        }
        return items;
      };

      const revertFn = (items) => {
        if (!originalItem) return items;

        const isFolder = originalItem.type === 'folder';
        if (isFolder) {
          const folderIndex = items.folders.findIndex(f => f.optimistic && f.fullPath.includes(newName));
          if (folderIndex !== -1) {
            const updatedFolders = [...items.folders];
            updatedFolders[folderIndex] = originalItem;
            return { ...items, folders: updatedFolders };
          }
        } else {
          const fileIndex = items.files.findIndex(f => f.optimistic && f.name === newName);
          if (fileIndex !== -1) {
            const updatedFiles = [...items.files];
            updatedFiles[fileIndex] = originalItem;
            return { ...items, files: updatedFiles };
          }
        }
        return items;
      };

      return {
        operationId: applyOptimisticUpdate('renameItem', updateFn, revertFn),
        originalItem
      };
    }, [applyOptimisticUpdate]),

    moveItem: useCallback((itemPath) => {
      let movedItem = null;
      const updateFn = (items) => {
        const isFolder = itemPath.endsWith('/');
        if (isFolder) {
          const folderIndex = items.folders.findIndex(f => f.fullPath === itemPath);
          if (folderIndex !== -1) {
            movedItem = items.folders[folderIndex];
            const updatedFolders = items.folders.filter((_, i) => i !== folderIndex);
            return { ...items, folders: updatedFolders };
          }
        } else {
          const fileIndex = items.files.findIndex(f => f.fullPath === itemPath);
          if (fileIndex !== -1) {
            movedItem = items.files[fileIndex];
            const updatedFiles = items.files.filter((_, i) => i !== fileIndex);
            return { ...items, files: updatedFiles };
          }
        }
        return items;
      };

      const revertFn = (items) => {
        if (!movedItem) return items;

        if (movedItem.type === 'folder') {
          return { ...items, folders: [movedItem, ...items.folders] };
        } else {
          return { ...items, files: [movedItem, ...items.files] };
        }
      };

      return {
        operationId: applyOptimisticUpdate('moveItem', updateFn, revertFn),
        movedItem
      };
    }, [applyOptimisticUpdate]),

    addUploadedFiles: useCallback((files, currentPath) => {
      const optimisticFiles = files.map(file => ({
        name: file.name,
        fullPath: currentPath + file.name,
        type: 'file',
        size: file.size,
        lastModified: new Date(),
        optimistic: true,
        uploading: true,
        uploadProgress: 0
      }));

      const updateFn = (items) => ({
        ...items,
        files: [...optimisticFiles, ...items.files]
      });

      const revertFn = (items) => ({
        ...items,
        files: items.files.filter(file => !optimisticFiles.some(opt => opt.fullPath === file.fullPath))
      });

      return {
        operationId: applyOptimisticUpdate('addUploadedFiles', updateFn, revertFn),
        optimisticFiles
      };
    }, [applyOptimisticUpdate]),

    updateUploadProgress: useCallback((fileName, progress) => {
      setOptimisticItems(prev => ({
        ...prev,
        files: prev.files.map(file =>
          file.name === fileName && file.optimistic
            ? { ...file, uploadProgress: progress, uploading: progress < 100 }
            : file
        )
      }));
    }, [])
  };

  const syncWithRealData = useCallback((realItems) => {
    if (pendingOperations.size === 0) {
      setOptimisticItems(realItems);
    } else {
      const mergedItems = { ...realItems };
      optimisticItems.folders.forEach(folder => {
        if (folder.optimistic && !realItems.folders.some(f => f.fullPath === folder.fullPath)) {
          mergedItems.folders = [folder, ...mergedItems.folders];
        }
      });
      optimisticItems.files.forEach(file => {
        if (file.optimistic && !realItems.files.some(f => f.fullPath === file.fullPath)) {
          mergedItems.files = [file, ...mergedItems.files];
        }
      });

      setOptimisticItems(mergedItems);
    }
  }, [optimisticItems, pendingOperations.size]);

  const cleanupPendingOperations = useCallback(() => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    setPendingOperations(prev => {
      const newMap = new Map();
      for (const [id, operation] of prev) {
        if (now - operation.timestamp < timeout) {
          newMap.set(id, operation);
        }
      }
      return newMap;
    });
  }, []);

  return {
    optimisticItems,
    pendingOperations: Array.from(pendingOperations.keys()),
    optimisticOperations,
    confirmUpdate,
    revertUpdate,
    syncWithRealData,
    cleanupPendingOperations
  };
};