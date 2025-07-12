// hooks/useMemoizedOperations.js
import { useMemo, useCallback, useRef } from 'react';

export const useAdvancedMemo = (fn, deps, options = {}) => {
  const { maxSize = 100, ttl = 5 * 60 * 1000 } = options; // 5 minutes default TTL
  const cache = useRef(new Map());
  const timers = useRef(new Map());

  return useMemo(() => {
    const key = JSON.stringify(deps);
    const now = Date.now();
    if (cache.current.has(key)) {
      const { value, timestamp } = cache.current.get(key);
      if (now - timestamp < ttl) {
        return value;
      } else {
        cache.current.delete(key);
        if (timers.current.has(key)) {
          clearTimeout(timers.current.get(key));
          timers.current.delete(key);
        }
      }
    }
    if (cache.current.size >= maxSize) {
      const oldestKey = cache.current.keys().next().value;
      cache.current.delete(oldestKey);
      if (timers.current.has(oldestKey)) {
        clearTimeout(timers.current.get(oldestKey));
        timers.current.delete(oldestKey);
      }
    }e
    const value = fn();
    cache.current.set(key, { value, timestamp: now });
    const timer = setTimeout(() => {
      cache.current.delete(key);
      timers.current.delete(key);
    }, ttl);
    timers.current.set(key, timer);

    return value;
  }, deps);
};

export const useMemoizedFileOperations = (items) => {
  const fileStats = useAdvancedMemo(() => {
    const stats = {
      totalItems: 0,
      totalSize: 0,
      folderCount: 0,
      fileCount: 0,
      fileTypes: {},
      sizeDistribution: {
        small: 0,    // < 1MB
        medium: 0,   // 1MB - 100MB
        large: 0,    // 100MB - 1GB
        huge: 0      // > 1GB
      },
      largestFile: null,
      recentFiles: [],
      oldestFile: null
    };

    const allFiles = items.files || [];
    const allFolders = items.folders || [];

    stats.totalItems = allFiles.length + allFolders.length;
    stats.folderCount = allFolders.length;
    stats.fileCount = allFiles.length;
    allFiles.forEach(file => {
      const size = file.size || 0;
      stats.totalSize += size;
      if (size < 1024 * 1024) {
        stats.sizeDistribution.small++;
      } else if (size < 100 * 1024 * 1024) {
        stats.sizeDistribution.medium++;
      } else if (size < 1024 * 1024 * 1024) {
        stats.sizeDistribution.large++;
      } else {
        stats.sizeDistribution.huge++;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
      if (!stats.largestFile || size > stats.largestFile.size) {
        stats.largestFile = file;
      }

      if (file.lastModified) {
        const date = new Date(file.lastModified);
        if (!stats.oldestFile || date < new Date(stats.oldestFile.lastModified)) {
          stats.oldestFile = file;
        }
      }
    });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    stats.recentFiles = allFiles
      .filter(file => file.lastModified && new Date(file.lastModified) > weekAgo)
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 10);

    return stats;
  }, [items], { ttl: 2 * 60 * 1000 }); // 2 minute cache

  const searchIndex = useAdvancedMemo(() => {
    const index = new Map();
    const allItems = [...(items.folders || []), ...(items.files || [])];

    allItems.forEach((item, idx) => {
      const searchableText = [
        item.name.toLowerCase(),
        item.name.split('.').pop()?.toLowerCase() || '',
        item.type === 'folder' ? 'folder' : 'file',
        item.type
      ].join(' ');
      const ngrams = [];
      for (let i = 0; i <= searchableText.length - 2; i++) {
        ngrams.push(searchableText.substring(i, i + 2));
      }
      for (let i = 0; i <= searchableText.length - 3; i++) {
        ngrams.push(searchableText.substring(i, i + 3));
      }

      index.set(item.fullPath, {
        item,
        index: idx,
        searchableText,
        ngrams: new Set(ngrams),
        words: new Set(searchableText.split(' '))
      });
    });

    return index;
  }, [items], { ttl: 5 * 60 * 1000 }); // 5 minute cache

  const groupedItems = useAdvancedMemo(() => {
    const groups = {
      byType: {},
      bySize: {},
      byDate: {},
      byExtension: {}
    };
    const allItems = [...(items.folders || []), ...(items.files || [])];
    allItems.forEach(item => {
      const type = item.type === 'folder' ? 'folder' : 'file';
      if (!groups.byType[type]) groups.byType[type] = [];
      groups.byType[type].push(item);
      if (item.type === 'file' && item.size !== undefined) {
        let sizeCategory;
        if (item.size < 1024 * 1024) sizeCategory = 'small';
        else if (item.size < 100 * 1024 * 1024) sizeCategory = 'medium';
        else if (item.size < 1024 * 1024 * 1024) sizeCategory = 'large';
        else sizeCategory = 'huge';

        if (!groups.bySize[sizeCategory]) groups.bySize[sizeCategory] = [];
        groups.bySize[sizeCategory].push(item);
      }

      if (item.lastModified) {
        const now = new Date();
        const itemDate = new Date(item.lastModified);
        const diffHours = (now - itemDate) / (1000 * 60 * 60);

        let dateCategory;
        if (diffHours < 24) dateCategory = 'today';
        else if (diffHours < 24 * 7) dateCategory = 'thisWeek';
        else if (diffHours < 24 * 30) dateCategory = 'thisMonth';
        else dateCategory = 'older';

        if (!groups.byDate[dateCategory]) groups.byDate[dateCategory] = [];
        groups.byDate[dateCategory].push(item);
      }
      if (item.type === 'file') {
        const ext = item.name.split('.').pop()?.toLowerCase() || 'no-extension';
        if (!groups.byExtension[ext]) groups.byExtension[ext] = [];
        groups.byExtension[ext].push(item);
      }
    });

    return groups;
  }, [items], { ttl: 3 * 60 * 1000 });

  const fastSearch = useCallback((query, options = {}) => {
    const { maxResults = 50, fuzzy = true, caseSensitive = false } = options;
    if (!query.trim()) return [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const searchTerms = searchQuery.split(' ').filter(term => term.length > 0);
    const results = [];
    for (const [path, indexEntry] of searchIndex) {
      let score = 0;
      let matches = 0;

      for (const term of searchTerms) {
        if (indexEntry.words.has(term)) {
          score += 100;
          matches++;
        }
        else if (indexEntry.searchableText.includes(term)) {
          score += 50;
          matches++;
        }
        else if (fuzzy && term.length >= 2) {
          for (let i = 0; i <= term.length - 2; i++) {
            const ngram = term.substring(i, i + 2);
            if (indexEntry.ngrams.has(ngram)) {
              score += 10;
              matches++;
              break;
            }
          }
        }
      }
      if (matches === searchTerms.length) {
        results.push({
          item: indexEntry.item,
          score,
          matches: matches / searchTerms.length
        });
      }
    }
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(result => result.item);
  }, [searchIndex]);

  const sortingFunctions = useMemo(() => ({
    name: (items, order = 'asc') => {
      return [...items].sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
        return order === 'desc' ? -comparison : comparison;
      });
    },

    size: (items, order = 'asc') => {
      return [...items].sort((a, b) => {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        const comparison = sizeA - sizeB;
        return order === 'desc' ? -comparison : comparison;
      });
    },

    date: (items, order = 'asc') => {
      return [...items].sort((a, b) => {
        const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
        const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
        const comparison = dateA - dateB;
        return order === 'desc' ? -comparison : comparison;
      });
    },

    type: (items, order = 'asc') => {
      return [...items].sort((a, b) => {
        const typeA = a.type === 'folder' ? 'folder' : (a.name.split('.').pop()?.toLowerCase() || 'unknown');
        const typeB = b.type === 'folder' ? 'folder' : (b.name.split('.').pop()?.toLowerCase() || 'unknown');
        let comparison = typeA.localeCompare(typeB);
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
        }
        return order === 'desc' ? -comparison : comparison;
      });
    }
  }), []);

  const filterFunctions = useMemo(() => ({
    byType: (items, type) => {
      if (type === 'all') return items;
      if (type === 'folder') return items.filter(item => item.type === 'folder');

      const typeExtensions = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'],
        video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
        audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'],
        document: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt'],
        code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
      };

      const extensions = typeExtensions[type] || [];
      return items.filter(item => {
        if (item.type === 'folder') return false;
        const ext = item.name.split('.').pop()?.toLowerCase();
        return extensions.includes(ext);
      });
    },

    bySize: (items, sizeRange) => {
      const ranges = {
        small: [0, 1024 * 1024],
        medium: [1024 * 1024, 100 * 1024 * 1024],
        large: [100 * 1024 * 1024, 1024 * 1024 * 1024],
        huge: [1024 * 1024 * 1024, Infinity]
      };

      const [min, max] = ranges[sizeRange] || [0, Infinity];
      return items.filter(item => {
        if (item.type === 'folder') return false;
        const size = item.size || 0;
        return size >= min && size < max;
      });
    },

    byDate: (items, dateRange) => {
      const now = new Date();
      const ranges = {
        today: 24,
        thisWeek: 24 * 7,
        thisMonth: 24 * 30,
        thisYear: 24 * 365
      };

      const hours = ranges[dateRange];
      if (!hours) return items;
      const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
      return items.filter(item => {
        if (!item.lastModified) return false;
        return new Date(item.lastModified) >= cutoff;
      });
    }
  }), []);

  const performanceOperations = useMemo(() => ({
    batchProcess: (items, operation, batchSize = 100) => {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        results.push(...batch.map(operation));
      }
      return results;
    },
    processInChunks: async (items, operation, chunkSize = 50, delay = 0) => {
      const results = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(operation));
        results.push(...chunkResults);
        if (delay > 0 && i + chunkSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      return results;
    },
    createIterator: function* (items) {
      for (const item of items) {
        yield item;
      }
    }
  }), []);

  return {
    fileStats,
    searchIndex,
    groupedItems,
    fastSearch,
    sortingFunctions,
    filterFunctions,
    performanceOperations
  };
};