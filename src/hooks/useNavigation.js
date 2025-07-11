import { useState, useMemo } from 'react'

export const useNavigation = () => {
  const [currentPath, setCurrentPath] = useState('')

  const pathSegments = useMemo(
    () => (currentPath || '').split('/').filter(Boolean),
    [currentPath]
  )

  const navigateToRoot = () => setCurrentPath('')

  // Navigate to specific segment with proper path construction
  const navigateToSegment = (index) => {
    if (typeof index === 'number') {
      // Navigating via breadcrumb segment
      const newPath = pathSegments.slice(0, index + 1).join('/') + '/'
      setCurrentPath(newPath)
    } else {
      // Navigating to a folder - index is actually the folder path
      const folderPath = index
      setCurrentPath(folderPath)
    }
  }

  const navigateUp = () => {
    const parent = pathSegments.slice(0, -1).join('/')
    setCurrentPath(parent ? `${parent}/` : '')
  }

  return {
    currentPath,
    setCurrentPath,
    pathSegments,
    navigateToRoot,
    navigateToSegment,
    navigateUp
  }
}