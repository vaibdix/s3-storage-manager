// utils/formatters.js

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDate = (date) => {
  if (!date) return '—';

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) return '—';

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatPath = (path) => {
  if (!path) return '';
  return path.endsWith('/') ? path : `${path}/`;
};

export const getFileExtension = (fileName) => {
  if (!fileName) return '';
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
};

export const getFileName = (fullPath) => {
  if (!fullPath) return '';
  const parts = fullPath.split('/');
  return parts[parts.length - 1] || parts[parts.length - 2];
};

export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};