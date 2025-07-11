import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Upload, Plus, ArrowLeft, AlertTriangle, Trash2, Home, Search, Filter } from 'lucide-react'
import useAsyncOperation from '../../hooks/useAsyncOperation'
import LoadingSpinner from '../common/LoadingSpinner'
import FileTable from './FileTable'
import UploadModal from './UploadModal'
import NewFolderModal from '../modal/NewFolderModal'
import RenameModal from '../modal/RenameModal'
import MoveModal from './MoveModal'
import ShareModal from '../modal/ShareModal'

// shadcn-ui components
import { Button } from '../ui/button'
import { Dialog, DialogTrigger, DialogContent } from '../ui/dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb'

export const FileBrowser = React.memo(({ s3Service, onDisconnect }) => {
  // All state declarations
  const [currentPath, setCurrentPath] = useState('')
  const [items, setItems] = useState({ folders: [], files: [] })
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStats, setUploadStats] = useState({})
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [itemToRename, setItemToRename] = useState(null)
  const [itemToMove, setItemToMove] = useState(null)
  const [itemToShare, setItemToShare] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  // Loading states
  const [renameLoading, setRenameLoading] = useState(false)
  const [moveLoading, setMoveLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)

  // Main async operations hook
  const { loading, error, execute, clearError } = useAsyncOperation()

  const pathSegments = useMemo(
    () => (currentPath || '').split('/').filter(Boolean),
    [currentPath]
  )

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

  const loadItems = useCallback(async () => {
    await execute(async () => {
      const result = await s3Service.listObjects(currentPath, true)
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

  const handleFileUpload = useCallback(
    async (files) => {
      for (const file of Array.from(files)) {
        const key = currentPath + file.name
        const startTime = Date.now()
        let lastTime = startTime
        let lastLoaded = 0

        setUploadProgress((p) => ({ ...p, [file.name]: 0 }))
        setUploadStats((s) => ({
          ...s,
          [file.name]: {
            speed: 0,
            timeRemaining: 0,
            startTime,
            size: file.size
          }
        }))

        try {
          await s3Service.uploadFile(file, key, (prog, loaded = 0) => {
            const now = Date.now()
            const timeDiff = (now - lastTime) / 1000 // seconds
            const dataDiff = loaded - lastLoaded

            if (timeDiff > 0.5) { // Update every 500ms for smooth display
              const speed = dataDiff / timeDiff // bytes per second
              const totalTime = (now - startTime) / 1000
              const avgSpeed = loaded / totalTime
              const remaining = avgSpeed > 0 ? (file.size - loaded) / avgSpeed : 0

              setUploadStats((s) => ({
                ...s,
                [file.name]: {
                  ...s[file.name],
                  speed: speed,
                  timeRemaining: remaining,
                  avgSpeed: avgSpeed
                }
              }))

              lastTime = now
              lastLoaded = loaded
            }

            setUploadProgress((p) => ({ ...p, [file.name]: prog }))
          })
        } catch (e) {
          console.error('Upload error:', e)
          alert(`Upload failed: ${e.message}`)
        } finally {
          setUploadProgress((p) => {
            const { [file.name]: _, ...rest } = p
            return rest
          })
          setUploadStats((s) => {
            const { [file.name]: _, ...rest } = s
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
    setSelectedItems(new Set([...filteredItems.folders, ...filteredItems.files].map(i => i.fullPath)))

  const handleRename = useCallback(
    async (newName) => {
      if (!itemToRename) return;

      setRenameLoading(true);
      try {
        const isFolder = itemToRename.type === 'folder';

        if (isFolder) {
          const oldPath = itemToRename.fullPath;
          const parentPath = currentPath;
          const newPath = parentPath + newName + '/';
          await s3Service.renameFolder(oldPath, newPath);
        } else {
          const oldPath = itemToRename.fullPath;
          const newPath = currentPath + newName;
          await s3Service.renameObject(oldPath, newPath);
        }

        setShowRename(false);
        setItemToRename(null);
        await loadItems();
      } catch (error) {
        console.error('Rename error:', error);
        alert(`Rename failed: ${error.message}`);
      } finally {
        setRenameLoading(false);
      }
    },
    [itemToRename, currentPath, s3Service, loadItems]
  );

  const handleMove = useCallback(
    async (destinationPath) => {
      if (!itemToMove) return;

      setMoveLoading(true);
      try {
        const isFolder = itemToMove.type === 'folder';
        const sourcePath = itemToMove.fullPath;
        const newPath = destinationPath + itemToMove.name + (isFolder ? '/' : '');

        if (isFolder) {
          await s3Service.renameFolder(sourcePath, newPath);
        } else {
          await s3Service.renameObject(sourcePath, newPath);
        }

        setShowMove(false);
        setItemToMove(null);
        await loadItems();
      } catch (error) {
        console.error('Move error:', error);
        alert(`Move failed: ${error.message}`);
      } finally {
        setMoveLoading(false);
      }
    },
    [itemToMove, s3Service, loadItems]
  );

  const openMoveModal = useCallback((item) => {
    setItemToMove(item);
    setShowMove(true);
  }, []);

  const openRenameModal = useCallback((item) => {
    setItemToRename(item);
    setShowRename(true);
  }, []);

  const openShareModal = useCallback((item) => {
    setItemToShare(item);
    setShowShare(true);
  }, []);

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
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          {/* Top row - Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between">
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
              {(filteredItems.folders.length || filteredItems.files.length) > 0 && (
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

          {/* Bottom row - Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="folder">📁 Folders</option>
                <option value="image">🖼️ Images</option>
                <option value="video">🎥 Videos</option>
                <option value="audio">🎵 Audio</option>
                <option value="document">📄 Documents</option>
                <option value="pdf">📕 PDF</option>
                <option value="code">💻 Code</option>
                <option value="archive">📦 Archives</option>
                <option value="other">📎 Other</option>
              </select>
            </div>

            {/* Results info */}
            {(searchQuery || filterType !== 'all') && (
              <div className="text-sm text-muted-foreground self-center">
                {filteredItems.folders.length + filteredItems.files.length} of {items.folders.length + items.files.length} items
              </div>
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
            items={filteredItems}
            selectedItems={selectedItems}
            onToggleSelection={toggleSelection}
            onNavigateToFolder={navigateToSegment}
            onDownloadFile={downloadFile}
            onDeleteItems={deleteItems}
            onRenameItem={openRenameModal}
            onMoveItem={openMoveModal}
            onShareItem={openShareModal}
          />
        )}

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-6 bg-card rounded-lg shadow border border-border p-4">
            <h3 className="font-medium mb-3 text-foreground">
              Uploading ({Object.keys(uploadProgress).length})
            </h3>
            {Object.entries(uploadProgress).map(([name, pct]) => {
              const stats = uploadStats[name] || {}
              const formatSpeed = (bytesPerSec) => {
                if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
                if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
                return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
              }
              const formatTime = (seconds) => {
                if (seconds < 60) return `${seconds.toFixed(0)}s`
                if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
                return `${(seconds / 3600).toFixed(1)}h`
              }

              return (
                <div key={name} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span className="truncate flex-1 mr-2">{name}</span>
                    <div className="flex items-center space-x-3 text-xs">
                      {stats.speed > 0 && (
                        <span className="text-primary">{formatSpeed(stats.avgSpeed || stats.speed)}</span>
                      )}
                      <span>{pct}%</span>
                      {stats.timeRemaining > 0 && pct < 100 && (
                        <span className="text-chart-1">{formatTime(stats.timeRemaining)} left</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div
                      className="bg-primary h-full rounded transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {stats.size && (
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{((stats.size * pct) / 100 / 1024 / 1024).toFixed(1)} MB of {(stats.size / 1024 / 1024).toFixed(1)} MB</span>
                      {pct === 100 && <span className="text-green-600">✓ Complete</span>}
                    </div>
                  )}
                </div>
              )
            })}
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

      <ShareModal
        isOpen={showShare}
        onClose={() => {
          setShowShare(false);
          setItemToShare(null);
        }}
        item={itemToShare}
        s3Service={s3Service}
        isGenerating={shareLoading}
      />

      <MoveModal
        isOpen={showMove}
        onClose={() => {
          setShowMove(false);
          setItemToMove(null);
        }}
        onMove={handleMove}
        item={itemToMove}
        s3Service={s3Service}
        currentPath={currentPath}
        isMoving={moveLoading}
      />

      <RenameModal
        isOpen={showRename}
        onClose={() => {
          setShowRename(false);
          setItemToRename(null);
        }}
        onRename={handleRename}
        item={itemToRename}
        currentPath={currentPath}
        isRenaming={renameLoading}
      />
    </div>
  )
})