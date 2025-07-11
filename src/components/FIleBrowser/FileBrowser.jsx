// components/FileBrowser/FileBrowser.jsx - Fixed with proper imports
import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, Plus, ArrowLeft, AlertTriangle, Trash2, Home,
  Search, Filter, RefreshCw, ArrowUp, ArrowDown
} from 'lucide-react';

// Hooks
import useAsyncOperation from '../../hooks/useAsyncOperation';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFilteredItems } from '../../hooks/useFilteredItems';
import { useSelection } from '../../hooks/useSelection';
import { useNavigation } from '../../hooks/useNavigation';
import { useFolderOperations } from '../../hooks/useFolderOperations';

// Components
import LoadingSpinner from '../common/LoadingSpinner';
import FileTable from './FileTable';
import UploadModal from './UploadModal'; // Using the enhanced UploadModal
import NewFolderModal from '../modal/NewFolderModal';
import RenameModal from '../modal/RenameModal';
import MoveModal from './MoveModal';
import ShareModal from '../modal/ShareModal';

// UI Components
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbSeparator
} from '../ui/breadcrumb';
import { Badge } from '../ui/badge';

export const FileBrowser = React.memo(({ s3Service, onDisconnect }) => {
  // Core data state
  const [items, setItems] = useState({ folders: [], files: [] });

  // Main async operations
  const { loading, error, execute, clearError } = useAsyncOperation();

  // Navigation hook
  const {
    currentPath,
    pathSegments,
    breadcrumbs,
    navigateToRoot,
    navigateToSegment,
    navigateUp,
    canGoBack,
    canGoForward,
    goBack,
    goForward
  } = useNavigation();

  // Selection hook
  const {
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    selectionInfo
  } = useSelection();

  // Filtering and search hook
  const {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filteredItems,
    clearFilters,
    getFilteredCount
  } = useFilteredItems(items);

  // Load items function - MOVED BEFORE hooks that depend on it
  const loadItems = useCallback(async () => {
    await execute(async () => {
      const result = await s3Service.listObjects(currentPath, true);
      setItems(result);
      clearSelection();
    });
  }, [currentPath, s3Service, execute, clearSelection]);

  // File upload hook - NOW can use loadItems safely
  const {
    showUpload,
    setShowUpload,
    uploadProgress,
    uploadStats,
    isUploading,
    handleFileUpload,
    cancelUpload,
    cancelAllUploads
  } = useFileUpload(s3Service, currentPath, loadItems);

  // Folder operations hook - NOW can use loadItems safely
  const {
    showNewFolder,
    showRename,
    showMove,
    showShare,
    itemToRename,
    itemToMove,
    itemToShare,
    operationLoading,
    createFolder,
    handleRename,
    handleMove,
    deleteItems,
    downloadFile,
    openRenameModal,
    closeRenameModal,
    openMoveModal,
    closeMoveModal,
    openShareModal,
    closeShareModal,
    openNewFolderModal,
    closeNewFolderModal
  } = useFolderOperations(s3Service, currentPath, loadItems);

  // Load items when path changes
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Listen for refresh events from header
  useEffect(() => {
    const handleRefresh = () => {
      loadItems();
    };
    window.addEventListener('refreshFiles', handleRefresh);
    return () => window.removeEventListener('refreshFiles', handleRefresh);
  }, [loadItems]);

  // Enhanced delete with better UX
  const handleDelete = useCallback(async (keys) => {
    await execute(async () => {
      await deleteItems(keys, selectedItems);
    });
  }, [execute, deleteItems, selectedItems]);

  // Enhanced folder creation
  const handleCreateFolder = useCallback(async (folderName) => {
    await execute(async () => {
      await createFolder(folderName);
    });
  }, [execute, createFolder]);

  // Sort toggle function
  // const toggleSort = useCallback((field) => {
  //   if (sortBy === field) {
  //     setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortBy(field);
  //     setSortOrder('asc');
  //   }
  // }, [sortBy, setSortBy, setSortOrder]);

  // Get filter count info
  const filterCount = getFilteredCount();
  const isFiltered = searchQuery || filterType !== 'all';

  return (
    <div className="bg-background">
      {/* Breadcrumb Navigation */}
      <div className="bg-card border-b border-border py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => index === 0 ? navigateToRoot() : navigateToSegment(crumb.path)}
                        className="flex items-center gap-2 hover:text-foreground cursor-pointer"
                      >
                        {index === 0 && <Home className="w-4 h-4" />}
                        {crumb.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Navigation controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={!canGoBack}
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goForward}
                disabled={!canGoForward}
                title="Go forward"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadItems}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
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
              <Button onClick={() => setShowUpload(true)} size="sm" disabled={isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
              <Button
                variant="secondary"
                onClick={openNewFolderModal}
                size="sm"
                disabled={operationLoading.create}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filterCount.filtered > 0 && (
                <>
                  <Button
                    variant="link"
                    onClick={() => selectAll(filteredItems)}
                    size="sm"
                  >
                    Select All ({filterCount.filtered})
                  </Button>
                  {selectionInfo.count > 0 && (
                    <Button variant="link" onClick={clearSelection} size="sm">
                      Clear Selection
                    </Button>
                  )}
                </>
              )}
              {selectionInfo.count > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => handleDelete()}
                  size="sm"
                  disabled={operationLoading.delete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectionInfo.count})
                </Button>
              )}
            </div>
          </div>

          {/* Bottom row - Search, Filter, and Sort */}
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

            {/* Sort */}
            {/* Sort - Updated to match filter dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[120px]"
              >
                <option value="name-asc">Name ↑</option>
                <option value="name-desc">Name ↓</option>
                <option value="size-asc">Size ↑</option>
                <option value="size-desc">Size ↓</option>
                <option value="date-asc">Date ↑</option>
                <option value="date-desc">Date ↓</option>
              </select>
            </div>

            {/* Clear filters */}
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}

            {/* Results info */}
            {isFiltered && (
              <div className="text-sm text-muted-foreground self-center">
                {filterCount.filtered} of {filterCount.total} items
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

      {/* Selection info */}
      {selectionInfo.count > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
            {selectionInfo.count} item{selectionInfo.count !== 1 ? 's' : ''} selected
          </Badge>
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
            onDeleteItems={handleDelete}
            onRenameItem={openRenameModal}
            onMoveItem={openMoveModal}
            onShareItem={openShareModal}
          />
        )}
      </main>

      {/* Enhanced Upload Modal with Progress */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleFileUpload}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadStats={uploadStats}
        onCancelUpload={cancelUpload}
        onCancelAllUploads={cancelAllUploads}
      />

      {/* Other Modals with proper accessibility */}
      <Dialog open={showNewFolder} onOpenChange={closeNewFolderModal}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <NewFolderModal
            isOpen={showNewFolder}
            onClose={closeNewFolderModal}
            onCreateFolder={handleCreateFolder}
            isCreating={operationLoading.create}
          />
        </DialogContent>
      </Dialog>

      <ShareModal
        isOpen={showShare}
        onClose={closeShareModal}
        item={itemToShare}
        s3Service={s3Service}
        isGenerating={operationLoading.share}
      />

      <MoveModal
        isOpen={showMove}
        onClose={closeMoveModal}
        onMove={handleMove}
        item={itemToMove}
        s3Service={s3Service}
        currentPath={currentPath}
        isMoving={operationLoading.move}
      />

      <RenameModal
        isOpen={showRename}
        onClose={closeRenameModal}
        onRename={handleRename}
        item={itemToRename}
        currentPath={currentPath}
        isRenaming={operationLoading.rename}
      />
    </div>
  );
});

export default FileBrowser;