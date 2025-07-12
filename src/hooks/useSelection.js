// hooks/useSelection.js - Updated with shadcn Select integration
import { useState, useCallback, useMemo } from 'react';

export const useSelection = () => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState('single'); // 'single', 'multiple', 'range'

  const toggleSelection = useCallback((path, ctrlKey = false, shiftKey = false) => {
    setSelectedItems(prev => {
      const next = new Set(prev);

      // Handle different selection modes
      if (shiftKey && selectionMode === 'range') {
        // Range selection logic would go here
        // For now, just toggle the item
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
      } else if (ctrlKey || selectionMode === 'multiple') {
        // Multi-selection: toggle item
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
      } else {
        // Single selection: replace selection
        if (next.has(path) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(path);
        }
      }

      return next;
    });
  }, [selectionMode]);

  const selectAll = useCallback((items) => {
    if (!items) return;

    const allPaths = [
      ...(items.folders || []).map(item => item.fullPath),
      ...(items.files || []).map(item => item.fullPath)
    ];
    setSelectedItems(new Set(allPaths));
  }, []);

  const selectItems = useCallback((paths) => {
    setSelectedItems(new Set(paths));
  }, []);

  const selectByType = useCallback((items, type) => {
    if (!items) return;

    let pathsToSelect = [];

    switch (type) {
      case 'all':
        pathsToSelect = [
          ...(items.folders || []).map(item => item.fullPath),
          ...(items.files || []).map(item => item.fullPath)
        ];
        break;
      case 'folders':
        pathsToSelect = (items.folders || []).map(item => item.fullPath);
        break;
      case 'files':
        pathsToSelect = (items.files || []).map(item => item.fullPath);
        break;
      case 'none':
        pathsToSelect = [];
        break;
      default:
        return;
    }

    setSelectedItems(new Set(pathsToSelect));
  }, []);

  const invertSelection = useCallback((items) => {
    if (!items) return;

    const allPaths = [
      ...(items.folders || []).map(item => item.fullPath),
      ...(items.files || []).map(item => item.fullPath)
    ];

    setSelectedItems(prev => {
      const next = new Set();
      allPaths.forEach(path => {
        if (!prev.has(path)) {
          next.add(path);
        }
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback((path) => {
    return selectedItems.has(path);
  }, [selectedItems]);

  const isAllSelected = useCallback((items) => {
    if (!items || (items.folders?.length === 0 && items.files?.length === 0)) {
      return false;
    }

    const allPaths = [
      ...(items.folders || []).map(item => item.fullPath),
      ...(items.files || []).map(item => item.fullPath)
    ];

    return allPaths.length > 0 && allPaths.every(path => selectedItems.has(path));
  }, [selectedItems]);

  const isPartiallySelected = useCallback((items) => {
    if (!items || (items.folders?.length === 0 && items.files?.length === 0)) {
      return false;
    }

    const allPaths = [
      ...(items.folders || []).map(item => item.fullPath),
      ...(items.files || []).map(item => item.fullPath)
    ];

    const selectedCount = allPaths.filter(path => selectedItems.has(path)).length;
    return selectedCount > 0 && selectedCount < allPaths.length;
  }, [selectedItems]);

  const getSelectedPaths = useCallback(() => {
    return Array.from(selectedItems);
  }, [selectedItems]);

  const getSelectedItems = useCallback((items) => {
    if (!items) return { folders: [], files: [] };

    const selectedFolders = (items.folders || []).filter(item =>
      selectedItems.has(item.fullPath)
    );
    const selectedFiles = (items.files || []).filter(item =>
      selectedItems.has(item.fullPath)
    );

    return { folders: selectedFolders, files: selectedFiles };
  }, [selectedItems]);

  const getSelectionStats = useCallback((items) => {
    const selected = getSelectedItems(items);
    const totalSize = selected.files.reduce((sum, file) => sum + (file.size || 0), 0);

    return {
      folderCount: selected.folders.length,
      fileCount: selected.files.length,
      totalCount: selected.folders.length + selected.files.length,
      totalSize
    };
  }, [getSelectedItems]);

  // Selection options for shadcn Select component
  const selectionOptions = useMemo(() => [
    { value: 'none', label: 'Select None' },
    { value: 'all', label: 'Select All' },
    { value: 'folders', label: 'Select Folders Only' },
    { value: 'files', label: 'Select Files Only' },
    { value: 'invert', label: 'Invert Selection' }
  ], []);

  const handleSelectionChange = useCallback((value, items) => {
    switch (value) {
      case 'all':
        selectAll(items);
        break;
      case 'folders':
        selectByType(items, 'folders');
        break;
      case 'files':
        selectByType(items, 'files');
        break;
      case 'none':
        clearSelection();
        break;
      case 'invert':
        invertSelection(items);
        break;
      default:
        break;
    }
  }, [selectAll, selectByType, clearSelection, invertSelection]);

  const getCurrentSelectionType = useCallback((items) => {
    if (selectedItems.size === 0) return 'none';
    if (isAllSelected(items)) return 'all';

    const selected = getSelectedItems(items);
    if (selected.folders.length > 0 && selected.files.length === 0) return 'folders';
    if (selected.files.length > 0 && selected.folders.length === 0) return 'files';

    return 'mixed';
  }, [selectedItems.size, isAllSelected, getSelectedItems]);

  const selectionInfo = useMemo(() => ({
    count: selectedItems.size,
    isEmpty: selectedItems.size === 0,
    paths: Array.from(selectedItems),
    mode: selectionMode
  }), [selectedItems, selectionMode]);

  return {
    // Core selection state
    selectedItems,
    selectionMode,
    setSelectionMode,

    // Selection actions
    toggleSelection,
    selectAll,
    selectItems,
    selectByType,
    invertSelection,
    clearSelection,

    // Selection queries
    isSelected,
    isAllSelected,
    isPartiallySelected,
    getSelectedPaths,
    getSelectedItems,
    getSelectionStats,
    getCurrentSelectionType,

    // Shadcn Select integration
    selectionOptions,
    handleSelectionChange,

    // Selection info
    selectionInfo
  };
};