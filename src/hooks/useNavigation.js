// hooks/useNavigation.js
import { useState, useMemo, useCallback } from 'react';

export const useNavigation = (initialPath = '') => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [history, setHistory] = useState([initialPath]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pathSegments = useMemo(() => {
    return (currentPath || '').split('/').filter(Boolean);
  }, [currentPath]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ name: 'Home', path: '' }];

    pathSegments.forEach((segment, index) => {
      const path = pathSegments.slice(0, index + 1).join('/') + '/';
      crumbs.push({ name: segment, path });
    });

    return crumbs;
  }, [pathSegments]);

  const addToHistory = useCallback((path) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(path);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const navigateTo = useCallback((path) => {
    const cleanPath = path === '' ? '' : (path.endsWith('/') ? path : `${path}/`);

    if (cleanPath !== currentPath) {
      addToHistory(cleanPath);
      setCurrentPath(cleanPath);
    }
  }, [currentPath, addToHistory]);

  const navigateToRoot = useCallback(() => {
    navigateTo('');
  }, [navigateTo]);

  const navigateToSegment = useCallback((segmentIndex) => {
    if (typeof segmentIndex === 'number') {
      const newPath = pathSegments.slice(0, segmentIndex + 1).join('/') + '/';
      navigateTo(newPath);
    } else {
      navigateTo(segmentIndex);
    }
  }, [pathSegments, navigateTo]);

  const navigateUp = useCallback(() => {
    if (pathSegments.length === 0) return;

    const parentPath = pathSegments.slice(0, -1).join('/');
    const cleanParentPath = parentPath ? `${parentPath}/` : '';
    navigateTo(cleanParentPath);
  }, [pathSegments, navigateTo]);

  const canGoBack = useMemo(() => historyIndex > 0, [historyIndex]);
  const canGoForward = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
    }
  }, [canGoBack, historyIndex, history]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentPath(history[newIndex]);
    }
  }, [canGoForward, historyIndex, history]);

  return {
    currentPath,
    setCurrentPath,
    pathSegments,
    breadcrumbs,
    navigateTo,
    navigateToRoot,
    navigateToSegment,
    navigateUp,
    canGoBack,
    canGoForward,
    goBack,
    goForward
  };
};