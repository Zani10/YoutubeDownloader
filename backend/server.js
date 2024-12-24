const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const contentDisposition = require('content-disposition');

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));

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

    // Create a temporary file path
    const tempFilePath = `temp_${Date.now()}.mp4`;

    try {
      // Download video to temporary file
      await youtubedl(decodedUrl, {
        format: 'best[ext=mp4]',
        output: tempFilePath,
      });

      // Set headers for download
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', contentDisposition(`${cleanTitle}.mp4`));

      // Send the file and delete it afterward
      res.download(tempFilePath, `${cleanTitle}.mp4`, (err) => {
        // Delete the temporary file after sending
        require('fs').unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
        });

        if (err) {
          console.error('Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).send('Download failed');
          }
        }
      });

    } catch (error) {
      console.error('Download error:', error);
      // Clean up temp file if it exists
      require('fs').unlink(tempFilePath, () => {});
      throw error;
    }

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).send('Download failed');
    }
  }
});

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
      format: 'bestvideo[ext=mp4]+bestaudio/best[ext=mp4]/best', // Get best quality
    });

    // Find the best format with both video and audio
    const format = videoInfo.formats.find(f => 
      f.ext === 'mp4' && 
      f.acodec !== 'none' && 
      f.vcodec !== 'none'
    );

    if (!format) {
      throw new Error('No suitable format found');
    }

    // Format duration from seconds to MM:SS
    const duration = videoInfo.duration
      ? new Date(videoInfo.duration * 1000).toISOString().substr(14, 5)
      : 'Unknown';

    console.log('Selected format:', {
      format: format.format,
      ext: format.ext,
      filesize: format.filesize,
      resolution: `${format.width}x${format.height}`,
      fps: format.fps
    });

    res.send({
      title: videoInfo.title,
      downloadUrl: format.url,
      format: `${format.height}p`,
      isAudioIncluded: true,
      duration: duration,
      thumbnail: videoInfo.thumbnail,
      filesize: format.filesize,
      description: videoInfo.description || '',
      uploadDate: videoInfo.upload_date,
      views: videoInfo.view_count,
      resolution: `${format.width}x${format.height}`,
      fps: format.fps || 'Unknown',
      quality: format.height ? `${format.height}p` : 'Unknown'
    });

  } catch (error) {
    console.error('Detailed error:', error);
    
    let errorMessage = error.message;
    if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable or age-restricted';
    } else if (error.message.includes('No suitable')) {
      errorMessage = 'No suitable format found for this video';
    }

    res.status(500).send({ 
      error: 'Failed to process video',
      details: errorMessage
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
