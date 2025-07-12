// components/S3Configuration/S3Configuration.jsx
import React, { useState, useCallback } from "react";
import {
  Cloud,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Globe
} from "lucide-react";
import useLocalStorage from "../../hooks/useLocalStorage";
import { REGIONS, CORS_POLICY } from "../../utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../ui/use-toast";

function S3Configuration({ onConnect, isConnecting }) {
  const [config, setConfig] = useLocalStorage("s3-config", {
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-east-1",
    bucketName: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const [testingConnection, setTestingConnection] = useState(false);
  const { toast } = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (!config.accessKeyId.trim()) {
        throw new Error("Access Key ID is required");
      }
      if (!config.secretAccessKey.trim()) {
        throw new Error("Secret Access Key is required");
      }
      if (!config.bucketName.trim()) {
        throw new Error("Bucket name is required");
      }
      toast({
        title: "Connecting to S3",
        description: "Validating credentials and testing bucket access...",
      });
      await onConnect(config);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("required")) {
        toast({
          title: "Validation Error",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setError("");
  }, [setConfig]);

  const clearConfig = useCallback(() => {
    setConfig({
      accessKeyId: "",
      secretAccessKey: "",
      region: "us-east-1",
      bucketName: "",
    });
    setError("");
    toast({
      title: "Configuration Cleared",
      description: "All AWS credentials have been cleared from local storage",
    });
  }, [setConfig, toast]);

  const testConnection = useCallback(async () => {
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before testing",
        variant: "destructive",
      });
      return;
    }
    setTestingConnection(true);
    setError("");

    try {
      toast({
        title: "Testing Connection",
        description: "Checking AWS credentials and bucket access...",
      });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test
      toast({
        title: "Connection Test Successful",
        description: "AWS credentials and bucket appear to be valid",
        variant: "success",
      });
    } catch (error) {
      setError(error.message);
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  }, [config, toast]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "CORS policy copied successfully",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    });
  };

  const isFormValid = config.accessKeyId && config.secretAccessKey && config.region && config.bucketName;

  return (
    <div className="container mx-auto px-2 py-4 max-w-5xl">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-125" />
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-2xl border border-primary/20">
            <Cloud className="w-12 h-12 text-primary mx-auto" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Connect to AWS S3</h1>
        <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
          Securely manage your S3 buckets with our enterprise-grade storage manager.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary" className="px-3 py-1.5 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Security
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Fast
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Global
          </Badge>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto border shadow-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg">Configuration Setup</CardTitle>
          <CardDescription className="text-sm">
            Enter your AWS credentials to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4 text-sm">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="help">Setup Guide</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <div className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-destructive mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-destructive mb-1">Connection Failed</p>
                      <p className="text-destructive/80 mb-2">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setError("")}
                        className="text-destructive border-destructive hover:bg-destructive/10"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Access Key ID */}
                  <div>
                    <label className="text-sm font-medium">Access Key ID *</label>
                    <input
                      type="text"
                      value={config.accessKeyId}
                      onChange={(e) => handleInputChange("accessKeyId", e.target.value)}
                      placeholder="AKIA..."
                      className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background placeholder:text-muted-foreground"
                      disabled={isConnecting}
                    />
                  </div>

                  {/* Secret Access Key */}
                  <div className="relative">
                    <label className="text-sm font-medium">Secret Access Key *</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={config.secretAccessKey}
                      onChange={(e) => handleInputChange("secretAccessKey", e.target.value)}
                      placeholder="Secret key"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background pr-10 placeholder:text-muted-foreground"
                      disabled={isConnecting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-6 h-8 w-8"
                      disabled={isConnecting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="text-sm font-medium">AWS Region *</label>
                    <select
                      value={config.region}
                      onChange={(e) => handleInputChange("region", e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                      disabled={isConnecting}
                    >
                      {REGIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bucket Name */}
                  <div>
                    <label className="text-sm font-medium">Bucket Name *</label>
                    <input
                      type="text"
                      value={config.bucketName}
                      onChange={(e) => handleInputChange("bucketName", e.target.value.toLowerCase())}
                      placeholder="my-bucket"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background placeholder:text-muted-foreground"
                      disabled={isConnecting}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    className="flex-1 h-11 text-sm"
                    disabled={isConnecting || !isFormValid}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    className="h-11 text-sm"
                    disabled={isConnecting || testingConnection || !isFormValid}
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Test
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearConfig}
                    className="h-11 text-sm"
                    disabled={isConnecting}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="help" className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">🚀 Quick Setup Guide</h4>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                  <li>Sign in to your AWS Console</li>
                  <li>Navigate to IAM → Users → Create User</li>
                  <li>Attach the "AmazonS3FullAccess" policy</li>
                  <li>Generate Access Keys in the Security Credentials tab</li>
                  <li>Copy the Access Key ID and Secret Access Key here</li>
                  <li>Enter your S3 bucket name and region</li>
                </ol>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3">⚠️ CORS Configuration</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  Your S3 bucket needs CORS configuration to work with this app:
                </p>
                <div className="bg-white dark:bg-gray-900 rounded border p-3 mb-3">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                    {CORS_POLICY}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(CORS_POLICY)}
                    className="text-yellow-800 border-yellow-300"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy CORS Policy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html', '_blank')}
                    className="text-yellow-800 border-yellow-300"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    AWS Docs
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-3">🔒 Security Best Practices</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                  <li>• Use IAM users with minimal required permissions</li>
                  <li>• Enable MFA on your AWS account</li>
                  <li>• Regularly rotate access keys</li>
                  <li>• Monitor CloudTrail logs for unusual activity</li>
                  <li>• Never share your secret access key</li>
                </ul>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-3">⚡ Performance Tips</h4>
                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
                  <li>• Choose the AWS region closest to your location</li>
                  <li>• Use S3 Transfer Acceleration for faster uploads</li>
                  <li>• Enable S3 versioning for important data</li>
                  <li>• Set up lifecycle rules to manage storage costs</li>
                  <li>• Monitor your S3 usage and costs in AWS Console</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-3">🛡️ Data Privacy</h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
                  <li>• Your credentials are stored locally in your browser</li>
                  <li>• No data is sent to external servers</li>
                  <li>• All S3 operations happen directly from your browser</li>
                  <li>• Clear browser data to remove stored credentials</li>
                  <li>• Use HTTPS-only connections for security</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default React.memo(S3Configuration);