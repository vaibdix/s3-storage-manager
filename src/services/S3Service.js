import { CHUNK_SIZE, SIGNED_URL_EXPIRES, AWS_SDK_URL } from '../utils/constants';
import { validateConfig } from '../utils/validators';
export class S3ServiceError extends Error {
  constructor(message, code, originalError = null, retryable = false) {
    super(message);
    this.name = 'S3ServiceError';
    this.code = code;
    this.originalError = originalError;
    this.retryable = retryable;
    this.timestamp = new Date();
  }
}

export class S3Service {
  constructor() {
    this.s3 = null;
    this.bucketName = '';
    this.isConfigured = false;
    this.folderMetadataCache = new Map();
    this.activeSharedLinks = new Map();
    this.activeUploads = new Map();
    this.retryDelays = [1000, 2000, 4000, 8000];
  }
  async withRetry(operation, maxRetries = 3, context = 'operation') {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw this.enhanceError(error, context, attempt);
        }
        const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
        console.warn(`${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
        await this.delay(delay);
      }
    }
    throw this.enhanceError(lastError, context, maxRetries);
  }

  isRetryableError(error) {
    const retryableCodes = [
      'NetworkError',
      'TimeoutError',
      'ServiceUnavailable',
      'InternalError',
      'SlowDown',
      'RequestTimeout',
      'BadGateway',
      'ServiceUnavailable',
      'GatewayTimeout'
    ];

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    return (
      retryableCodes.includes(error.code) ||
      retryableStatusCodes.includes(error.statusCode) ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout') ||
      error.name === 'NetworkError'
    );
  }

  enhanceError(error, context, attempts) {
    const isRetryable = this.isRetryableError(error);
    let message = `${context} failed`;
    if (attempts > 0) {
      message += ` after ${attempts + 1} attempts`;
    }
    message += `: ${error.message}`;
    const userFriendlyMessages = {
      'NoSuchBucket': 'The specified bucket does not exist',
      'AccessDenied': 'Access denied. Check your AWS credentials and bucket permissions',
      'InvalidAccessKeyId': 'Invalid AWS Access Key ID',
      'SignatureDoesNotMatch': 'Invalid AWS Secret Access Key',
      'TokenRefreshRequired': 'AWS credentials expired. Please reconnect',
      'RequestTimeTooSkewed': 'System clock is out of sync. Check your system time',
      'NetworkError': 'Network connection failed. Check your internet connection'
    };

    const userMessage = userFriendlyMessages[error.code] || message;
    return new S3ServiceError(
      userMessage,
      error.code || 'UnknownError',
      error,
      isRetryable
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async configure(config) {
    try {
      validateConfig(config);
      if (!window.AWS) {
        await this.withRetry(
          () => this.loadAWSSDK(),
          2,
          'AWS SDK loading'
        );
      }

      window.AWS.config.update({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        maxRetries: 3,
        retryDelayOptions: {
          customBackoff: function(retryCount) {
            return Math.pow(2, retryCount) * 1000;
          }
        }
      });
      this.s3 = new window.AWS.S3({
        apiVersion: '2006-03-01',
        signatureVersion: 'v4'
      });
      this.bucketName = config.bucketName;
      await this.withRetry(
        () => this.testConnection(),
        3,
        'S3 connection test'
      );
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('S3 Configuration Error:', error);
      throw error;
    }
  }

  loadAWSSDK() {
    return new Promise((resolve, reject) => {
      if (this.sdkLoading) {
        return this.sdkLoading;
      }

      const script = document.createElement('script');
      script.src = AWS_SDK_URL;

      const timeout = setTimeout(() => {
        reject(new Error('AWS SDK loading timeout'));
      }, 30000); // 30 second timeout

      script.onload = () => {
        clearTimeout(timeout);
        this.sdkLoading = null;
        resolve();
      };

      script.onerror = () => {
        clearTimeout(timeout);
        this.sdkLoading = null;
        reject(new Error('Failed to load AWS SDK'));
      };

      document.head.appendChild(script);
      this.sdkLoading = { resolve, reject };
    });
  }

  async testConnection() {
    if (!this.s3) throw new Error('S3 not initialized');

    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
    } catch (error) {
      if (error.code === 'NotFound') {
        throw new S3ServiceError(
          `Bucket '${this.bucketName}' does not exist`,
          'NoSuchBucket',
          error,
          false
        );
      } else if (error.code === 'Forbidden') {
        throw new S3ServiceError(
          `Access denied to bucket '${this.bucketName}'. Check your permissions.`,
          'AccessDenied',
          error,
          false
        );
      } else {
        throw new S3ServiceError(
          `Cannot access bucket: ${error.message}`,
          error.code || 'ConnectionError',
          error,
          true
        );
      }
    }
  }

  async getFolderMetadata(folderPrefix) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (this.folderMetadataCache.has(folderPrefix)) {
      return this.folderMetadataCache.get(folderPrefix);
    }
    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: folderPrefix,
        MaxKeys: 1000
      };

      const result = await this.withRetry(
        () => this.s3.listObjectsV2(params).promise(),
        3,
        `folder metadata for ${folderPrefix}`
      );

      let totalSize = 0;
      let lastModified = null;
      let fileCount = 0;
      for (const obj of result.Contents || []) {
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
        hasMore: false,
        error: error.message
      };
    }
  }

  async listObjects(prefix = '', includeFolderMetadata = false) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    const cleanPrefix = prefix === '' ? '' : (prefix.endsWith('/') ? prefix : `${prefix}/`);
    const params = {
      Bucket: this.bucketName,
      Prefix: cleanPrefix,
      Delimiter: '/',
      MaxKeys: 1000
    };

    try {
      const result = await this.withRetry(
        () => this.s3.listObjectsV2(params).promise(),
        3,
        `listing objects for ${cleanPrefix || 'root'}`
      );
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
              loading: false,
              error: metadata.error
            };
          } catch (error) {
            console.error(`Error getting metadata for folder ${folder.name}:`, error);
            return {
              ...folder,
              loading: false,
              error: error.message
            };
          }
        });

        folders = await Promise.all(folderPromises);
      }

      const files = (result.Contents || [])
        .filter(obj => {
          if (obj.Key === cleanPrefix) return false;
          if (obj.Key.endsWith('/')) return false;

          if (cleanPrefix === '') {
            return !obj.Key.includes('/');
          }
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
      throw error;
    }
  }

  async uploadFile(file, key, onProgress) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!file || !key) {
      throw new S3ServiceError('File and key are required', 'InvalidParams', null, false);
    }
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeUploads.set(uploadId, { file, key, startTime: Date.now() });
    try {
      let result;
      if (file.size <= CHUNK_SIZE) {
        result = await this.simpleUpload(file, key, onProgress, uploadId);
      } else {
        result = await this.multipartUpload(file, key, onProgress, uploadId);
      }
      this.activeUploads.delete(uploadId);
      return result;
    } catch (error) {
      this.activeUploads.delete(uploadId);
      throw this.enhanceError(error, `uploading ${file.name}`, 0);
    }
  }

  async simpleUpload(file, key, onProgress, uploadId) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type || 'application/octet-stream'
    };

    return new Promise((resolve, reject) => {
      const upload = this.s3.upload(params);
      if (uploadId) {
        const tracking = this.activeUploads.get(uploadId);
        if (tracking) {
          tracking.upload = upload;
        }
      }

      upload
        .on('httpUploadProgress', (evt) => {
          const progress = Math.round((evt.loaded * 100) / evt.total);
          onProgress?.(progress, evt.loaded);
        })
        .send((err, data) => {
          if (err) {
            reject(this.enhanceError(err, `uploading ${file.name}`, 0));
          } else {
            resolve(data);
          }
        });
    });
  }

  async multipartUpload(file, key, onProgress, uploadId) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let totalUploaded = 0;
    let uploadHandle = null;

    const createParams = {
      Bucket: this.bucketName,
      Key: key,
      ContentType: file.type || 'application/octet-stream'
    };

    try {
      const multipart = await this.withRetry(
        () => this.s3.createMultipartUpload(createParams).promise(),
        3,
        'creating multipart upload'
      );

      const uploadIdAWS = multipart.UploadId;
      const parts = [];
      if (uploadId) {
        const tracking = this.activeUploads.get(uploadId);
        if (tracking) {
          tracking.uploadIdAWS = uploadIdAWS;
          tracking.aborted = false;
        }
      }

      for (let i = 0; i < totalChunks; i++) {
        // Check if upload was cancelled
        const tracking = this.activeUploads.get(uploadId);
        if (tracking?.aborted) {
          throw new Error('Upload cancelled by user');
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const partParams = {
          Bucket: this.bucketName,
          Key: key,
          PartNumber: i + 1,
          UploadId: uploadIdAWS,
          Body: chunk
        };

        const partResult = await this.withRetry(
          () => this.s3.uploadPart(partParams).promise(),
          3,
          `uploading part ${i + 1}/${totalChunks}`
        );

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
        UploadId: uploadIdAWS,
        MultipartUpload: { Parts: parts }
      };

      return await this.withRetry(
        () => this.s3.completeMultipartUpload(completeParams).promise(),
        3,
        'completing multipart upload'
      );

    } catch (error) {
      if (uploadHandle?.UploadId) {
        try {
          await this.s3.abortMultipartUpload({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadHandle.UploadId
          }).promise();
        } catch (abortError) {
          console.error('Failed to abort multipart upload:', abortError);
        }
      }
      throw error;
    }
  }
  cancelUpload(uploadId) {
    const tracking = this.activeUploads.get(uploadId);
    if (tracking) {
      tracking.aborted = true;
      if (tracking.upload && typeof tracking.upload.abort === 'function') {
        tracking.upload.abort();
      }
      if (tracking.uploadIdAWS) {
        this.s3.abortMultipartUpload({
          Bucket: this.bucketName,
          Key: tracking.key,
          UploadId: tracking.uploadIdAWS
        }).promise().catch(error => {
          console.warn('Failed to abort multipart upload:', error);
        });
      }

      this.activeUploads.delete(uploadId);
      return true;
    }
    return false;
  }
  getActiveUploads() {
    return Array.from(this.activeUploads.entries()).map(([id, info]) => ({
      id,
      fileName: info.file?.name,
      key: info.key,
      startTime: info.startTime,
      duration: Date.now() - info.startTime
    }));
  }

  async deleteObjects(keys) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new S3ServiceError('Keys array is required and cannot be empty', 'InvalidParams', null, false);
    }

    try {
      if (keys.length === 1) {
        const params = { Bucket: this.bucketName, Key: keys[0] };
        return await this.withRetry(
          () => this.s3.deleteObject(params).promise(),
          3,
          `deleting ${keys[0]}`
        );
      } else {
        const params = {
          Bucket: this.bucketName,
          Delete: {
            Objects: keys.map(key => ({ Key: key })),
            Quiet: false
          }
        };
        return await this.withRetry(
          () => this.s3.deleteObjects(params).promise(),
          3,
          `deleting ${keys.length} objects`
        );
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  async createFolder(key) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!key) {
      throw new S3ServiceError('Folder key is required', 'InvalidParams', null, false);
    }

    const folderKey = key.endsWith('/') ? key : `${key}/`;

    try {
      const params = {
        Bucket: this.bucketName,
        Key: folderKey,
        Body: '',
        ContentType: 'application/x-directory'
      };

      const result = await this.withRetry(
        () => this.s3.putObject(params).promise(),
        3,
        `creating folder ${folderKey}`
      );

      console.log('Folder created:', folderKey);
      const parentPrefix = folderKey.split('/').slice(0, -2).join('/') + '/';
      this.folderMetadataCache.delete(parentPrefix);

      return result;
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    }
  }

  getDownloadUrl(key) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!key) {
      throw new S3ServiceError('Object key is required', 'InvalidParams', null, false);
    }

    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: SIGNED_URL_EXPIRES
      });
    } catch (error) {
      console.error('Generate download URL error:', error);
      throw this.enhanceError(error, 'generating download URL', 0);
    }
  }

  generateShareUrl(key, expiresInSeconds = 3600) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!key) {
      throw new S3ServiceError('Object key is required', 'InvalidParams', null, false);
    }

    try {
      const url = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresInSeconds,
        ResponseContentDisposition: 'inline'
      });
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
      setTimeout(() => {
        if (this.activeSharedLinks.has(linkId)) {
          const link = this.activeSharedLinks.get(linkId);
          link.isExpired = true;
        }
      }, expiresInSeconds * 1000);

      return { url, linkId };
    } catch (error) {
      console.error('Generate share URL error:', error);
      throw this.enhanceError(error, 'generating share URL', 0);
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

  async renameObject(oldKey, newKey) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!oldKey || !newKey) {
      throw new S3ServiceError('Both old and new keys are required', 'InvalidParams', null, false);
    }
    if (oldKey === newKey) {
      throw new S3ServiceError('New name must be different from current name', 'InvalidParams', null, false);
    }

    try {
      try {
        await this.s3.headObject({ Bucket: this.bucketName, Key: newKey }).promise();
        throw new S3ServiceError('An object with this name already exists', 'ObjectExists', null, false);
      } catch (error) {
        if (error.code !== 'NotFound' && error.statusCode !== 404) {
          throw error;
        }
      }
      const getParams = { Bucket: this.bucketName, Key: oldKey };
      const objectData = await this.withRetry(
        () => this.s3.getObject(getParams).promise(),
        3,
        `reading object ${oldKey}`
      );
      const putParams = {
        Bucket: this.bucketName,
        Key: newKey,
        Body: objectData.Body,
        ContentType: objectData.ContentType || 'application/octet-stream',
        Metadata: objectData.Metadata || {}
      };
      if (objectData.CacheControl) putParams.CacheControl = objectData.CacheControl;
      if (objectData.ContentDisposition) putParams.ContentDisposition = objectData.ContentDisposition;
      if (objectData.ContentEncoding) putParams.ContentEncoding = objectData.ContentEncoding;
      if (objectData.ContentLanguage) putParams.ContentLanguage = objectData.ContentLanguage;

      await this.withRetry(
        () => this.s3.putObject(putParams).promise(),
        3,
        `creating renamed object ${newKey}`
      );
      await this.withRetry(
        () => this.s3.deleteObject({ Bucket: this.bucketName, Key: oldKey }).promise(),
        3,
        `deleting old object ${oldKey}`
      );
      const oldParentPrefix = oldKey.split('/').slice(0, -1).join('/') + '/';
      const newParentPrefix = newKey.split('/').slice(0, -1).join('/') + '/';
      this.folderMetadataCache.delete(oldParentPrefix);
      this.folderMetadataCache.delete(newParentPrefix);

      return true;
    } catch (error) {
      console.error('Rename error:', error);
      throw error;
    }
  }

  async renameFolder(oldPrefix, newPrefix) {
    if (!this.isConfigured) {
      throw new S3ServiceError('S3 not configured', 'NotConfigured', null, false);
    }
    if (!oldPrefix || !newPrefix) {
      throw new S3ServiceError('Both old and new folder paths are required', 'InvalidParams', null, false);
    }

    const oldFolderPrefix = oldPrefix.endsWith('/') ? oldPrefix : `${oldPrefix}/`;
    const newFolderPrefix = newPrefix.endsWith('/') ? newPrefix : `${newPrefix}/`;

    if (oldFolderPrefix === newFolderPrefix) {
      throw new S3ServiceError('New folder name must be different from current name', 'InvalidParams', null, false);
    }

    try {
      const listParams = {
        Bucket: this.bucketName,
        Prefix: oldFolderPrefix,
        MaxKeys: 100
      };

      const result = await this.withRetry(
        () => this.s3.listObjectsV2(listParams).promise(),
        3,
        'checking folder contents'
      );

      const objectCount = result.Contents?.length || 0;

      if (objectCount > 50) {
        throw new S3ServiceError(
          'Cannot rename folders with more than 50 items. Please move files manually to avoid timeouts.',
          'FolderTooLarge',
          null,
          false
        );
      }

      if (objectCount === 0) {
        throw new S3ServiceError('Folder not found or is empty', 'FolderNotFound', null, false);
      }

      console.log(`Renaming folder with ${objectCount} objects`);

      const objects = result.Contents || [];
      const renamedObjects = [];
      for (const obj of objects) {
        const oldKey = obj.Key;
        const relativePath = oldKey.slice(oldFolderPrefix.length);
        const newKey = newFolderPrefix + relativePath;
        if (oldKey.endsWith('/') && relativePath === '') {
          continue;
        }
        try {
          const objectData = await this.withRetry(
            () => this.s3.getObject({ Bucket: this.bucketName, Key: oldKey }).promise(),
            3,
            `reading ${oldKey}`
          );

          await this.withRetry(
            () => this.s3.putObject({
              Bucket: this.bucketName,
              Key: newKey,
              Body: objectData.Body,
              ContentType: objectData.ContentType || 'application/octet-stream',
              Metadata: objectData.Metadata || {}
            }).promise(),
            3,
            `writing ${newKey}`
          );

          renamedObjects.push({ oldKey, newKey });
          console.log('Moved:', oldKey, '->', newKey);

        } catch (error) {
          console.error('Error moving object:', oldKey, error);
          throw new S3ServiceError(
            `Failed to move ${oldKey}: ${error.message}`,
            'ObjectMoveError',
            error,
            false
          );
        }
      }

      // Delete old objects
      for (const { oldKey } of renamedObjects) {
        try {
          await this.withRetry(
            () => this.s3.deleteObject({ Bucket: this.bucketName, Key: oldKey }).promise(),
            3,
            `deleting old ${oldKey}`
          );
        } catch (error) {
          console.warn('Failed to delete old object:', oldKey, error);
        }
      }
      await this.withRetry(
        () => this.s3.putObject({
          Bucket: this.bucketName,
          Key: newFolderPrefix,
          Body: '',
          ContentType: 'application/x-directory'
        }).promise(),
        3,
        'creating new folder marker'
      );
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
      throw error;
    }
  }
  clearCache() {
    this.folderMetadataCache.clear();
  }
  disconnect() {
    // Cancel all active uploads
    for (const [uploadId] of this.activeUploads) {
      this.cancelUpload(uploadId);
    }
    this.s3 = null;
    this.bucketName = '';
    this.isConfigured = false;
    this.folderMetadataCache.clear();
    this.activeSharedLinks.clear();
    this.activeUploads.clear();
  }
  async healthCheck() {
    if (!this.isConfigured) {
      return { healthy: false, reason: 'Not configured' };
    }

    try {
      await this.withRetry(
        () => this.s3.headBucket({ Bucket: this.bucketName }).promise(),
        1,
        'health check'
      );
      return {
        healthy: true,
        activeUploads: this.activeUploads.size,
        cacheSize: this.folderMetadataCache.size,
        activeLinks: this.activeSharedLinks.size
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message,
        error: error.code
      };
    }
  }
}