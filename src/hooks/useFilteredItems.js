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
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, []);

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
    getFilteredCount
  };
};