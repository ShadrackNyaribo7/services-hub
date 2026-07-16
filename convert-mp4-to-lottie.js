const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const path = require('path');
const fs = require('fs');

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Paths
const inputVideo = path.join(__dirname, 'public', '19115719-uhd_3840_2160_24fps.mp4');
const outputCompressed = path.join(__dirname, 'public', 'compressed-video.mp4');
const outputLottie = path.join(__dirname, 'public', 'background-animation.lottie');

async function convertMP4ToLottie() {
  console.log('Starting MP4 to Lottie conversion...');
  
  try {
    // Step 1: Compress the video first
    console.log('Step 1: Compressing video...');
    await compressVideo(inputVideo, outputCompressed);
    console.log('Video compression completed');
    
    // Step 2: Get video information
    const videoInfo = await getVideoInfo(outputCompressed);
    console.log('Video info:', videoInfo);
    
    // Step 3: Create Lottie JSON structure
    console.log('Step 2: Creating Lottie structure...');
    const lottieData = createLottieFromVideo(videoInfo, 'compressed-video.mp4');
    
    // Step 4: Write Lottie file
    fs.writeFileSync(outputLottie, JSON.stringify(lottieData, null, 2));
    console.log('Lottie file created successfully');
    
    console.log('Conversion completed!');
    console.log(`Input: ${inputVideo}`);
    console.log(`Compressed video: ${outputCompressed}`);
    console.log(`Lottie file: ${outputLottie}`);
    
  } catch (error) {
    console.error('Error during conversion:', error);
    throw error;
  }
}

function compressVideo(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .output(output)
      .videoCodec('libx264')
      .size('1280x720') // Reduce resolution for web
      .videoBitrate('1000k')
      .fps(24) // Reduce frame rate
      .outputOptions([
        '-preset medium',
        '-crf 28', // Quality compression (18-28, higher = more compression)
        '-movflags +faststart' // Optimize for web streaming
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

function getVideoInfo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      resolve({
        width: videoStream.width,
        height: videoStream.height,
        duration: metadata.format.duration,
        fps: eval(videoStream.r_frame_rate),
        size: metadata.format.size
      });
    });
  });
}

function createLottieFromVideo(videoInfo, videoFilename) {
  // Create a Lottie JSON structure that uses the video as an asset
  // This is a simplified approach - true video-to-vector conversion is very complex
  
  const frameRate = Math.round(videoInfo.fps);
  const totalFrames = Math.round(videoInfo.duration * frameRate);
  
  return {
    "v": "5.7.0",
    "fr": frameRate,
    "ip": 0,
    "op": totalFrames,
    "w": videoInfo.width,
    "h": videoInfo.height,
    "nm": "Background Animation",
    "ddd": 0,
    "assets": [
      {
        "id": "video_1",
        "w": videoInfo.width,
        "h": videoInfo.height,
        "u": "",
        "p": videoFilename,
        "e": 1,
        "nm": "Video Asset"
      }
    ],
    "layers": [
      {
        "ddd": 0,
        "ind": 1,
        "ty": 2, // Video layer type
        "nm": "Video Layer",
        "refId": "video_1",
        "sr": 1,
        "ks": {
          "o": { "a": 0, "k": 100, "ix": 11 },
          "r": { "a": 0, "k": 0, "ix": 10 },
          "p": { "a": 0, "k": [videoInfo.width / 2, videoInfo.height / 2, 0], "ix": 2 },
          "a": { "a": 0, "k": [0, 0, 0], "ix": 1 },
          "s": { "a": 0, "k": [100, 100, 100], "ix": 6 }
        },
        "ao": 0,
        "ip": 0,
        "op": totalFrames,
        "st": 0,
        "bm": 0
      }
    ]
  };
}

// Run the conversion
convertMP4ToLottie().catch(console.error);