const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const contentDisposition = require('content-disposition');

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'https://youtube-downloader-wdq8.vercel.app',
    'http://localhost:5173' // For local development
  ],
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
    // Get video info with simpler options
    const videoInfo = await youtubedl(url, {
      dumpSingleJson: true,
      format: 'mp4',
      noWarnings: true,
      noCallHome: true,
    });

    console.log('Raw video info:', videoInfo);

    // Basic validation
    if (!videoInfo || !videoInfo.title) {
      throw new Error('Invalid video information received');
    }

    // Format duration
    const duration = videoInfo.duration
      ? new Date(videoInfo.duration * 1000).toISOString().substr(14, 5)
      : 'Unknown';

    // Prepare response
    const response = {
      title: videoInfo.title,
      downloadUrl: videoInfo.webpage_url || url, // Use original URL as fallback
      format: 'mp4',
      isAudioIncluded: true,
      duration: duration,
      thumbnail: videoInfo.thumbnail,
      filesize: videoInfo.filesize,
      description: videoInfo.description || '',
      uploadDate: videoInfo.upload_date,
      views: videoInfo.view_count,
      resolution: videoInfo.resolution || 'Unknown',
      fps: videoInfo.fps || 'Unknown',
      quality: videoInfo.height ? `${videoInfo.height}p` : 'Unknown'
    };

    console.log('Sending response:', response);
    res.send(response);

  } catch (error) {
    console.error('Download error:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Failed to process video';
    if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable or age-restricted';
    } else if (error.message.includes('No suitable')) {
      errorMessage = 'No suitable format found for this video';
    } else if (error.message.includes('Invalid video')) {
      errorMessage = 'Invalid video URL or format';
    }

    res.status(500).send({ 
      error: 'Failed to process video',
      details: errorMessage
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
