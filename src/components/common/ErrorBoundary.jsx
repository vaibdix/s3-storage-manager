// components/common/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: null
    };
  }
  static getDerivedStateFromError(error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId, lastErrorTime: new Date() };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    };
    console.log('Error report generated:', errorReport);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReset = () => {
    try {
      localStorage.removeItem('s3-config');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
    window.location.reload();
  };

  handleReportBug = () => {
    const bugReport = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      timestamp: this.state.lastErrorTime?.toISOString(),
      retryCount: this.state.retryCount,
      url: window.location.href
    };
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2)).then(() => {
      alert('Bug report copied to clipboard! Please paste it when reporting the issue.');
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId, retryCount, lastErrorTime } = this.state;
      const isRecurringError = retryCount > 2;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl"></div>
                  <AlertTriangle className="relative w-16 h-16 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {isRecurringError ? 'Persistent Error Detected' : 'Something Went Wrong'}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {isRecurringError
                  ? 'The application has encountered repeated errors. This might indicate a more serious issue.'
                  : 'The application encountered an unexpected error, but you can try to recover.'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Details */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Error Details</h4>
                  <Badge variant="outline" className="font-mono text-xs">
                    {errorId}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Message:</strong> {error?.message || 'Unknown error'}
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Time:</strong> {lastErrorTime?.toLocaleString()}
                </p>
                {retryCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Retry Attempts:</strong> {retryCount}
                  </p>
                )}
              </div>

              {/* Recovery Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!isRecurringError ? (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full"
                    size="lg"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                ) : (
                  <Button
                    onClick={this.handleReset}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Reset Application
                  </Button>
                )}

                <Button
                  onClick={this.handleReportBug}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              {/* Recovery Tips */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">
                  💡 Recovery Tips
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Try refreshing the page if the error persists</li>
                  <li>• Check your internet connection</li>
                  <li>• Verify your AWS S3 credentials are still valid</li>
                  <li>• Clear your browser cache if issues continue</li>
                  {isRecurringError && (
                    <li>• Consider updating your browser or trying a different one</li>
                  )}
                </ul>
              </div>

              {/* Technical Details (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-sm mb-2">
                    Technical Details (Development)
                  </summary>
                  <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{error?.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;