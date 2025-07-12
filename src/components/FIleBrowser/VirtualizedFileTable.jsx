// components/FileBrowser/VirtualizedFileTable.jsx
import React, { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { FixedSizeList as List } from 'react-window';
import {
  Download, Eye, Folder, Trash2, MoreHorizontal, FileText, Image, Archive, Music, Video, Code, FileIcon, Loader2, Edit2, Move, Copy, Share2, GripVertical
} from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { formatDate, formatBytes } from "../../lib/utils";
import FilePreviewModal from "../preview/FilePreviewModal";

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 45;
const OVERSCAN_COUNT = 10; // Number of items to render outside viewport

const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const iconMap = {
    jpg: Image, jpeg: Image, png: Image, gif: Image, svg: Image, webp: Image, bmp: Image, ico: Image, tiff: Image,
    pdf: FileText, doc: FileText, docx: FileText, txt: FileText, md: FileText, rtf: FileText, odt: FileText,
    zip: Archive, rar: Archive, '7z': Archive, tar: Archive, gz: Archive, bz2: Archive, xz: Archive,
    mp3: Music, wav: Music, flac: Music, aac: Music, ogg: Music, wma: Music, m4a: Music, opus: Music,
    mp4: Video, avi: Video, mkv: Video, mov: Video, wmv: Video, flv: Video, webm: Video, m4v: Video, '3gp': Video,
    js: Code, jsx: Code, ts: Code, tsx: Code, html: Code, css: Code, py: Code, java: Code, cpp: Code, c: Code, php: Code, rb: Code, go: Code, rs: Code, swift: Code, json: Code, xml: Code, yml: Code, yaml: Code,
  };
  return iconMap[extension] || FileIcon;
};

const canPreviewFile = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const previewableExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff',
    'pdf', 'txt', 'md', 'rtf',
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'swift', 'json', 'xml', 'yml', 'yaml',
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp',
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'
  ];
  return previewableExtensions.includes(ext);
};

const FileRow = React.memo(({
  index,
  style,
  data
}) => {
  const {
    items,
    selectedItems,
    onToggleSelection,
    onNavigateToFolder,
    onDownloadFile,
    onDeleteItems,
    onRenameItem,
    onMoveItem,
    onShareItem,
    onPreviewClick,
    focusedIndex,
    setFocusedIndex
  } = data;

  const item = items[index];
  if (!item) return null;

  const isSelected = selectedItems.has(item.fullPath);
  const isFolder = item.type === "folder";
  const IconComponent = isFolder ? Folder : getFileIcon(item.name);
  const isFocused = focusedIndex === index;
  const canPreview = !isFolder && canPreviewFile(item.name);

  const handleClick = useCallback((e) => {
    if (e.target.closest("button") || e.target.closest("[role='checkbox']") || e.target.closest(".drag-handle")) return;
    setFocusedIndex(index);
    if (isFolder) {
      onNavigateToFolder(item.fullPath);
    } else if (canPreview) {
      onPreviewClick(item);
    } else {
      onDownloadFile(item);
    }
  }, [index, isFolder, item, canPreview, onNavigateToFolder, onPreviewClick, onDownloadFile, setFocusedIndex]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  }, [handleClick]);

  return (
    <div
      style={{
        ...style,
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
      className={`
        flex items-center border-b border-border/50 hover:bg-muted/40 transition-colors virtual-item
        ${isFocused ? 'bg-muted/60 ring-2 ring-primary/50' : ''}
        ${isSelected ? 'bg-primary/5' : ''}
        ${item.optimistic ? 'optimistic-item' : ''}
        ${item.optimistic && item.uploading ? 'pending' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-label={`${isFolder ? "Folder" : "File"}: ${item.name}`}
      data-selected={isSelected}
      data-focused={isFocused}
    >
      {/* Drag Handle */}
      <div className="w-8 flex justify-center">
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 transition-colors">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Selection Checkbox */}
      <div className="w-12 flex justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(item.fullPath)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${item.name}`}
        />
      </div>

      {/* Name Column - takes most space */}
      <div className="flex-1 min-w-0 py-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            <IconComponent
              className={`w-6 h-6 transition-colors ${isFolder ? "text-primary" : "text-muted-foreground"
                }`}
            />
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <p
                className={`text-sm font-medium truncate transition-colors ${isFolder ? "text-primary" : "text-foreground"
                  }`}
                title={item.name}
              >
                {item.name}
              </p>
              {item.optimistic && (
                <Badge variant="outline" className="text-xs">
                  {item.uploading ? 'Uploading...' : 'Pending'}
                </Badge>
              )}
            </div>
            {!isFolder && (
              <div className="flex items-center space-x-2">
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.name.split('.').pop()?.toUpperCase() || 'File'}
                </p>
                {item.uploading && item.uploadProgress !== undefined && (
                  <div className="flex items-center space-x-1">
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${item.uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.uploadProgress}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-24 text-sm text-muted-foreground font-mono text-right">
        {isFolder ? (
          item.loading ? (
            <div className="flex items-center justify-end">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : item.size !== null && item.size !== undefined ? (
            <div>
              <div>{formatBytes(item.size)}</div>
              {item.fileCount !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {item.fileCount} file{item.fileCount !== 1 ? 's' : ''}
                  {item.hasMore && '+'}
                </div>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">—</Badge>
          )
        ) : (
          formatBytes(item.size)
        )}
      </div>

      <div className="w-40 text-sm text-muted-foreground text-right">
        {isFolder ? (
          item.loading ? (
            <div className="flex items-center justify-end">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : item.lastModified ? (
            formatDate(item.lastModified)
          ) : (
            <Badge variant="outline" className="text-xs">—</Badge>
          )
        ) : (
          formatDate(item.lastModified)
        )}
      </div>

      <div className="w-32 flex items-center justify-end space-x-1">
        {isFolder ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToFolder(item.fullPath);
            }}
            className="h-8 w-8 p-0 hover:bg-primary/10"
            title={`Open ${item.name}`}
          >
            <Eye className="w-4 h-4 text-primary" />
          </Button>
        ) : canPreview ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewClick(item);
            }}
            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            title={`Preview ${item.name}`}
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadFile(item);
            }}
            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
            title={`Download ${item.name}`}
          >
            <Download className="w-4 h-4 text-green-600" />
          </Button>
        )}

        {!isFolder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadFile(item);
            }}
            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
            title={`Download ${item.name}`}
          >
            <Download className="w-4 h-4 text-green-600" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 p-0 hover:bg-muted"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isFolder && canPreview && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewClick(item);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {!isFolder && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadFile(item);
                }}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRenameItem?.(item);
              }}
              className="flex items-center space-x-2"
              disabled={item.optimistic}
            >
              <Edit2 className="w-4 h-4" />
              <span>Rename</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMoveItem?.(item);
              }}
              className="flex items-center space-x-2"
              disabled={item.optimistic}
            >
              <Move className="w-4 h-4" />
              <span>Move</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShareItem?.(item);
              }}
              className="flex items-center space-x-2"
              disabled={item.optimistic}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(item.fullPath);
              }}
              className="flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Path</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItems([item.fullPath]);
              }}
              className="flex items-center space-x-2 text-destructive"
              disabled={item.optimistic}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

const BulkActionsBar = React.memo(({ selectedItems, onBulkAction }) => {
  const [bulkAction, setBulkAction] = useState('');
  const handleBulkAction = useCallback((action) => {
    onBulkAction(action);
    setBulkAction('');
  }, [onBulkAction]);
  if (selectedItems.size === 0) return null;
  return (
    <div className="bg-muted/20 border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
            {selectedItems.size} selected
          </Badge>
          <span className="text-sm text-muted-foreground">
            Bulk actions:
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={bulkAction} onValueChange={handleBulkAction}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Choose action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="download">📥 Download All</SelectItem>
              <SelectItem value="move">📁 Move All</SelectItem>
              <SelectItem value="delete">🗑️ Delete All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});

BulkActionsBar.displayName = 'BulkActionsBar';

const TableHeader = React.memo(({
  selectedItems,
  allItems,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort
}) => {
  const allSelected = selectedItems.size === allItems.length && allItems.length > 0;
  const someSelected = selectedItems.size > 0 && selectedItems.size < allItems.length;

  return (
    <div
      className="flex items-center bg-muted/30 border-b border-border px-4 sticky top-0 z-10"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="w-8 flex justify-center">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="w-12 flex justify-center">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          onCheckedChange={onSelectAll}
          aria-label="Select all items"
        />
      </div>
      <div className="flex-1 font-semibold text-foreground">
        <Button
          variant="ghost"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => onSort('name')}
        >
          Name
          {sortBy === 'name' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </Button>
      </div>

      <div className="w-24 text-right">
        <Button
          variant="ghost"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => onSort('size')}
        >
          Size
          {sortBy === 'size' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </Button>
      </div>

      <div className="w-40 text-right">
        <Button
          variant="ghost"
          className="h-auto p-0 font-semibold hover:bg-transparent"
          onClick={() => onSort('date')}
        >
          Modified
          {sortBy === 'date' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </Button>
      </div>

      <div className="w-32 text-center font-semibold text-foreground">
        Actions
      </div>
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

function VirtualizedFileTable({
  items,
  selectedItems,
  onToggleSelection,
  onNavigateToFolder,
  onDownloadFile,
  onDeleteItems,
  onRenameItem,
  onMoveItem,
  onShareItem,
  s3Service,
  sortBy,
  sortOrder,
  onSort
}) {
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const allItems = useMemo(() => {
    return [...(items.folders || []), ...(items.files || [])];
  }, [items.folders, items.files]);

  const handlePreviewClick = useCallback((item) => {
    setPreviewFile(item);
    setShowPreview(true);
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      allItems.forEach(item => onToggleSelection(item.fullPath));
    } else {
      allItems.forEach(item => {
        if (selectedItems.has(item.fullPath)) {
          onToggleSelection(item.fullPath);
        }
      });
    }
  }, [allItems, onToggleSelection, selectedItems]);

  const handleBulkAction = useCallback((action) => {
    const selectedPaths = Array.from(selectedItems);
    if (selectedPaths.length === 0) return;

    switch (action) {
      case 'download':
        allItems.filter(item => selectedItems.has(item.fullPath) && item.type === 'file')
          .forEach(file => onDownloadFile(file));
        break;
      case 'delete':
        onDeleteItems(selectedPaths);
        break;
      case 'move':
        const firstSelected = allItems.find(item => selectedItems.has(item.fullPath));
        if (firstSelected) onMoveItem(firstSelected);
        break;
      default:
        break;
    }
  }, [selectedItems, allItems, onDownloadFile, onDeleteItems, onMoveItem]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!allItems.length || !containerRef.current?.contains(document.activeElement)) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => {
            const newIndex = Math.min(prev + 1, allItems.length - 1);
            if (listRef.current) {
              listRef.current.scrollToItem(newIndex, 'smart');
            }
            return newIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => {
            const newIndex = Math.max(prev - 1, 0);
            if (listRef.current) {
              listRef.current.scrollToItem(newIndex, 'smart');
            }
            return newIndex;
          });
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          if (listRef.current) {
            listRef.current.scrollToItem(0, 'start');
          }
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(allItems.length - 1);
          if (listRef.current) {
            listRef.current.scrollToItem(allItems.length - 1, 'end');
          }
          break;
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allItems.length) {
            onToggleSelection(allItems[focusedIndex].fullPath);
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allItems.length) {
            const item = allItems[focusedIndex];
            if (item.type === 'folder') {
              onNavigateToFolder(item.fullPath);
            } else if (canPreviewFile(item.name)) {
              handlePreviewClick(item);
            } else {
              onDownloadFile(item);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [allItems, focusedIndex, onToggleSelection, onNavigateToFolder, onDownloadFile, handlePreviewClick]);

  const itemData = useMemo(() => ({
    items: allItems,
    selectedItems,
    onToggleSelection,
    onNavigateToFolder,
    onDownloadFile,
    onDeleteItems,
    onRenameItem,
    onMoveItem,
    onShareItem,
    onPreviewClick: handlePreviewClick,
    focusedIndex,
    setFocusedIndex
  }), [
    allItems,
    selectedItems,
    onToggleSelection,
    onNavigateToFolder,
    onDownloadFile,
    onDeleteItems,
    onRenameItem,
    onMoveItem,
    onShareItem,
    handlePreviewClick,
    focusedIndex,
    setFocusedIndex
  ]);

  if (!allItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-card rounded-xl border border-border">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-muted/30 rounded-full blur-2xl"></div>
          <Folder className="w-16 h-16 text-muted-foreground relative z-10" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">This folder is empty</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upload files or create folders to get started organizing your S3 storage
        </p>
        <div className="flex gap-3">
          <Badge variant="outline" className="text-xs">
            Drag & Drop Supported
          </Badge>
          <Badge variant="outline" className="text-xs">
            Multiple File Types
          </Badge>
        </div>
      </div>
    );
  }

  const containerHeight = Math.min(
    Math.max(400, allItems.length * ROW_HEIGHT + HEADER_HEIGHT),
    window.innerHeight * 0.7
  );

  return (
    <>
      <div
        ref={containerRef}
        className="bg-card rounded-xl border border-border overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-primary/50"
        tabIndex={0}
      >
        <BulkActionsBar
          selectedItems={selectedItems}
          onBulkAction={handleBulkAction}
        />
        <TableHeader
          selectedItems={selectedItems}
          allItems={allItems}
          onSelectAll={handleSelectAll}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <List
          ref={listRef}
          height={containerHeight - HEADER_HEIGHT - (selectedItems.size > 0 ? 60 : 0)} // Account for bulk actions bar
          itemCount={allItems.length}
          itemSize={ROW_HEIGHT}
          itemData={itemData}
          overscanCount={OVERSCAN_COUNT}
          className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
          style={{
            overflowX: 'hidden',
            contain: 'layout style paint'
          }}
        >
          {FileRow}
        </List>
        <div className="bg-muted/20 px-6 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{items.folders?.length || 0}</span> folder{(items.folders?.length || 0) !== 1 ? "s" : ""}
                <span className="mx-2">•</span>
                <span className="font-medium text-foreground">{items.files?.length || 0}</span> file{(items.files?.length || 0) !== 1 ? "s" : ""}
              </p>
              {selectedItems.size > 0 && (
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                  {selectedItems.size} selected
                </Badge>
              )}
              {allItems.length > 100 && (
                <Badge variant="outline" className="text-xs">
                  Virtualized • Rendering {Math.min(Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN_COUNT * 2, allItems.length)} of {allItems.length} items
                </Badge>
              )}
            </div>
            {items.files?.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground font-mono">
                  {formatBytes(items.files.reduce((sum, file) => sum + (file.size || 0), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <FilePreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewFile(null);
        }}
        file={previewFile}
        s3Service={s3Service}
      />
    </>
  );
}

export default React.memo(VirtualizedFileTable);