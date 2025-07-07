// Client-side file type utilities (no server dependencies)

const VIDEO_EXTENSIONS = [
  'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', 
  '3gp', 'ogv', 'mts', 'mxf', 'vob', 'rm', 'rmvb', 'asf', 'ts'
];

const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'
];

export function isVideoFile(filename: string): boolean {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? VIDEO_EXTENSIONS.includes(extension) : false;
}

export function isImageFile(filename: string): boolean {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.includes(extension) : false;
}

export function getFileType(filename: string): 'video' | 'image' | 'other' {
  if (!filename) return 'other';
  
  if (isVideoFile(filename)) return 'video';
  if (isImageFile(filename)) return 'image';
  
  return 'other';
}

export function getFileExtension(filename: string): string {
  if (!filename) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
}