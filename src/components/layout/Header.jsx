import React from "react";
import { Cloud, RefreshCw, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { ModeToggle } from "../mode-toggle";

function Header({ isConnected, s3Service, onRefresh, onDisconnect, isRefreshing }) {
  return (
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
  );
}

export default Header;
