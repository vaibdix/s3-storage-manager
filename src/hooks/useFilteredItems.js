import { useState, useMemo, useCallback } from 'react'

export const useFilteredItems = (items) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  // File type detection
  const getFileType = useCallback((fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) return 'audio';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'document';
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c'].includes(ext)) return 'code';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    return 'other';
  }, []);

  // Filter and search items
  const filteredItems = useMemo(() => {
    let folders = [...items.folders];
    let files = [...items.files];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      folders = folders.filter(folder =>
        folder.name.toLowerCase().includes(query)
      );
      files = files.filter(file =>
        file.name.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'folder') {
        files = []; // Only show folders
      } else {
        folders = []; // Hide folders for file type filters
        files = files.filter(file => getFileType(file.name) === filterType);
      }
    }

    return { folders, files };
  }, [items, searchQuery, filterType, getFileType]);

  return {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filteredItems,
    getFileType
  }
}