export type DownloadState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'downloading'; progress: number }
  | { status: 'success'; downloadUrl: string }
  | { status: 'error'; error: string };

export interface VideoDetails {
  title: string;
  downloadUrl: string;
  format: string;
  isAudioIncluded: boolean;
  duration?: string;
  thumbnail?: string;
  filesize?: number;
  description?: string;
  uploadDate?: string;
  views?: number;
  resolution?: string;
  fps?: number | string;
  quality?: string;
} 