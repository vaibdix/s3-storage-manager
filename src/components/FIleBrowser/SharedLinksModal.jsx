import React, { useState, useCallback, useEffect } from 'react';
import { Link, Copy, Check, Trash2, RefreshCw, AlertTriangle, Clock, File } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

function SharedLinksModal({
  isOpen,
  onClose,
  s3Service
}) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  const loadLinks = useCallback(() => {
    if (!s3Service || !isOpen) return;

    setLoading(true);
    try {
      const activeLinks = s3Service.getAllActiveLinks();
      setLinks(activeLinks);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  }, [s3Service, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadLinks();
      // Refresh every 30 seconds to update expired status
      const interval = setInterval(loadLinks, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadLinks]);

  const copyToClipboard = useCallback(async (url, linkId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const revokeLink = useCallback((linkId) => {
    if (s3Service.revokeSharedLink(linkId)) {
      loadLinks();
    }
  }, [s3Service, loadLinks]);

  const revokeAllLinks = useCallback(() => {
    if (window.confirm('Are you sure you want to revoke ALL shared links? This action cannot be undone.')) {
      const count = s3Service.revokeAllSharedLinks();
      loadLinks();
    }
  }, [s3Service, loadLinks]);

  const revokeExpiredLinks = useCallback(() => {
    const count = s3Service.revokeExpiredLinks();
    loadLinks();
  }, [s3Service, loadLinks]);

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const remaining = expiresAt - now;

    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const activeLinks = links.filter(link => !link.isExpired);
  const expiredLinks = links.filter(link => link.isExpired);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh]" onEscapeKeyDown={onClose}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link className="w-5 h-5 text-primary mr-2" />
              <DialogTitle>Shared Links Manager</DialogTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLinks}
                disabled={loading}
                title="Refresh links"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {expiredLinks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={revokeExpiredLinks}
                  title="Clean up expired links"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clean ({expiredLinks.length})
                </Button>
              )}
              {activeLinks.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={revokeAllLinks}
                  title="Revoke all active links"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Revoke All
                </Button>
              )}
            </div>
          </div>
          <DialogDescription>
            Manage all shared links for your S3 files. Active links can be revoked at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && links.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
              <span>Loading shared links...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Shared Links</h3>
              <p className="text-muted-foreground max-w-md">
                You haven't created any shared links yet. Share files to see them listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Links */}
              {activeLinks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-green-600" />
                      Active Links ({activeLinks.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {activeLinks.map((link) => (
                      <div key={link.id} className="border border-green-200 bg-green-50/50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <File className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <h4 className="text-sm font-medium text-foreground truncate" title={link.fullPath}>
                                {link.fileName}
                              </h4>
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                Active
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Path: {link.fullPath}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>Created: {link.createdAt.toLocaleString()}</span>
                              <span>Expires: {formatTimeRemaining(link.expiresAt)}</span>
                            </div>
                            <div className="mt-2">
                              <input
                                type="text"
                                value={link.url}
                                readOnly
                                className="w-full px-2 py-1 text-xs bg-white border border-border rounded font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(link.url, link.id)}
                              className="shrink-0"
                            >
                              {copiedLinkId === link.id ? (
                                <>
                                  <Check className="w-3 h-3 mr-1 text-green-600" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(link.url, '_blank')}
                              className="shrink-0"
                            >
                              <Link className="w-3 h-3 mr-1" />
                              Open
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeLink(link.id)}
                              className="shrink-0"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Revoke
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expired Links */}
              {expiredLinks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                      Expired Links ({expiredLinks.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {expiredLinks.map((link) => (
                      <div key={link.id} className="border border-red-200 bg-red-50/50 rounded-lg p-4 opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <File className="w-4 h-4 text-red-600 flex-shrink-0" />
                              <h4 className="text-sm font-medium text-foreground truncate" title={link.fullPath}>
                                {link.fileName}
                              </h4>
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                                Expired
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Path: {link.fullPath}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>Created: {link.createdAt.toLocaleString()}</span>
                              <span>Expired: {link.expiresAt.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeLink(link.id)}
                              className="shrink-0"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {activeLinks.length} active • {expiredLinks.length} expired • {links.length} total
            </div>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-1">🔗 Link Management:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Active links work until their expiration time</li>
            <li>• Revoked links stop working immediately</li>
            <li>• Expired links are automatically inactive but stay in the list for reference</li>
            <li>• Use "Clean" to remove expired links from the list</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(SharedLinksModal);