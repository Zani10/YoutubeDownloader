export interface DownloadState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  downloadUrl?: string;
}

export interface VideoDetails {
  title: string;
  thumbnail: string;
  duration: string;
  downloadUrl: string;
}