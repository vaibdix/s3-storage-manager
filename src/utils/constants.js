// utils/constants.js

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
export const SIGNED_URL_EXPIRES = 3600; // 1 hour

export const REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' }
];

export const CORS_POLICY = `[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "AllowedOrigins": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}]`;

export const AWS_SDK_URL = 'https://sdk.amazonaws.com/js/aws-sdk-2.1691.0.min.js';