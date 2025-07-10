import React, { useState } from "react";
import { Cloud, RefreshCw, LogOut, Link } from "lucide-react";
import { Button } from "../ui/button";
import { ModeToggle } from "../mode-toggle";
import SharedLinksModal from "../FIleBrowser/SharedLinksModal";

function Header({ isConnected, s3Service, onRefresh, onDisconnect, isRefreshing }) {
  const [showSharedLinks, setShowSharedLinks] = useState(false);

  const getActiveLinkCount = () => {
    if (!s3Service || !isConnected) return 0;
    try {
      const links = s3Service.getAllActiveLinks();
      return links.filter(link => !link.isExpired).length;
    } catch (error) {
      return error;
    }
  };

  const activeLinkCount = getActiveLinkCount();

  return (
    <>
      <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm"></div>
                <div className="relative bg-primary/10 p-2 rounded-lg border border-primary/20">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-xl font-bold text-foreground">S3 Storage Manager</h1>
                {isConnected && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Connected to{' '}
                    <span className="font-medium text-foreground">
                      {s3Service.bucketName}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {isConnected && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="hidden sm:flex"
                    title="Refresh files"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>

                  {/* Shared Links Button */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSharedLinks(true)}
                      className="flex items-center space-x-2"
                      title="Manage shared links"
                    >
                      <Link className="w-4 h-4" />
                      <span className="hidden sm:inline">Shared Links</span>
                      {activeLinkCount > 0 && (
                        <div className="flex items-center">
                          <span className="ml-1 text-xs">({activeLinkCount})</span>
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onDisconnect}
                    title="Disconnect"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Shared Links Modal */}
      <SharedLinksModal
        isOpen={showSharedLinks}
        onClose={() => setShowSharedLinks(false)}
        s3Service={s3Service}
      />
    </>
  );
}

export default Header;