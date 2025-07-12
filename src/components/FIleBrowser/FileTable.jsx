// components/FileBrowser/FileTable.jsx
import React, { useCallback, useState } from "react";
import {
  Download, Eye, Folder, Trash2, MoreHorizontal, FileText, Image, Archive, Music, Video, Code, FileIcon, Loader2, Edit2, Move, Copy, Share2, GripVertical
} from "lucide-react";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { formatDate, formatFileSize } from "../../utils";
import FilePreviewModal from "../preview/FilePreviewModal";

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

function FileTable({ items, selectedItems, onToggleSelection, onNavigateToFolder, onDownloadFile, onDeleteItems, onRenameItem, onMoveItem, onShareItem, s3Service }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  const handleRowClick = useCallback(
    (item, e) => {
      if (e.target.closest("button") || e.target.closest("[role='checkbox']") || e.target.closest(".drag-handle")) return;
      if (item.type === "folder") {
        onNavigateToFolder(item.fullPath);
      } else {
        if (canPreviewFile(item.name)) {
          setPreviewFile(item);
          setShowPreview(true);
        } else {
          onDownloadFile(item);
        }
      }
    },
    [onNavigateToFolder, onDownloadFile]
  );

  const handlePreviewClick = useCallback((item, e) => {
    e.stopPropagation();
    setPreviewFile(item);
    setShowPreview(true);
  }, []);

  const handleKeyDown = useCallback(
    (e, item) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (item.type === "folder") {
          onNavigateToFolder(item.fullPath);
        } else if (canPreviewFile(item.name)) {
          setPreviewFile(item);
          setShowPreview(true);
        } else {
          onDownloadFile(item);
        }
      }
    },
    [onNavigateToFolder, onDownloadFile]
  );

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
    setBulkAction('');
  }, [selectedItems, onDownloadFile, onDeleteItems, onMoveItem]);

  const allItems = [...items.folders, ...items.files];

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

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {selectedItems.size > 0 && (
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
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                <TableHead className="w-8 px-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </TableHead>
                <TableHead className="w-12 px-4">
                  <Checkbox
                    checked={selectedItems.size === allItems.length && allItems.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        allItems.forEach(item => onToggleSelection(item.fullPath));
                      } else {
                        allItems.forEach(item => {
                          if (selectedItems.has(item.fullPath)) {
                            onToggleSelection(item.fullPath);
                          }
                        });
                      }
                    }}
                    aria-label="Select all items"
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground w-24">Size</TableHead>
                <TableHead className="font-semibold text-foreground w-40">Modified</TableHead>
                <TableHead className="font-semibold text-foreground w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item) => {
                const isSelected = selectedItems.has(item.fullPath);
                const isFolder = item.type === "folder";
                const IconComponent = isFolder ? Folder : getFileIcon(item.name);
                const isHovered = hoveredRow === item.fullPath;
                const canPreview = !isFolder && canPreviewFile(item.name);

                return (
                  <TableRow
                    key={item.fullPath}
                    className="group cursor-pointer transition-all duration-200 hover:bg-muted/40 border-b border-border/50"
                    onClick={(e) => handleRowClick(item, e)}
                    onKeyDown={(e) => handleKeyDown(e, item)}
                    onMouseEnter={() => setHoveredRow(item.fullPath)}
                    onMouseLeave={() => setHoveredRow(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${isFolder ? "Folder" : "File"}: ${item.name}`}
                    data-selected={isSelected}
                  >
                    <TableCell className="px-2">
                      <div className="drag-handle cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 transition-colors">
                        <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(item.fullPath)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <IconComponent
                            className={`w-6 h-6 transition-colors ${isFolder
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                              }`}
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium truncate transition-colors ${isFolder
                              ? "text-primary group-hover:text-primary/80"
                              : "text-foreground"
                              }`}
                            title={item.name}
                          >
                            {item.name}
                          </p>
                          {!isFolder && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.name.split('.').pop()?.toUpperCase() || 'File'}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {isFolder ? (
                        item.loading ? (
                          <div className="flex items-center">
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            <span className="text-xs">Loading...</span>
                          </div>
                        ) : item.size !== null && item.size !== undefined ? (
                          <div className="space-y-1">
                            <div>{formatFileSize(item.size)}</div>
                            {item.fileCount !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                {item.fileCount} file{item.fileCount !== 1 ? 's' : ''}
                                {item.hasMore && '+'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            —
                          </Badge>
                        )
                      ) : (
                        formatFileSize(item.size)
                      )}
                    </TableCell>

                    {/* Modified Column */}
                    <TableCell className="text-sm text-muted-foreground">
                      {isFolder ? (
                        item.loading ? (
                          <div className="flex items-center">
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            <span className="text-xs">Loading...</span>
                          </div>
                        ) : item.lastModified ? (
                          <div>{formatDate(item.lastModified)}</div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            —
                          </Badge>
                        )
                      ) : (
                        <div className="space-y-1">
                          <div>{formatDate(item.lastModified)}</div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end space-x-1">
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
                            onClick={(e) => handlePreviewClick(item, e)}
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
                            className="h-8 w-8 p-0 hover:bg-chart-1/10"
                            title={`Download ${item.name}`}
                          >
                            <Download className="w-4 h-4 text-chart-1" />
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRenameItem?.(item);
                          }}
                          className="h-8 w-8 p-0 hover:bg-chart-2/10"
                          title={`Rename ${item.name}`}
                        >
                          <Edit2 className="w-4 h-4 text-chart-2" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveItem?.(item);
                          }}
                          className="h-8 w-8 p-0 hover:bg-chart-5/10"
                          title={`Move ${item.name}`}
                        >
                          <Move className="w-4 h-4 text-chart-5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareItem?.(item);
                          }}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                          title={`Share ${item.name}`}
                        >
                          <Share2 className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItems([item.fullPath]);
                          }}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                          title={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
                                  onClick={() => handlePreviewClick(item, { stopPropagation: () => { } })}
                                  className="flex items-center space-x-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>Preview</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => onShareItem?.(item)}
                              className="flex items-center space-x-2"
                            >
                              <Share2 className="w-4 h-4" />
                              <span>Share Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                              }}
                              className="flex items-center space-x-2"
                            >
                              <Copy className="w-4 h-4" />
                              <span>Copy to...</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                              }}
                              className="flex items-center space-x-2"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Properties</span>
                            </DropdownMenuItem>
                            {!isFolder && (
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(window.location.origin + '/download/' + item.fullPath);
                                }}
                                className="flex items-center space-x-2"
                              >
                                <Copy className="w-4 h-4" />
                                <span>Copy Path</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="bg-muted/20 px-6 py-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{items.folders.length}</span> folder{items.folders.length !== 1 ? "s" : ""}
                <span className="mx-2">•</span>
                <span className="font-medium text-foreground">{items.files.length}</span> file{items.files.length !== 1 ? "s" : ""}
              </p>
              {selectedItems.size > 0 && (
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                  {selectedItems.size} selected
                </Badge>
              )}
            </div>

            {/* Total Size Display */}
            {items.files.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground font-mono">
                  {formatFileSize(items.files.reduce((sum, file) => sum + (file.size || 0), 0))}
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

export default React.memo(FileTable);