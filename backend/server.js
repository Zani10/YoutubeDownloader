const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const contentDisposition = require('content-disposition');

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
    // Convert Shorts URL to regular video URL
    const videoId = url.includes('/shorts/') 
      ? url.split('/shorts/')[1].split('?')[0]
      : url.split('v=')[1]?.split('&')[0];

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const regularUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('Processing URL:', regularUrl);

    // Get video info with youtube-dl
    const videoInfo = await youtubedl(regularUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      format: 'best[ext=mp4]',
    });

    if (!videoInfo) {
      throw new Error('Failed to fetch video information');
    }

    console.log('Video info received:', videoInfo);

    // Format duration from seconds to MM:SS
    const duration = videoInfo.duration
      ? new Date(videoInfo.duration * 1000).toISOString().substr(14, 5)
      : 'Unknown';

    res.send({
      title: videoInfo.title,
      downloadUrl: videoInfo.url,
      format: videoInfo.format_note || `${videoInfo.height}p`,
      isAudioIncluded: true,
      duration: duration,
      thumbnail: videoInfo.thumbnail,
      filesize: videoInfo.filesize,
      description: videoInfo.description || '',
      uploadDate: videoInfo.upload_date,
      views: videoInfo.view_count,
      resolution: `${videoInfo.width}x${videoInfo.height}`,
      fps: videoInfo.fps || 'Unknown',
      quality: videoInfo.height ? `${videoInfo.height}p` : 'Unknown'
    });

  } catch (error) {
    console.error('Download error:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = error.message;
    if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable or age-restricted';
    } else if (error.message.includes('No suitable')) {
      errorMessage = 'No suitable format found for this video';
    } else if (error.message.includes('No video formats')) {
      errorMessage = 'Video format not available. Try another video.';
    } else if (error.message.includes('Invalid YouTube URL')) {
      errorMessage = 'Invalid YouTube URL format';
    }

    res.status(500).send({ 
      error: 'Failed to process video',
      details: errorMessage
    });
  }
});

app.get('/api/download-video', async (req, res) => {
  const { url, title } = req.query;
  
  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const cleanTitle = decodeURIComponent(title)
      .replace(/[^\w\s\-\u0600-\u06FF]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 100);

    console.log('Starting download for:', decodedUrl);

    // Download video using youtube-dl-exec
    const video = youtubedl.exec(decodedUrl, {
      format: 'best[ext=mp4]',
      output: '-', // Output to stdout
    }, { stdio: ['ignore', 'pipe'] });

    // Set headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', contentDisposition(`${cleanTitle}.mp4`));

    // Pipe the video stream to response
    video.stdout.pipe(res);

    video.stdout.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).send('Download failed');
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).send('Download failed');
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
