/**
 * Camera utilities for webcam access and ROI extraction.
 */

/**
 * Request webcam access with optimal settings for rPPG.
 * Prefers 640x480 at 30fps — higher resolution is unnecessary and wastes CPU.
 * @returns {Promise<MediaStream>}
 */
export async function startCamera() {
  const constraints = {
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    // Fallback: try without specific constraints
    if (err.name === 'OverconstrainedError') {
      return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    }
    throw err;
  }
}

/**
 * Stop all tracks on a media stream.
 * @param {MediaStream} stream
 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Extract mean RGB values from a defined ROI on a canvas.
 * The ROI is the forehead/cheek region — we use a centered rectangle
 * that roughly corresponds to where the face should be in the oval guide.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLVideoElement} video
 * @returns {{ r: number, g: number, b: number, valid: boolean }}
 */
export function extractROI(canvas, ctx, video) {
  if (!video.videoWidth || !video.videoHeight) {
    return { r: 0, g: 0, b: 0, valid: false };
  }

  // Draw current video frame to canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  // Define ROI: centered rectangle covering forehead + cheeks area
  // This corresponds to the oval face guide shown in the UI
  const roiWidth = Math.round(video.videoWidth * 0.25);
  const roiHeight = Math.round(video.videoHeight * 0.35);
  const roiX = Math.round((video.videoWidth - roiWidth) / 2);
  // Slightly above center to capture forehead area (better signal)
  const roiY = Math.round((video.videoHeight - roiHeight) / 2 - video.videoHeight * 0.05);

  try {
    const imageData = ctx.getImageData(roiX, roiY, roiWidth, roiHeight);
    const data = imageData.data;
    const numPixels = roiWidth * roiHeight;

    if (numPixels === 0) return { r: 0, g: 0, b: 0, valid: false };

    let totalR = 0, totalG = 0, totalB = 0;
    let skinPixels = 0;

    // Sample pixels and do basic skin detection
    // Skin detection helps reject non-face pixels in the ROI
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // YCbCr skin detection (works for all Fitzpatrick skin tones I-VI):
      // Convert RGB to YCbCr and check Cb/Cr ranges that cover all human skin
      // Brightness guard rejects shadows and specular highlights
      const cb = 128 + (-0.169 * r - 0.331 * g + 0.500 * b);
      const cr = 128 + (0.500 * r - 0.419 * g - 0.081 * b);
      const brightness = r + g + b;
      if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && brightness > 120 && brightness < 700) {
        totalR += r;
        totalG += g;
        totalB += b;
        skinPixels++;
      }
    }

    // Need at least 20% of ROI to be skin-like pixels
    const skinRatio = skinPixels / numPixels;
    if (skinRatio < 0.2) {
      return { r: 0, g: 0, b: 0, valid: false };
    }

    return {
      r: totalR / skinPixels,
      g: totalG / skinPixels,
      b: totalB / skinPixels,
      valid: true,
    };
  } catch (e) {
    // Canvas security error (shouldn't happen with getUserMedia)
    return { r: 0, g: 0, b: 0, valid: false };
  }
}
