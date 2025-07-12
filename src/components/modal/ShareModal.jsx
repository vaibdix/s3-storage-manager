import React, { useState, useCallback, useEffect } from 'react';
import { Share, Copy, Check, Clock, Link } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';

const EXPIRY_OPTIONS = [
  { label: '15 minutes', value: 15 * 60 },
  { label: '30 minutes', value: 30 * 60 },
  { label: '1 hour', value: 60 * 60 },
  { label: '1 day', value: 24 * 60 * 60 },
  { label: '1 week', value: 7 * 24 * 60 * 60 }
];

function ShareModal({
  isOpen,
  onClose,
  item,
  s3Service,
  isGenerating = false
}) {
  const [selectedExpiry, setSelectedExpiry] = useState(60 * 60); // Default 1 hour
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isFolder = item?.type === 'folder';
  const itemName = item?.name || '';
  const generateUrl = useCallback(async () => {
    if (!item || !s3Service) return;

    setLoading(true);
    setError('');

    try {
      let result;
      if (isFolder) {
        setError('Folder sharing creates individual file links. Use the "Copy Links" option below.');
        setLoading(false);
        return;
      } else {
        result = s3Service.generateShareUrl(item.fullPath, selectedExpiry);
      }
      setShareUrl(result.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [item, s3Service, selectedExpiry, isFolder]);
  useEffect(() => {
    if (isOpen && item) {
      generateUrl();
    }
  }, [isOpen, item, selectedExpiry, generateUrl]);

  const copyToClipboard = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);
  const handleExpiryChange = useCallback((newExpiry) => {
    setSelectedExpiry(newExpiry);
    setCopied(false);
  }, []);
  const handleClose = useCallback(() => {
    setShareUrl('');
    setError('');
    setCopied(false);
    onClose();
  }, [onClose]);
  const getExpiryLabel = (seconds) => {
    const option = EXPIRY_OPTIONS.find(opt => opt.value === seconds);
    return option ? option.label : `${seconds / 3600} hours`;
  };
  const getExpiryTime = () => {
    const expiryDate = new Date(Date.now() + (selectedExpiry * 1000));
    return expiryDate.toLocaleString();
  };
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md" onEscapeKeyDown={handleClose}>
        <DialogHeader>
          <div className="flex items-center">
            <Share className="w-5 h-5 text-primary mr-2" />
            <DialogTitle>
              Share {isFolder ? 'Folder' : 'File'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Create a shareable link for "{itemName}"
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Expiry Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Link expires in:</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPIRY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedExpiry === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleExpiryChange(option.value)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Expires: {getExpiryTime()}</span>
          </div>
        </div>

        {/* Share URL Display */}
        {shareUrl && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Share URL:</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-md font-mono"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-sm">Generating share link...</span>
          </div>
        )}

        <DialogFooter className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
          >
            Close
          </Button>
          {shareUrl && (
            <Button
              onClick={() => window.open(shareUrl, '_blank')}
              variant="outline"
            >
              <Link className="w-4 h-4 mr-2" />
              Open Link
            </Button>
          )}
        </DialogFooter>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-1">🔗 Share Link Info:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Link will expire in {getExpiryLabel(selectedExpiry)}</li>
            <li>• Anyone with this link can access the {isFolder ? 'folder contents' : 'file'}</li>
            <li>• No login or authentication required</li>
            <li>• Links cannot be revoked once created</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(ShareModal);