import { useState } from 'react'

export const useSelection = () => {
  const [selectedItems, setSelectedItems] = useState(new Set())

  const toggleSelection = (path) =>
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const selectAll = (items) => {
    const allPaths = [...items.folders, ...items.files].map(i => i.fullPath)
    setSelectedItems(new Set(allPaths))
  }

  const clearSelection = () => setSelectedItems(new Set())

  const resetSelection = () => setSelectedItems(new Set())

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    resetSelection
  }
}