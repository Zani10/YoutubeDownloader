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

app.post('/api/download', async (req, res) => {
  const { url } = req.body;
  console.log('Received URL:', url);

  if (!url) {
    return res.status(400).send({ error: 'URL is required' });
  }

  try {
    // Log the youtube-dl version
    try {
      const version = await youtubedl('--version');
      console.log('youtube-dl version:', version);
    } catch (e) {
      console.error('Error getting youtube-dl version:', e);
    }

    // Convert shorts URL to regular URL if needed
    const videoUrl = url.includes('/shorts/') 
      ? url.replace('/shorts/', '/watch?v=')
      : url;

    console.log('Processing URL:', videoUrl);

    // Get video info with format that worked before
    const videoInfo = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      format: 'bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best'
    });

    console.log('Raw video info:', JSON.stringify(videoInfo, null, 2));

    if (!videoInfo) {
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
