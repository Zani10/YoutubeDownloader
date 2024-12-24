import React, { useState } from 'react';
import { VideoInput } from './components/VideoInput';
import { Alert } from './components/Alert';
import { VideoPreview } from './components/VideoPreview';
import type { DownloadState, VideoDetails } from './types';
import { API_URL } from './api/config';

function App() {
  const [downloadState, setDownloadState] = useState<DownloadState>({ status: 'idle' });
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);

  const handleDownload = async (url: string) => {
    setDownloadState({ status: 'loading' });
    try {
      const response = await fetch(`${API_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to process video');
      }
  
      setVideoDetails(data);
      setDownloadState({ 
        status: 'success',
        downloadUrl: data.downloadUrl
      });
    } catch (error: any) {
      console.error('Frontend Error:', error.message);
      setDownloadState({ 
        status: 'error',
        error: error.message || 'Failed to process video',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            YouTube Shorts Downloader
          </h1>
          <p className="mt-2 text-gray-600">
            Download your favorite YouTube Shorts videos easily
          </p>
        </div>

        <VideoInput 
          onSubmit={handleDownload}
          isLoading={downloadState.status === 'loading'}
        />

        {downloadState.status === 'error' && (
          <Alert 
            type="error"
            message={downloadState.error || 'An error occurred'}
          />
        )}

        {downloadState.status === 'success' && videoDetails && (
          <VideoPreview video={videoDetails} />
        )}
      </div>
    </div>
  );
}

export default App;