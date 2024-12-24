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
    // Get video info with thumbnail and duration
    const videoInfo = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]',
    });

    console.log('Video info received:', {
      title: videoInfo.title,
      formats: videoInfo.formats?.length || 0,
      duration: videoInfo.duration,
      filesize: videoInfo.filesize
    });

    // Get all formats and sort them by quality
    const formats = videoInfo.formats
      .filter(f => f.ext === 'mp4' && f.acodec !== 'none' && f.vcodec !== 'none')
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    // Get the best quality format
    const format = formats[0];

    if (!format) {
      throw new Error('No suitable format found');
    }

    // Format duration from seconds to MM:SS
    const duration = videoInfo.duration
      ? new Date(videoInfo.duration * 1000).toISOString().substr(14, 5)
      : 'Unknown';

    console.log('Selected format:', {
      format_id: format.format_id,
      ext: format.ext,
      resolution: format.resolution || `${format.width}x${format.height}`,
      filesize: format.filesize
    });

    res.send({
      title: videoInfo.title,
      downloadUrl: format.url,
      format: format.format_note || `${format.height}p`,
      isAudioIncluded: true,
      duration: duration,
      thumbnail: videoInfo.thumbnail,
      filesize: format.filesize,
      description: videoInfo.description || '',
      uploadDate: videoInfo.upload_date,
      views: videoInfo.view_count,
      resolution: format.resolution || `${format.width}x${format.height}`,
      fps: format.fps || 'Unknown',
      quality: format.height ? `${format.height}p` : 'Unknown'
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
