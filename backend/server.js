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
    // Get video info
    const videoInfo = await youtubedl(url, {
      dumpSingleJson: true,
      format: 'best[ext=mp4]'
    });

    // Validate required fields
    if (!videoInfo || !videoInfo.title || !videoInfo.url) {
      throw new Error('Invalid video information received');
    }

    console.log('Video info:', {
      title: videoInfo.title,
      url: videoInfo.url,
      format: videoInfo.format
    });

    // Format duration
    const duration = videoInfo.duration
      ? new Date(videoInfo.duration * 1000).toISOString().substr(14, 5)
      : 'Unknown';

    // Prepare response with fallback values
    const response = {
      title: videoInfo.title,
      downloadUrl: videoInfo.url,
      format: 'mp4',
      isAudioIncluded: true,
      duration: duration,
      thumbnail: videoInfo.thumbnail || '',
      filesize: videoInfo.filesize || 0,
      description: videoInfo.description || '',
      uploadDate: videoInfo.upload_date || '',
      views: videoInfo.view_count || 0,
      resolution: videoInfo.resolution || 'Unknown',
      fps: videoInfo.fps || 'Unknown',
      quality: videoInfo.height ? `${videoInfo.height}p` : 'Unknown'
    };

    console.log('Sending response:', response);
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
