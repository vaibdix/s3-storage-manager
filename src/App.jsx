import React, { useState, useCallback } from "react";
import { ThemeProvider } from "./components/theme-provider";
import S3Configuration from "./components/S3Configuration/S3Configuration";
import { FileBrowser } from "./components/FIleBrowser/FileBrowser";
import { S3Service } from "./services/S3Service";

// Layout
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

function App() {
  const [s3Service] = useState(() => new S3Service());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleConnect = useCallback(async (config) => {
    setIsConnecting(true);
    try {
      await s3Service.configure(config);
      setIsConnected(true);
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [s3Service]);

  const handleDisconnect = useCallback(() => {
    if (window.confirm("Disconnect from S3?")) {
      s3Service.disconnect();
      setIsConnected(false);
    }
  }, [s3Service]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("refreshFiles"));
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background flex flex-col">
        <Header
          isConnected={isConnected}
          s3Service={s3Service}
          onRefresh={handleRefresh}
          onDisconnect={handleDisconnect}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 ml-3 mr-3">
          {!isConnected ? (
            <S3Configuration
              onConnect={handleConnect}
              isConnecting={isConnecting}
            />
          ) : (
            <FileBrowser
              s3Service={s3Service}
              onDisconnect={handleDisconnect}
            />
          )}
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
