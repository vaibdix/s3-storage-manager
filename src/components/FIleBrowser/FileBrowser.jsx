// components/FileBrowser/FileBrowser.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, Plus, ArrowLeft, AlertTriangle, Trash2, Home, Search, Filter, RefreshCw, GripVertical, SlidersHorizontal
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
// import FileTable from './FileTable';
import VirtualizedFileTable from './VirtualizedFileTable';

import UploadModal from './UploadModal';
import NewFolderModal from '../modal/NewFolderModal';
import RenameModal from '../modal/RenameModal';
import MoveModal from './MoveModal';
import ShareModal from '../modal/ShareModal';

// UI Components
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '../ui/breadcrumb';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';

export const FileBrowser = React.memo(({ s3Service, onDisconnect }) => {
  const [items, setItems] = useState({ folders: [], files: [] });
  const { toast } = useToast();
  const { loading, error, execute, clearError } = useAsyncOperation();
  const { currentPath, pathSegments, breadcrumbs, navigateToRoot, navigateToSegment, navigateUp, canGoBack, canGoForward, goBack, goForward } = useNavigation();

  const { selectedItems, toggleSelection, selectAll, clearSelection, selectionInfo, selectionOptions, handleSelectionChange, getCurrentSelectionType } = useSelection();

  const { searchQuery, setSearchQuery, filterType, setFilterType, sortBy, setSortBy, sortOrder, setSortOrder, filteredItems, clearFilters, getFilteredCount, filterOptions, sortOptions, getCurrentSortValue, handleSortChange, applyQuickFilter, quickFilterOptions } = useFilteredItems(items);

  const loadItems = useCallback(async () => {
    await execute(async () => {
      try {
        const result = await s3Service.listObjects(currentPath, true);
        setItems(result);
        clearSelection();
        const totalItems = (result.folders?.length || 0) + (result.files?.length || 0);
        if (totalItems === 0 && currentPath === '') {
          toast({
            title: "Folder Empty",
            description: "This S3 bucket is empty. Upload some files to get started!",
          });
        }

      } catch (error) {
        console.error('Failed to load items:', error);
        toast({
          title: "Failed to Load Files",
          description: error.message || "Could not load folder contents. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    });
  }, [currentPath, s3Service, execute, clearSelection, toast]);

  const { showUpload, setShowUpload, uploadProgress, uploadStats, isUploading, handleFileUpload: originalHandleFileUpload,
    cancelUpload, cancelAllUploads, getUploadStats } = useFileUpload(s3Service, currentPath, loadItems);
  const handleFileUpload = useCallback(async (files) => {
    try {
      const fileCount = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      toast({
        title: "Upload Started",
        description: `Uploading ${fileCount} file${fileCount !== 1 ? 's' : ''} (${(totalSize / 1024 / 1024).toFixed(1)} MB)`,
      });
      await originalHandleFileUpload(files);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    }
  }, [originalHandleFileUpload, toast]);

  const { showNewFolder, showRename, showMove, showShare, itemToRename, itemToMove, itemToShare, operationLoading, createFolder: originalCreateFolder, handleRename: originalHandleRename, handleMove: originalHandleMove, deleteItems: originalDeleteItems, downloadFile, openRenameModal, closeRenameModal, openMoveModal, closeMoveModal, openShareModal, closeShareModal, openNewFolderModal, closeNewFolderModal } = useFolderOperations(s3Service, currentPath, loadItems);

  const createFolder = useCallback(async (folderName) => {
    try {
      await originalCreateFolder(folderName);
      toast({
        title: "Folder Created",
        description: `Successfully created folder "${folderName}"`,
        variant: "success",
      });
    } catch (error) {
      console.error('Create folder error:', error);
      toast({
        title: "Failed to Create Folder",
        description: error.message || "Could not create folder. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [originalCreateFolder, toast]);

  const handleRename = useCallback(async (newName) => {
    try {
      const isFolder = itemToRename?.type === 'folder';
      const oldName = itemToRename?.name;
      await originalHandleRename(newName);
      toast({
        title: `${isFolder ? 'Folder' : 'File'} Renamed`,
        description: `Successfully renamed "${oldName}" to "${newName}"`,
        variant: "success",
      });
    } catch (error) {
      console.error('Rename error:', error);
      toast({
        title: "Rename Failed",
        description: error.message || "Could not rename item. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [originalHandleRename, itemToRename, toast]);

  const handleMove = useCallback(async (destinationPath) => {
    try {
      const isFolder = itemToMove?.type === 'folder';
      const itemName = itemToMove?.name;
      await originalHandleMove(destinationPath);
      const destName = destinationPath === '' ? 'root folder' : destinationPath.replace(/\/$/, '');
      toast({
        title: `${isFolder ? 'Folder' : 'File'} Moved`,
        description: `Successfully moved "${itemName}" to ${destName}`,
        variant: "success",
      });
    } catch (error) {
      console.error('Move error:', error);
      toast({
        title: "Move Failed",
        description: error.message || "Could not move item. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [originalHandleMove, itemToMove, toast]);

  const handleDelete = useCallback(async (keys) => {
    try {
      const toDelete = keys ?? Array.from(selectedItems);
      if (toDelete.length === 0) return;
      await execute(async () => {
        await originalDeleteItems(toDelete, selectedItems);
        toast({
          title: "Items Deleted",
          description: `Successfully deleted ${toDelete.length} item${toDelete.length !== 1 ? 's' : ''}`,
          variant: "success",
        });
      });

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete items. Please try again.",
        variant: "destructive",
      });
    }
  }, [execute, originalDeleteItems, selectedItems, toast]);

  const handleDownload = useCallback((item) => {
    try {
      downloadFile(item);
      toast({
        title: "Download Started",
        description: `Downloading "${item.name}"`,
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Could not start download. Please try again.",
        variant: "destructive",
      });
    }
  }, [downloadFile, toast]);
  useEffect(() => {
    loadItems();
  }, [loadItems]);
  useEffect(() => {
    const handleRefresh = () => {
      loadItems();
    };
    window.addEventListener('refreshFiles', handleRefresh);
    return () => window.removeEventListener('refreshFiles', handleRefresh);
  }, [loadItems]);
  useEffect(() => {
    if (!isUploading && Object.keys(uploadProgress).length > 0) {
      const stats = getUploadStats();
      if (stats.completed > 0 && stats.failed === 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${stats.completed} file${stats.completed !== 1 ? 's' : ''}`,
          variant: "success",
        });
      } else if (stats.failed > 0) {
        toast({
          title: "Upload Issues",
          description: `${stats.completed} succeeded, ${stats.failed} failed`,
          variant: "warning",
        });
      }
    }
  }, [isUploading, uploadProgress, getUploadStats, toast]);
  const filterCount = getFilteredCount();
  const isFiltered = searchQuery || filterType !== 'all';

  return (
    <div className="bg-background">
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

      <div className="bg-card border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
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
                <Select
                  value={getCurrentSelectionType(filteredItems)}
                  onValueChange={(value) => handleSelectionChange(value, filteredItems)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectionOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <Select
                value={getCurrentSortValue()}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <Select onValueChange={applyQuickFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Quick filters" />
                </SelectTrigger>
                <SelectContent>
                  {quickFilterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFiltered && (
              <Button variant="outline" size="default" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            {isFiltered && (
              <div className="text-sm text-muted-foreground self-center whitespace-nowrap">
                {filterCount.filtered} of {filterCount.total} items
              </div>
            )}
          </div>
        </div>
      </div>

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

      {selectionInfo.count > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
            {selectionInfo.count} item{selectionInfo.count !== 1 ? 's' : ''} selected
          </Badge>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <LoadingSpinner centered message="Loading files..." />
        ) : (
          <VirtualizedFileTable
            items={filteredItems}
            selectedItems={selectedItems}
            onToggleSelection={toggleSelection}
            onNavigateToFolder={navigateToSegment}
            onDownloadFile={handleDownload}
            onDeleteItems={handleDelete}
            onRenameItem={openRenameModal}
            onMoveItem={openMoveModal}
            onShareItem={openShareModal}
            s3Service={s3Service}
          />
        )}
      </main>

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
            onCreateFolder={createFolder}
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