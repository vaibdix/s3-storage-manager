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

// ...imports remain unchanged

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onConnect(config);
    } catch (err) {
      setError(err.message);
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
  }, [setConfig]);

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);
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
            <TabsList className="grid grid-cols-2 mb-4 text-sm">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="help">Setup Guide</TabsTrigger>
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
                    onClick={clearConfig}
                    className="h-11 text-sm"
                    disabled={isConnecting}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default React.memo(S3Configuration);
