const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'https://youtube-downloader-wdq8.vercel.app',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.get('/api/test-ytdl', async (req, res) => {
  try {
    const version = await youtubedl('--version');
    console.log('youtube-dl version:', version);
    res.send({ success: true, version: version });
  } catch (error) {
    console.error('youtube-dl test failed:', error);
    res.status(500).send({ 
      error: 'youtube-dl not working',
      details: error.message 
    });
  }
});

app.get('/api/test-network', async (req, res) => {
  try {
    const response = await fetch('https://www.youtube.com');
    const status = response.status;
    console.log('YouTube connection test:', status);
    res.send({ 
      success: true, 
      status: status,
      message: 'Connected to YouTube'
    });
  } catch (error) {
    console.error('Network test failed:', error);
    res.status(500).send({ 
      error: 'Cannot connect to YouTube',
      details: error.message
    });
  }
});

app.post('/api/download', async (req, res) => {
  const { url } = req.body;
  console.log('Received URL:', url);

  if (!url) {
    return res.status(400).send({ error: 'URL is required' });
  }

  try {
    // Convert shorts URL to regular URL if needed
    const videoUrl = url.includes('/shorts/') 
      ? url.replace('/shorts/', '/watch?v=')
      : url;

    console.log('Processing URL:', videoUrl);

    // Try with simpler format first
    const videoInfo = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      format: 'best[ext=mp4]'
    });

    console.log('Video info received:', JSON.stringify({
      title: videoInfo?.title,
      format: videoInfo?.format,
      url: videoInfo?.url || videoInfo?.webpage_url
    }, null, 2));

    if (!videoInfo || !videoInfo.title) {
      throw new Error('Failed to fetch video information');
    }

    // Format duration
    const duration = videoInfo.duration
      ? new Date(videoInfo.duration * 1000).toISOString().substr(14, 5)
      : 'Unknown';

    // Prepare response with fallback values
    const response = {
      title: videoInfo.title,
      downloadUrl: videoInfo.url || videoInfo.webpage_url,
      format: 'mp4',
      isAudioIncluded: true,
      duration: duration,
      thumbnail: videoInfo.thumbnail || '',
      filesize: videoInfo.filesize || 0,
      description: videoInfo.description || '',
      uploadDate: videoInfo.upload_date || '',
      views: videoInfo.view_count || 0,
      resolution: videoInfo.resolution || `${videoInfo.width || 0}x${videoInfo.height || 0}`,
      fps: videoInfo.fps || 'Unknown',
      quality: videoInfo.height ? `${videoInfo.height}p` : 'Unknown'
    };

    // Validate response
    if (!response.title || !response.downloadUrl) {
      throw new Error('Invalid video information received');
    }

    console.log('Sending response:', {
      title: response.title,
      url: response.downloadUrl,
      format: response.format
    });

    res.send(response);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send({ 
      error: 'Failed to process video',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
