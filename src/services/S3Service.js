// services/S3Service.js

import { CHUNK_SIZE, SIGNED_URL_EXPIRES, AWS_SDK_URL } from '../utils/constants';
import { validateConfig } from '../utils/validators';

export class S3Service {
  constructor() {
    this.s3 = null;
    this.bucketName = '';
    this.isConfigured = false;
    this.folderMetadataCache = new Map(); // Cache for folder metadata
  }

  async configure(config) {
    validateConfig(config);

    try {
      // Load AWS SDK if not already loaded
      if (!window.AWS) {
        await this.loadAWSSDK();
      }

      window.AWS.config.update({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region
      });

      this.s3 = new window.AWS.S3();
      this.bucketName = config.bucketName;

      // Test connection
      await this.testConnection();

      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('S3 Configuration Error:', error);
      throw new Error(`Configuration failed: ${error.message}`);
    }
  }

  loadAWSSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = AWS_SDK_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load AWS SDK'));
      document.head.appendChild(script);
    });
  }

  async testConnection() {
    if (!this.s3) throw new Error('S3 not initialized');

    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
    } catch (error) {
      if (error.code === 'NotFound') {
        throw new Error(`Bucket '${this.bucketName}' does not exist`);
      } else if (error.code === 'Forbidden') {
        throw new Error(`Access denied to bucket '${this.bucketName}'. Check your permissions.`);
      } else {
        throw new Error(`Cannot access bucket: ${error.message}`);
      }
    }
  }

  async getFolderMetadata(folderPrefix) {
    if (!this.isConfigured) throw new Error('S3 not configured');

    // Check cache first
    if (this.folderMetadataCache.has(folderPrefix)) {
      return this.folderMetadataCache.get(folderPrefix);
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: folderPrefix,
        MaxKeys: 1000 // Limit to avoid long loading times
      };

      const result = await this.s3.listObjectsV2(params).promise();

      let totalSize = 0;
      let lastModified = null;
      let fileCount = 0;

      for (const obj of result.Contents || []) {
        // Skip folder markers
        if (obj.Key.endsWith('/')) continue;

        totalSize += obj.Size || 0;
        fileCount++;

        if (!lastModified || obj.LastModified > lastModified) {
          lastModified = obj.LastModified;
        }
      }

      const metadata = {
        totalSize,
        lastModified,
        fileCount,
        hasMore: result.IsTruncated
      };

      // Cache the result for 5 minutes
      this.folderMetadataCache.set(folderPrefix, metadata);
      setTimeout(() => {
        this.folderMetadataCache.delete(folderPrefix);
      }, 5 * 60 * 1000);

      return metadata;
    } catch (error) {
      console.error('Error getting folder metadata:', error);
      return {
        totalSize: 0,
        lastModified: null,
        fileCount: 0,
        hasMore: false
      };
    }
  }

  async listObjects(prefix = '', includeFolderMetadata = false) {
    if (!this.isConfigured) throw new Error('S3 not configured');

    // Clean up the prefix
    const cleanPrefix = prefix === '' ? '' : (prefix.endsWith('/') ? prefix : `${prefix}/`);

    const params = {
      Bucket: this.bucketName,
      Prefix: cleanPrefix,
      Delimiter: '/',
      MaxKeys: 1000
    };

    try {
      console.log('S3 listObjects params:', params);
      const result = await this.s3.listObjectsV2(params).promise();
      console.log('S3 raw response:', {
        prefix: cleanPrefix,
        commonPrefixes: result.CommonPrefixes,
        contents: result.Contents,
        isTruncated: result.IsTruncated
      });

      // Process folders from CommonPrefixes
      let folders = (result.CommonPrefixes || [])
        .map(p => {
          const folderName = p.Prefix.slice(cleanPrefix.length).replace('/', '');
          return {
            name: folderName,
            fullPath: p.Prefix,
            type: 'folder',
            size: null,
            lastModified: null,
            loading: includeFolderMetadata
          };
        })
        .filter(folder => folder.name.length > 0);

      // If folder metadata is requested, fetch it for each folder
      if (includeFolderMetadata && folders.length > 0) {
        const folderPromises = folders.map(async (folder) => {
          try {
            const metadata = await this.getFolderMetadata(folder.fullPath);
            return {
              ...folder,
              size: metadata.totalSize,
              lastModified: metadata.lastModified,
              fileCount: metadata.fileCount,
              hasMore: metadata.hasMore,
              loading: false
            };
          } catch (error) {
            console.error(`Error getting metadata for folder ${folder.name}:`, error);
            return {
              ...folder,
              loading: false
            };
          }
        });

        folders = await Promise.all(folderPromises);
      }

      // Process files from Contents
      const files = (result.Contents || [])
        .filter(obj => {
          // Skip the folder marker itself
          if (obj.Key === cleanPrefix) return false;
          // Skip items that end with / (they're folder markers)
          if (obj.Key.endsWith('/')) return false;

          // For root directory, only include files without any slashes
          if (cleanPrefix === '') {
            return !obj.Key.includes('/');
          }

          // For subdirectories, include files that start with prefix but don't have additional slashes
          const relativePath = obj.Key.slice(cleanPrefix.length);
          return !relativePath.includes('/');
        })
        .map(obj => {
          const fileName = obj.Key.slice(cleanPrefix.length);
          return {
            name: fileName,
            fullPath: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            type: 'file'
          };
        });

      console.log('Processed result:', { folders, files });

      return { folders, files };
    } catch (error) {
      console.error('List objects error:', error);
      throw new Error(`Failed to list objects: ${error.message}`);
    }
  }

  async uploadFile(file, key, onProgress) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!file || !key) throw new Error('File and key are required');

    try {
      if (file.size <= CHUNK_SIZE) {
        return await this.simpleUpload(file, key, onProgress);
      } else {
        return await this.multipartUpload(file, key, onProgress);
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async simpleUpload(file, key, onProgress) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type || 'application/octet-stream'
    };

    return this.s3.upload(params)
      .on('httpUploadProgress', (evt) => {
        const progress = Math.round((evt.loaded * 100) / evt.total);
        onProgress?.(progress);
      })
      .promise();
  }

  async multipartUpload(file, key, onProgress) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const createParams = {
      Bucket: this.bucketName,
      Key: key,
      ContentType: file.type || 'application/octet-stream'
    };

    const multipart = await this.s3.createMultipartUpload(createParams).promise();
    const uploadId = multipart.UploadId;
    const parts = [];

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const partParams = {
          Bucket: this.bucketName,
          Key: key,
          PartNumber: i + 1,
          UploadId: uploadId,
          Body: chunk
        };

        const partResult = await this.s3.uploadPart(partParams).promise();
        parts.push({
          ETag: partResult.ETag,
          PartNumber: i + 1
        });

        const progress = Math.round(((i + 1) * 100) / totalChunks);
        onProgress?.(progress);
      }

      const completeParams = {
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts }
      };

      return await this.s3.completeMultipartUpload(completeParams).promise();
    } catch (error) {
      // Clean up failed multipart upload
      try {
        await this.s3.abortMultipartUpload({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId
        }).promise();
      } catch (abortError) {
        console.error('Failed to abort multipart upload:', abortError);
      }
      throw error;
    }
  }

  async deleteObjects(keys) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error('Keys array is required');
    }

    try {
      if (keys.length === 1) {
        const params = { Bucket: this.bucketName, Key: keys[0] };
        return await this.s3.deleteObject(params).promise();
      } else {
        const params = {
          Bucket: this.bucketName,
          Delete: {
            Objects: keys.map(key => ({ Key: key })),
            Quiet: false
          }
        };
        return await this.s3.deleteObjects(params).promise();
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async createFolder(key) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!key) throw new Error('Folder key is required');

    // Ensure the key ends with a slash for folder creation
    const folderKey = key.endsWith('/') ? key : `${key}/`;

    try {
      const params = {
        Bucket: this.bucketName,
        Key: folderKey,
        Body: '',
        ContentType: 'application/x-directory'
      };

      const result = await this.s3.putObject(params).promise();
      console.log('Folder created:', folderKey);

      // Clear cache for parent directory
      const parentPrefix = folderKey.split('/').slice(0, -2).join('/') + '/';
      this.folderMetadataCache.delete(parentPrefix);

      return result;
    } catch (error) {
      console.error('Create folder error:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  getDownloadUrl(key) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!key) throw new Error('Object key is required');

    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: SIGNED_URL_EXPIRES
      });
    } catch (error) {
      console.error('Generate download URL error:', error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  // Debug method to see raw S3 response
  async debugListObjects(prefix = '') {
    if (!this.isConfigured) throw new Error('S3 not configured');

    const params = {
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: 1000
    };

    try {
      const result = await this.s3.listObjectsV2(params).promise();
      console.log('Raw S3 Response for debugging:', {
        prefix: prefix,
        totalObjects: result.Contents?.length || 0,
        objects: result.Contents?.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified
        }))
      });
      return result;
    } catch (error) {
      console.error('Debug list error:', error);
      throw error;
    }
  }

  clearCache() {
    this.folderMetadataCache.clear();
  }

  disconnect() {
    this.s3 = null;
    this.bucketName = '';
    this.isConfigured = false;
    this.folderMetadataCache.clear();
  }
}