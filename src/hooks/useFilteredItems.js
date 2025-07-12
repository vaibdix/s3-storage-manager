// hooks/useFilteredItems.js
import { useState, useMemo, useCallback } from 'react';

const FILE_TYPE_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'],
  video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'],
  pdf: ['pdf'],
  document: ['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md', 'tex'],
  spreadsheet: ['xls', 'xlsx', 'csv', 'ods', 'numbers'],
  presentation: ['ppt', 'pptx', 'odp', 'key'],
  code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'swift'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
};

export const useFilteredItems = (items) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const getFileType = useCallback((fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext) return 'other';

    for (const [type, extensions] of Object.entries(FILE_TYPE_EXTENSIONS)) {
      if (extensions.includes(ext)) {
        return type;
      }
    }
    return 'other';
  }, []);

  const searchItems = useCallback((items, query) => {
    if (!query.trim()) return items;
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    return items.filter(item => {
      const name = item.name.toLowerCase();
      return searchTerms.every(term => name.includes(term));
    });
  }, []);

  const filterItemsByType = useCallback((folders, files, type) => {
    if (type === 'all') {
      return { folders, files };
    }
    if (type === 'folder') {
      return { folders, files: [] };
    }
    const filteredFiles = files.filter(file => getFileType(file.name) === type);
    return { folders: [], files: filteredFiles };
  }, [getFileType]);

  const sortItems = useCallback((items, sortBy, sortOrder) => {
    return [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
          break;
        case 'size':
          const sizeA = a.size || 0;
          const sizeB = b.size || 0;
          comparison = sizeA - sizeB;
          break;
        case 'date':
          const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
          const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
          comparison = dateA - dateB;
          break;
        case 'type':
          const typeA = a.type === 'folder' ? 'folder' : getFileType(a.name);
          const typeB = b.type === 'folder' ? 'folder' : getFileType(b.name);
          comparison = typeA.localeCompare(typeB);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [getFileType]);

  const filteredItems = useMemo(() => {
    let folders = [...(items.folders || [])];
    let files = [...(items.files || [])];
    folders = searchItems(folders, searchQuery);
    files = searchItems(files, searchQuery);
    const filtered = filterItemsByType(folders, files, filterType);
    folders = filtered.folders;
    files = filtered.files;
    folders = sortItems(folders, sortBy, sortOrder);
    files = sortItems(files, sortBy, sortOrder);

    return { folders, files };
  }, [items, searchQuery, filterType, sortBy, sortOrder, searchItems, filterItemsByType, sortItems]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setSortBy('name');
    setSortOrder('asc');
  }, []);

  const getFilteredCount = useCallback(() => {
    const total = (items.folders?.length || 0) + (items.files?.length || 0);
    const filtered = filteredItems.folders.length + filteredItems.files.length;
    return { total, filtered };
  }, [items, filteredItems]);

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Types', icon: '📁' },
    { value: 'folder', label: 'Folders', icon: '📁' },
    { value: 'image', label: 'Images', icon: '🖼️' },
    { value: 'video', label: 'Videos', icon: '🎥' },
    { value: 'audio', label: 'Audio', icon: '🎵' },
    { value: 'document', label: 'Documents', icon: '📄' },
    { value: 'pdf', label: 'PDF', icon: '📕' },
    { value: 'code', label: 'Code', icon: '💻' },
    { value: 'archive', label: 'Archives', icon: '📦' },
    { value: 'other', label: 'Other', icon: '📎' }
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'name-asc', label: 'Name ↑', field: 'name', order: 'asc' },
    { value: 'name-desc', label: 'Name ↓', field: 'name', order: 'desc' },
    { value: 'size-asc', label: 'Size ↑', field: 'size', order: 'asc' },
    { value: 'size-desc', label: 'Size ↓', field: 'size', order: 'desc' },
    { value: 'date-asc', label: 'Date ↑', field: 'date', order: 'asc' },
    { value: 'date-desc', label: 'Date ↓', field: 'date', order: 'desc' },
    { value: 'type-asc', label: 'Type ↑', field: 'type', order: 'asc' },
    { value: 'type-desc', label: 'Type ↓', field: 'type', order: 'desc' }
  ], []);

  const handleSortChange = useCallback((value) => {
    const option = sortOptions.find(opt => opt.value === value);
    if (option) {
      setSortBy(option.field);
      setSortOrder(option.order);
    }
  }, [sortOptions]);
  const getCurrentSortValue = useCallback(() => {
    return `${sortBy}-${sortOrder}`;
  }, [sortBy, sortOrder]);
  const getCurrentFilterLabel = useCallback(() => {
    const option = filterOptions.find(opt => opt.value === filterType);
    return option ? `${option.icon} ${option.label}` : 'All Types';
  }, [filterType, filterOptions]);
  const getCurrentSortLabel = useCallback(() => {
    const option = sortOptions.find(opt => opt.value === getCurrentSortValue());
    return option ? option.label : 'Name ↑';
  }, [getCurrentSortValue, sortOptions]);

  const applyQuickFilter = useCallback((preset) => {
    switch (preset) {
      case 'recent':
        setSortBy('date');
        setSortOrder('desc');
        setFilterType('all');
        break;
      case 'large-files':
        setSortBy('size');
        setSortOrder('desc');
        setFilterType('all');
        break;
      case 'images-only':
        setFilterType('image');
        setSortBy('name');
        setSortOrder('asc');
        break;
      case 'documents-only':
        setFilterType('document');
        setSortBy('name');
        setSortOrder('asc');
        break;
      default:
        break;
    }
  }, []);

  const quickFilterOptions = useMemo(() => [
    { value: 'recent', label: '🕒 Recent Files' },
    { value: 'large-files', label: '📊 Large Files' },
    { value: 'images-only', label: '🖼️ Images Only' },
    { value: 'documents-only', label: '📄 Documents Only' }
  ], []);

  const getFilterStats = useCallback(() => {
    const allItems = [...(items.folders || []), ...(items.files || [])];
    const stats = {
      total: allItems.length,
      folders: items.folders?.length || 0,
      files: items.files?.length || 0,
      byType: {}
    };
    (items.files || []).forEach(file => {
      const type = getFileType(file.name);
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    return stats;
  }, [items, getFileType]);

  return {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filteredItems,
    getFileType,
    clearFilters,
    getFilteredCount,
    applyQuickFilter,
    handleSortChange,
    filterOptions,
    sortOptions,
    quickFilterOptions,
    getCurrentSortValue,
    getCurrentFilterLabel,
    getCurrentSortLabel,
    getFilterStats
  };
};