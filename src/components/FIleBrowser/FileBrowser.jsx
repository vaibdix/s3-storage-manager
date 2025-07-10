import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Upload, Plus, ArrowLeft, AlertTriangle, Trash2, Home } from 'lucide-react'
import useAsyncOperation from '../../hooks/useAsyncOperation'
import LoadingSpinner from '../common/LoadingSpinner'
import FileTable from './FileTable'
import UploadModal from './UploadModal'
import NewFolderModal from './NewFolderModal'

// shadcn-ui components
import { Button } from '../ui/button'
import { Dialog, DialogTrigger, DialogContent } from '../ui/dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb'

export const FileBrowser = React.memo(({ s3Service, onDisconnect }) => {
  const [currentPath, setCurrentPath] = useState('')
  const [items, setItems] = useState({ folders: [], files: [] })
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [showNewFolder, setShowNewFolder] = useState(false)
  const { loading, error, execute, clearError } = useAsyncOperation()

  const pathSegments = useMemo(
    () => (currentPath || '').split('/').filter(Boolean),
    [currentPath]
  )

  const loadItems = useCallback(async () => {
    console.log('Loading items for path:', currentPath)
    await execute(async () => {
      const result = await s3Service.listObjects(currentPath, true) // Always fetch folder metadata
      console.log('Received items:', result)
      setItems(result)
      setSelectedItems(new Set())
    })
  }, [currentPath, s3Service, execute])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Listen for refresh events from the header
  useEffect(() => {
    const handleRefresh = () => {
      loadItems()
    }
    window.addEventListener('refreshFiles', handleRefresh)
    return () => window.removeEventListener('refreshFiles', handleRefresh)
  }, [loadItems])

  const navigateToRoot = () => setCurrentPath('')

  // Fix: Navigate to specific segment with proper path construction
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

  const handleFileUpload = useCallback(
    async (files) => {
      for (const file of Array.from(files)) {
        // Fix: Ensure proper path construction for uploads
        const key = currentPath + file.name
        setUploadProgress((p) => ({ ...p, [file.name]: 0 }))
        try {
          await s3Service.uploadFile(file, key, (prog) =>
            setUploadProgress((p) => ({ ...p, [file.name]: prog }))
          )
        } catch (e) {
          console.error('Upload error:', e)
          alert(`Upload failed: ${e.message}`)
        } finally {
          setUploadProgress((p) => {
            const { [file.name]: _, ...rest } = p
            return rest
          })
        }
      }
      await loadItems()
      setShowUpload(false)
    },
    [currentPath, s3Service, loadItems]
  )

  const createFolder = useCallback(
    async (folderName) => {
      await execute(async () => {
        // Fix: Ensure proper folder path construction
        const folderPath = currentPath + folderName.trim() + '/'
        await s3Service.createFolder(folderPath)
        setShowNewFolder(false)
        await loadItems()
      })
    },
    [currentPath, s3Service, execute, loadItems]
  )

  const deleteItems = useCallback(
    async (keys) => {
      const toDelete = keys ?? Array.from(selectedItems)
      if (toDelete.length === 0) return
      if (
        !window.confirm(
          `Delete ${toDelete.length} item${toDelete.length > 1 ? 's' : ''
          }?`
        )
      )
        return
      await execute(async () => {
        await s3Service.deleteObjects(toDelete)
        await loadItems()
      })
    },
    [selectedItems, s3Service, execute, loadItems]
  )

  const downloadFile = useCallback(
    (item) => {
      try {
        const url = s3Service.getDownloadUrl(item.fullPath)
        const a = document.createElement('a')
        a.href = url
        a.download = item.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (error) {
        console.error('Download error:', error)
        alert(`Download failed: ${error.message}`)
      }
    },
    [s3Service]
  )

  const toggleSelection = (path) =>
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const selectAll = () =>
    setSelectedItems(new Set([...items.folders, ...items.files].map(i => i.fullPath)))

  const clearSelection = () => setSelectedItems(new Set())

  return (
    <div className="bg-background">
      {/* Breadcrumb Navigation */}
      <div className="bg-card border-b border-border py-3">
        <div className="max-w-7xl mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={navigateToRoot}
                  className="flex items-center gap-2 hover:text-foreground cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              {pathSegments.map((seg, i) => (
                <React.Fragment key={i}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => navigateToSegment(i)}
                      className="hover:text-foreground cursor-pointer"
                    >
                      {seg}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row gap-4 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {currentPath && (
              <Button onClick={navigateUp} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button onClick={() => setShowUpload(true)} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
            <Button variant="secondary" onClick={() => setShowNewFolder(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(items.folders.length || items.files.length) > 0 && (
              <>
                <Button variant="link" onClick={selectAll} size="sm">
                  Select All
                </Button>
                {selectedItems.size > 0 && (
                  <Button variant="link" onClick={clearSelection} size="sm">
                    Clear Selection
                  </Button>
                )}
              </>
            )}
            {selectedItems.size > 0 && (
              <Button variant="destructive" onClick={() => deleteItems()} size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedItems.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-destructive mr-2" />
                <div>
                  <h3 className="text-destructive font-medium">Error</h3>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={clearError} size="sm">
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <LoadingSpinner centered message="Loading files..." />
        ) : (
          <FileTable
            items={items}
            selectedItems={selectedItems}
            onToggleSelection={toggleSelection}
            onNavigateToFolder={navigateToSegment}
            onDownloadFile={downloadFile}
            onDeleteItems={deleteItems}
          />
        )}

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-6 bg-card rounded-lg shadow border border-border p-4">
            <h3 className="font-medium mb-3 text-foreground">
              Uploading ({Object.keys(uploadProgress).length})
            </h3>
            {Object.entries(uploadProgress).map(([name, pct]) => (
              <div key={name} className="mb-2">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span className="truncate">{name}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div
                    className="bg-primary h-full rounded transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <UploadModal
            isOpen={showUpload}
            onClose={() => setShowUpload(false)}
            onUpload={handleFileUpload}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <NewFolderModal
            isOpen={showNewFolder}
            onClose={() => setShowNewFolder(false)}
            onCreateFolder={createFolder}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
})