// utils/validators.js

export const validateConfig = (config) => {
  const { accessKeyId, secretAccessKey, region, bucketName } = config;
  if (!accessKeyId?.trim()) {
    throw new Error('Access Key ID is required');
  }
  if (!secretAccessKey?.trim()) {
    throw new Error('Secret Access Key is required');
  }
  if (!region?.trim()) {
    throw new Error('Region is required');
  }
  if (!bucketName?.trim()) {
    throw new Error('Bucket name is required');
  }
  if (!/^[a-z0-9.-]{3,63}$/.test(bucketName)) {
    throw new Error('Invalid bucket name format. Must be 3-63 characters, lowercase letters, numbers, dots, and hyphens only.');
  }
  if (bucketName.includes('..')) {
    throw new Error('Bucket name cannot contain consecutive dots');
  }
  if (!/^[a-z0-9]/.test(bucketName) || !/[a-z0-9]$/.test(bucketName)) {
    throw new Error('Bucket name must start and end with a letter or number');
  }
};

export const validateFileName = (fileName) => {
  if (!fileName || fileName.trim().length === 0) {
    throw new Error('File name cannot be empty');
  }
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(fileName)) {
    throw new Error('File name contains invalid characters');
  }
  return true;
};

export const validateFolderName = (folderName) => {
  if (!folderName || folderName.trim().length === 0) {
    throw new Error('Folder name cannot be empty');
  }
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(folderName)) {
    throw new Error('Folder name contains invalid characters');
  }
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(folderName.toUpperCase())) {
    throw new Error('Folder name cannot be a reserved system name');
  }
  return true;
};