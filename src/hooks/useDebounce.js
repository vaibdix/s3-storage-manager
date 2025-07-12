// hooks/useDebounce.js
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useSmartDebounce = (value, delay, options = {}) => {
  const {
    immediateEmpty = true, // Immediately update when value becomes empty
    maxWait = null, // Maximum time to wait before forcing update
    leading = false, // Call immediately on first change
  } = options;

  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    if (immediateEmpty && !value) {
      setDebouncedValue(value);
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);
    if (leading && debouncedValue !== value) {
      setDebouncedValue(value);
    }

    let maxWaitHandler;
    if (maxWait) {
      maxWaitHandler = setTimeout(() => {
        setDebouncedValue(value);
        setIsDebouncing(false);
      }, maxWait);
    }

    return () => {
      clearTimeout(handler);
      if (maxWaitHandler) {
        clearTimeout(maxWaitHandler);
      }
    };
  }, [value, delay, immediateEmpty, maxWait, leading, debouncedValue]);

  return { debouncedValue, isDebouncing };
};

import { useState, useMemo, useCallback, useRef } from 'react';
import { useSmartDebounce } from './useDebounce';

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

export const useEnhancedFilteredItems = (items) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const { debouncedValue: debouncedSearchQuery, isDebouncing } = useSmartDebounce(
    searchQuery,
    300, // 300ms delay
    {
      immediateEmpty: true, // Clear immediately when search is emptied
      maxWait: 1000 // Force update after 1 second max
    }
  );
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

  const searchItems = useMemo(() => {
    return (items, query) => {
      if (!query.trim()) return items;
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      return items.filter(item => {
        const name = item.name.toLowerCase();
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        const fileType = item.type === 'folder' ? 'folder' : getFileType(item.name);
        const searchableText = `${name} ${extension} ${fileType}`;
        return searchTerms.every(term => {
          return searchableText.includes(term) ||
                 name.startsWith(term) || // Prioritize prefix matches
                 (term.length > 2 && name.includes(term)); // Fuzzy matching for longer terms
        });
      });
    };
  }, [getFileType]);

  const filterItemsByType = useMemo(() => {
    return (folders, files, type) => {
      if (type === 'all') {
        return { folders, files };
      }

      if (type === 'folder') {
        return { folders, files: [] };
      }

      const filteredFiles = files.filter(file => getFileType(file.name) === type);
      return { folders: [], files: filteredFiles };
    };
  }, [getFileType]);

  const sortItems = useMemo(() => {
    return (items, sortField, order) => {
      return [...items].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name, undefined, {
              numeric: true,
              sensitivity: 'base'
            });
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
            if (comparison === 0) {
              comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
            }
            break;
          default:
            comparison = 0;
        }

        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }

        return order === 'desc' ? -comparison : comparison;
      });
    };
  }, [getFileType]);

  const filteredItems = useMemo(() => {
    let folders = [...(items.folders || [])];
    let files = [...(items.files || [])];
    folders = searchItems(folders, debouncedSearchQuery);
    files = searchItems(files, debouncedSearchQuery);
    const filtered = filterItemsByType(folders, files, filterType);
    folders = filtered.folders;
    files = filtered.files;
    folders = sortItems(folders, sortBy, sortOrder);
    files = sortItems(files, sortBy, sortOrder);
    return { folders, files };
  }, [
    items.folders,
    items.files,
    debouncedSearchQuery,
    filterType,
    sortBy,
    sortOrder,
    searchItems,
    filterItemsByType,
    sortItems
  ]);

  const performanceStats = useMemo(() => {
    const total = (items.folders?.length || 0) + (items.files?.length || 0);
    const filtered = filteredItems.folders.length + filteredItems.files.length;

    return {
      totalItems: total,
      filteredItems: filtered,
      foldersFiltered: filteredItems.folders.length,
      filesFiltered: filteredItems.files.length,
      reductionPercentage: total > 0 ? Math.round(((total - filtered) / total) * 100) : 0,
      isSearching: isDebouncing || debouncedSearchQuery !== searchQuery
    };
  }, [items, filteredItems, isDebouncing, debouncedSearchQuery, searchQuery]);
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
  const handleSortChange = useCallback((value) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder(order);
  }, []);
  const getCurrentSortValue = useCallback(() => {
    return `${sortBy}-${sortOrder}`;
  }, [sortBy, sortOrder]);


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
      case 'folders-only':
        setFilterType('folder');
        setSortBy('name');
        setSortOrder('asc');
        break;
      default:
        break;
    }
  }, []);

  const searchInFiles = useCallback((query) => {

    console.log('Content search not yet implemented:', query);
  }, []);

  const saveSearch = useCallback((name) => {
    const savedSearch = {
      name,
      query: searchQuery,
      filterType,
      sortBy,
      sortOrder,
      createdAt: new Date()
    };

    const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    savedSearches.push(savedSearch);
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
  }, [searchQuery, filterType, sortBy, sortOrder]);

  const loadSavedSearch = useCallback((savedSearch) => {
    setSearchQuery(savedSearch.query);
    setFilterType(savedSearch.filterType);
    setSortBy(savedSearch.sortBy);
    setSortOrder(savedSearch.sortOrder);
  }, []);

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

  const quickFilterOptions = useMemo(() => [
    { value: 'recent', label: '🕒 Recent Files' },
    { value: 'large-files', label: '📊 Large Files' },
    { value: 'images-only', label: '🖼️ Images Only' },
    { value: 'documents-only', label: '📄 Documents Only' },
    { value: 'folders-only', label: '📁 Folders Only' }
  ], []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isSearching: isDebouncing,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filteredItems,
    performanceStats,
    clearFilters,
    getFilteredCount,
    applyQuickFilter,
    handleSortChange,
    getCurrentSortValue,
    searchInFiles,
    saveSearch,
    loadSavedSearch,
    filterOptions,
    sortOptions,
    quickFilterOptions,
    getFileType
  };
};