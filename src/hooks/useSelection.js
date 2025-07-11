import { useState, useCallback, useMemo } from 'react';

export const useSelection = () => {
  const [selectedItems, setSelectedItems] = useState(new Set());

  const toggleSelection = useCallback((path) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

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

  const getSelectedPaths = useCallback(() => {
    return Array.from(selectedItems);
  }, [selectedItems]);

  const selectionInfo = useMemo(() => ({
    count: selectedItems.size,
    isEmpty: selectedItems.size === 0,
    paths: Array.from(selectedItems)
  }), [selectedItems]);

  return {
    selectedItems,
    toggleSelection,
    selectAll,
    selectItems,
    clearSelection,
    isSelected,
    isAllSelected,
    getSelectedPaths,
    selectionInfo
  };
};