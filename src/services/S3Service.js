// services/S3Service.js

import { CHUNK_SIZE, SIGNED_URL_EXPIRES, AWS_SDK_URL } from '../utils/constants';
import { validateConfig } from '../utils/validators';

export class S3Service {
  constructor() {
    this.s3 = null;
    this.bucketName = '';
    this.isConfigured = false;
    this.folderMetadataCache = new Map(); // Cache for folder metadata
    this.activeSharedLinks = new Map(); // Track active shared links
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
      const result = await this.s3.listObjectsV2(params).promise();

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
        onProgress?.(progress, evt.loaded);
      })
      .promise();
  }

  async multipartUpload(file, key, onProgress) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let totalUploaded = 0;

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

        totalUploaded += chunk.size;
        const progress = Math.round((totalUploaded * 100) / file.size);
        onProgress?.(progress, totalUploaded);
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

  generateShareUrl(key, expiresInSeconds = 3600) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!key) throw new Error('Object key is required');

    try {
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresInSeconds,
        ResponseContentDisposition: 'inline' // Display in browser instead of download
      });

      // Track the shared link
      const linkId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const expiryDate = new Date(Date.now() + (expiresInSeconds * 1000));

      this.activeSharedLinks.set(linkId, {
        id: linkId,
        key: key,
        url: url,
        fileName: key.split('/').pop() || key,
        fullPath: key,
        createdAt: new Date(),
        expiresAt: expiryDate,
        expiresInSeconds: expiresInSeconds,
        isExpired: false
      });

      // Auto-cleanup expired links
      setTimeout(() => {
        if (this.activeSharedLinks.has(linkId)) {
          const link = this.activeSharedLinks.get(linkId);
          link.isExpired = true;
        }
      }, expiresInSeconds * 1000);

      return { url, linkId };
    } catch (error) {
      console.error('Generate share URL error:', error);
      throw new Error(`Failed to generate share URL: ${error.message}`);
    }
  }

  getAllActiveLinks() {
    const now = new Date();
    const links = Array.from(this.activeSharedLinks.values())
      .map(link => ({
        ...link,
        isExpired: link.isExpired || now > link.expiresAt
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    return links;
  }

  revokeSharedLink(linkId) {
    if (this.activeSharedLinks.has(linkId)) {
      this.activeSharedLinks.delete(linkId);
      return true;
    }
    return false;
  }

  revokeAllSharedLinks() {
    const count = this.activeSharedLinks.size;
    this.activeSharedLinks.clear();
    return count;
  }

  revokeExpiredLinks() {
    const now = new Date();
    let count = 0;

    for (const [linkId, link] of this.activeSharedLinks.entries()) {
      if (link.isExpired || now > link.expiresAt) {
        this.activeSharedLinks.delete(linkId);
        count++;
      }
    }

    return count;
  }

  generateFolderShareUrls(folderPrefix, expiresInSeconds = 3600) {
    // For folders, we'll generate individual URLs for each file
    // This is a limitation of S3 - folders can't be directly shared
    return this.listObjects(folderPrefix, false).then(result => {
      const shareUrls = {};
      result.files.forEach(file => {
        shareUrls[file.name] = this.generateShareUrl(file.fullPath, expiresInSeconds);
      });
      return shareUrls;
    });
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

  async renameObject(oldKey, newKey) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!oldKey || !newKey) throw new Error('Both old and new keys are required');
    if (oldKey === newKey) throw new Error('New name must be different from current name');

    try {
      // Check if new key already exists
      try {
        await this.s3.headObject({ Bucket: this.bucketName, Key: newKey }).promise();
        throw new Error('An object with this name already exists');
      } catch (error) {
        if (error.code !== 'NotFound' && error.statusCode !== 404) {
          throw error;
        }
      }

      // Use a different approach to avoid encoding issues
      // Get the object first, then put it with new key
      const getParams = {
        Bucket: this.bucketName,
        Key: oldKey
      };

      const objectData = await this.s3.getObject(getParams).promise();

      const putParams = {
        Bucket: this.bucketName,
        Key: newKey,
        Body: objectData.Body,
        ContentType: objectData.ContentType || 'application/octet-stream',
        Metadata: objectData.Metadata || {}
      };

      // Copy additional metadata if available
      if (objectData.CacheControl) putParams.CacheControl = objectData.CacheControl;
      if (objectData.ContentDisposition) putParams.ContentDisposition = objectData.ContentDisposition;
      if (objectData.ContentEncoding) putParams.ContentEncoding = objectData.ContentEncoding;
      if (objectData.ContentLanguage) putParams.ContentLanguage = objectData.ContentLanguage;

      await this.s3.putObject(putParams).promise();
      console.log('Object uploaded with new key:', newKey);

      // Delete the old object
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: oldKey
      }).promise();
      console.log('Old object deleted:', oldKey);

      // Clear relevant cache entries
      const oldParentPrefix = oldKey.split('/').slice(0, -1).join('/') + '/';
      const newParentPrefix = newKey.split('/').slice(0, -1).join('/') + '/';
      this.folderMetadataCache.delete(oldParentPrefix);
      this.folderMetadataCache.delete(newParentPrefix);

      return true;
    } catch (error) {
      console.error('Rename error:', error);
      throw new Error(`Failed to rename: ${error.message}`);
    }
  }

  async renameFolder(oldPrefix, newPrefix) {
    if (!this.isConfigured) throw new Error('S3 not configured');
    if (!oldPrefix || !newPrefix) throw new Error('Both old and new folder paths are required');

    // Ensure prefixes end with /
    const oldFolderPrefix = oldPrefix.endsWith('/') ? oldPrefix : `${oldPrefix}/`;
    const newFolderPrefix = newPrefix.endsWith('/') ? newPrefix : `${newPrefix}/`;

    if (oldFolderPrefix === newFolderPrefix) {
      throw new Error('New folder name must be different from current name');
    }

    try {
      // For folder rename, we'll use a simpler approach
      // Just create the new folder marker and let the user manually move files if needed
      // This avoids the heavy copy operation for large folders

      // First check if folder has many objects
      const listParams = {
        Bucket: this.bucketName,
        Prefix: oldFolderPrefix,
        MaxKeys: 100 // Just check first 100 to see if it's a large folder
      };

      const result = await this.s3.listObjectsV2(listParams).promise();
      const objectCount = result.Contents?.length || 0;

      if (objectCount > 50) {
        throw new Error('Cannot rename folders with more than 50 items. Please move files manually to avoid timeouts.');
      }

      if (objectCount === 0) {
        throw new Error('Folder not found or is empty');
      }

      console.log(`Renaming folder with ${objectCount} objects`);

      // For small folders, proceed with rename
      const objects = result.Contents || [];
      const renamedObjects = [];

      // Process each object individually to avoid encoding issues
      for (const obj of objects) {
        const oldKey = obj.Key;
        const relativePath = oldKey.slice(oldFolderPrefix.length);
        const newKey = newFolderPrefix + relativePath;

        // Skip folder markers
        if (oldKey.endsWith('/') && relativePath === '') {
          continue;
        }

        try {
          // Get the object data
          const objectData = await this.s3.getObject({
            Bucket: this.bucketName,
            Key: oldKey
          }).promise();

          // Put it with the new key
          await this.s3.putObject({
            Bucket: this.bucketName,
            Key: newKey,
            Body: objectData.Body,
            ContentType: objectData.ContentType || 'application/octet-stream',
            Metadata: objectData.Metadata || {}
          }).promise();

          renamedObjects.push({ oldKey, newKey });
          console.log('Moved:', oldKey, '->', newKey);

        } catch (error) {
          console.error('Error moving object:', oldKey, error);
          throw new Error(`Failed to move ${oldKey}: ${error.message}`);
        }
      }

      // Delete old objects after successful copies
      for (const { oldKey } of renamedObjects) {
        try {
          await this.s3.deleteObject({
            Bucket: this.bucketName,
            Key: oldKey
          }).promise();
        } catch (error) {
          console.warn('Failed to delete old object:', oldKey, error);
        }
      }

      // Create the new folder marker
      await this.s3.putObject({
        Bucket: this.bucketName,
        Key: newFolderPrefix,
        Body: '',
        ContentType: 'application/x-directory'
      }).promise();

      // Try to delete the old folder marker
      try {
        await this.s3.deleteObject({
          Bucket: this.bucketName,
          Key: oldFolderPrefix
        }).promise();
      } catch (error) {
        console.warn('Failed to delete old folder marker:', error);
      }

      // Clear cache
      const oldParentPrefix = oldFolderPrefix.split('/').slice(0, -2).join('/') + '/';
      const newParentPrefix = newFolderPrefix.split('/').slice(0, -2).join('/') + '/';
      this.folderMetadataCache.delete(oldParentPrefix);
      this.folderMetadataCache.delete(newParentPrefix);
      this.folderMetadataCache.delete(oldFolderPrefix);
      this.folderMetadataCache.delete(newFolderPrefix);

      console.log('Folder renamed successfully:', oldFolderPrefix, '->', newFolderPrefix);
      return true;
    } catch (error) {
      console.error('Rename folder error:', error);
      throw new Error(`Failed to rename folder: ${error.message}`);
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
    this.activeSharedLinks.clear();
  }
}