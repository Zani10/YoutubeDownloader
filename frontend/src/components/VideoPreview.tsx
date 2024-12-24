import React, { useState } from 'react';
import type { VideoDetails } from '../types';
import { API_URL } from '../api/config';

interface VideoPreviewProps {
  video: VideoDetails;
}

export function VideoPreview({ video }: VideoPreviewProps) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setError(null);
      setIsDownloading(true);
      setDownloadProgress(0);
      
      const downloadUrl = `${API_URL}/api/download-video?${new URLSearchParams({
        url: encodeURIComponent(video.downloadUrl),
        title: encodeURIComponent(video.title)
      }).toString()}`;

      // Start download with fetch to track progress
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed to start');
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;
      const reader = response.body?.getReader();

      if (!reader) throw new Error('Failed to initialize download');

      // Create a new blob to store the video data
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total) {
          // Update progress if we know the total size
          const progress = (received / total) * 100;
          setDownloadProgress(Math.round(progress));
        }
      }

      // Combine all chunks and download
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setIsDownloading(false);
      setDownloadProgress(0);

    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? error.message : 'Download failed');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown date';
    return new Date(
      dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
    ).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img 
        src={video.thumbnail} 
        alt={video.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">{video.title}</h2>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p>Duration: {video.duration || 'Unknown'}</p>
            <p>Quality: {video.quality || video.format || 'Unknown'} 
              {video.fps && video.fps !== 'Unknown' ? ` ${video.fps}fps` : ''}
            </p>
            <p>Size: {formatFileSize(video.filesize)}</p>
          </div>
          <div>
            <p>Upload Date: {formatDate(video.uploadDate)}</p>
            <p>Views: {video.views ? video.views.toLocaleString() : 'Unknown'}</p>
            <p>Resolution: {video.resolution || video.format || 'Unknown'}</p>
          </div>
        </div>

        {isDownloading ? (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Downloading...</span>
              <span>{downloadProgress}%</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleDownload}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Download Video
          </button>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center mt-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}