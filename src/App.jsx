// App.jsx
import React, { useState, useCallback, useEffect } from "react";
import { ThemeProvider } from "./components/theme-provider";
import S3Configuration from "./components/S3Configuration/S3Configuration";
import FileBrowser from "./components/FileBrowser/FileBrowser";
import { S3Service } from "./services/S3Service";

// Layout
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import { useToast } from "./components/ui/use-toast";

const LoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-card p-6 rounded-lg border shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  </div>
);

function AppContent() {
  const [s3Service] = useState(() => new S3Service());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState(null);

  const { toast } = useToast();
  useEffect(() => {
    if (!isConnected) return;

    const checkHealth = async () => {
      try {
        const health = await s3Service.healthCheck();
        setConnectionHealth(health);

        if (!health.healthy) {
          toast({
            title: "Connection Issue",
            description: health.reason,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setConnectionHealth({ healthy: false, reason: error.message });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isConnected, s3Service, toast]);

  const handleConnect = useCallback(async (config) => {
    setIsConnecting(true);

    try {
      toast({
        title: "Connecting to S3",
        description: `Connecting to bucket "${config.bucketName}" in ${config.region}...`,
      });
      await s3Service.configure(config);
      setIsConnected(true);
      toast({
        title: "Connected Successfully",
        description: `Successfully connected to S3 bucket "${config.bucketName}"`,
        variant: "success",
      });
      const health = await s3Service.healthCheck();
      setConnectionHealth(health);

    } catch (error) {
      console.error("Connection error:", error);
      let errorTitle = "Connection Failed";
      let errorDescription = error.message;

      if (error.code === 'NoSuchBucket') {
        errorTitle = "Bucket Not Found";
        errorDescription = `The bucket "${config.bucketName}" does not exist in ${config.region}`;
      } else if (error.code === 'AccessDenied') {
        errorTitle = "Access Denied";
        errorDescription = "Please check your AWS credentials and bucket permissions";
      } else if (error.code === 'InvalidAccessKeyId') {
        errorTitle = "Invalid Access Key";
        errorDescription = "The provided AWS Access Key ID is invalid";
      } else if (error.code === 'SignatureDoesNotMatch') {
        errorTitle = "Invalid Secret Key";
        errorDescription = "The provided AWS Secret Access Key is invalid";
      } else if (error.retryable) {
        errorTitle = "Network Error";
        errorDescription = "Connection failed. Please check your internet connection and try again";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [s3Service, toast]);

  const handleDisconnect = useCallback(() => {
    if (window.confirm("Disconnect from S3? Any ongoing uploads will be cancelled.")) {
      try {
        const stats = s3Service.getActiveUploads?.() || [];
        s3Service.disconnect();
        setIsConnected(false);
        setConnectionHealth(null);
        let message = "Disconnected from S3";
        if (stats.length > 0) {
          message += `. ${stats.length} active upload(s) were cancelled.`;
        }
        toast({
          title: "Disconnected",
          description: message,
          variant: "default",
        });

      } catch (error) {
        console.error("Disconnect error:", error);
        toast({
          title: "Disconnect Error",
          description: "There was an issue disconnecting. Please refresh the page.",
          variant: "destructive",
        });
      }
    }
  }, [s3Service, toast]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      if (s3Service.clearCache) {
        s3Service.clearCache();
      }
      window.dispatchEvent(new CustomEvent("refreshFiles"));
      toast({
        title: "Refreshing",
        description: "File list updated",
      });

    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh file list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [s3Service, toast, isRefreshing]);

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (event.reason?.message?.includes('S3') || event.reason?.code) {
        toast({
          title: "Unexpected Error",
          description: "An unexpected error occurred. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [toast]);

  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error:', event.error);
      if (event.error?.name === 'ChunkLoadError') {
        toast({
          title: "Loading Error",
          description: "Failed to load application resources. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isConnecting && (
        <LoadingOverlay message="Connecting to S3..." />
      )}

      <Header
        isConnected={isConnected}
        s3Service={s3Service}
        onRefresh={handleRefresh}
        onDisconnect={handleDisconnect}
        isRefreshing={isRefreshing}
        connectionHealth={connectionHealth}
      />

      <main className="flex-1 ml-3 mr-3">
        {!isConnected ? (
          <ErrorBoundary>
            <S3Configuration
              onConnect={handleConnect}
              isConnecting={isConnecting}
            />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <FileBrowser
              s3Service={s3Service}
              onDisconnect={handleDisconnect}
            />
          </ErrorBoundary>
        )}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;