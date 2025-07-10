import React, { useCallback, useState } from "react";
import {
  Download, Eye, Folder, Trash2, MoreHorizontal, FileText, Image, Archive, Music, Video, Code, FileIcon, Loader2, Edit2, Move, Copy
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { formatDate, formatFileSize } from "../../utils";

const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const iconMap = {
    jpg: Image, jpeg: Image, png: Image, gif: Image, svg: Image, webp: Image,
    pdf: FileText, doc: FileText, docx: FileText, txt: FileText, md: FileText,
    zip: Archive, rar: Archive, '7z': Archive, tar: Archive, gz: Archive,
    mp3: Music, wav: Music, flac: Music, aac: Music,
    mp4: Video, avi: Video, mkv: Video, mov: Video, wmv: Video,
    js: Code, jsx: Code, ts: Code, tsx: Code, html: Code, css: Code, py: Code, java: Code,
  };
  return iconMap[extension] || FileIcon;
};

function FileTable({
  items,
  selectedItems,
  onToggleSelection,
  onNavigateToFolder,
  onDownloadFile,
  onDeleteItems,
  onRenameItem,
  onMoveItem
}) {
  console.log('FileTable props:', { onRenameItem, onMoveItem }); // Debug log
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleRowClick = useCallback(
    (item, e) => {
      if (e.target.closest("button") || e.target.closest("[role='checkbox']")) return;
      if (item.type === "folder") {
        onNavigateToFolder(item.fullPath);
      }
    },
    [onNavigateToFolder]
  );

  const handleKeyDown = useCallback(
    (e, item) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        item.type === "folder"
          ? onNavigateToFolder(item.fullPath)
          : onDownloadFile(item);
      }
    },
    [onNavigateToFolder, onDownloadFile]
  );

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
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
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
              <TableHead className="font-semibold text-foreground w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((item) => {
              const isSelected = selectedItems.has(item.fullPath);
              const isFolder = item.type === "folder";
              const IconComponent = isFolder ? Folder : getFileIcon(item.name);
              const isHovered = hoveredRow === item.fullPath;

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
                        <div className="flex items-center space-x-2">
                          <p
                            className={`text-sm font-medium truncate transition-colors ${isFolder
                              ? "text-primary group-hover:text-primary/80"
                              : "text-foreground"
                              }`}
                            title={item.name}
                          >
                            {item.name}
                          </p>

                        </div>
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
                      {/* Always visible actions */}
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

                      {/* Rename */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Rename clicked', item);
                          onRenameItem?.(item);
                        }}
                        className="h-8 w-8 p-0 hover:bg-chart-2/10"
                        title={`Rename ${item.name}`}
                      >
                        <Edit2 className="w-4 h-4 text-chart-2" />
                      </Button>

                      {/* Move */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Move clicked', item);
                          onMoveItem?.(item);
                        }}
                        className="h-8 w-8 p-0 hover:bg-chart-5/10"
                        title={`Move ${item.name}`}
                      >
                        <Move className="w-4 h-4 text-chart-5" />
                      </Button>

                      {/* Delete */}
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

                      {/* More options dropdown */}
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
                          <DropdownMenuItem
                            onClick={() => {
                              console.log('Copy functionality coming soon');
                            }}
                            className="flex items-center space-x-2"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy to...</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              console.log('Properties functionality coming soon');
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
                              <span>Copy Link</span>
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

      {/* Enhanced Footer */}
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
  );
}

export default React.memo(FileTable);