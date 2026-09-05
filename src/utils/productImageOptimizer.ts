/**
 * Product Image Studio Optimizer
 * 
 * Professional studio-grade image processing on HTML5 Canvas:
 * 1. Background segmentation & cleaning (detects noisy backdrop, isolates subject)
 * 2. Studio backdrops (Clean White, Soft Gradient, Luxury Floor Shadow, Warm Minimalist, Tech Dark)
 * 3. Perfect subject centering with ideal e-commerce framing (12% margin)
 * 4. Realistic multi-layer grounding contact floor shadow (anchors product to surface)
 * 5. High-definition sharpness convolution filter & micro-contrast enhancement
 * 6. Preserves 100% authentic product identity (does not alter actual product shape, labels, or colors)
 * 7. Strictly isolated to the target product/image — never mutates other products!
 */

export type StudioBackgroundStyle = 
  | 'studio-clean'      // Amazon / Apple pure white studio with soft radial falloff
  | 'studio-gradient'   // Modern luxury studio with subtle vertical lighting
  | 'luxury-shadow'     // Pure white with pronounced realistic 3D floor shadow
  | 'warm-minimalist'   // Warm clay / linen aesthetic studio
  | 'tech-dark';        // Charcoal spotlight for gadgets & tech

export interface ImageOptimizationOptions {
  style?: StudioBackgroundStyle;
  brightness?: number;      // -50 to 50 (default: 6)
  contrast?: number;        // -50 to 50 (default: 12)
  sharpness?: number;       // 0 to 100 (default: 35)
  shadowIntensity?: number; // 0 to 100 (default: 45)
  zoom?: number;            // 0.7 to 1.3 (default: 1.0)
  removeBackground?: boolean; // true = replace background with studio backdrop (default: true)
  bgTolerance?: number;     // 10 to 60 (default: 32)
  outputQuality?: number;   // 0.8 to 0.95 (default: 0.9)
  targetSize?: number;      // default: 1024
}

export const STUDIO_STYLE_PRESETS: { id: StudioBackgroundStyle; labelKa: string; labelEn: string; icon: string; descKa: string }[] = [
  {
    id: 'studio-clean',
    labelKa: 'სუფთა სტუდია (Apple / Amazon)',
    labelEn: 'Clean Studio (Apple / Amazon)',
    icon: '🌟',
    descKa: 'თეთრი სუფთა ფონი რბილი განათებითა და კონტაქტური ჩრდილით',
  },
  {
    id: 'luxury-shadow',
    labelKa: 'ლაქშერი 3D ჩრდილი',
    labelEn: 'Luxury 3D Floor Shadow',
    icon: '💎',
    descKa: 'პრემიუმ მოცულობითი ჩრდილი, რომელიც პროდუქტს სტუდიაში აფუძნებს',
  },
  {
    id: 'studio-gradient',
    labelKa: 'თანამედროვე გრადიენტი',
    labelEn: 'Modern Soft Gradient',
    icon: '🎨',
    descKa: 'დახვეწილი ნაცრისფერ-ვერცხლისფერი სტუდიური გადასვლა',
  },
  {
    id: 'warm-minimalist',
    labelKa: 'თბილი მინიმალიზმი',
    labelEn: 'Warm Minimalist Studio',
    icon: '🌿',
    descKa: 'ბუნებრივი თბილი კრემისფერი ელეგანტური ფონი',
  },
  {
    id: 'tech-dark',
    labelKa: 'მუქი ტექნო-სტუდია',
    labelEn: 'Dark Tech Spotlight',
    icon: '⚡',
    descKa: 'ღრმა გრაფიტისფერი ფონი ცენტრალური პროჟექტორით',
  },
];

/**
 * Loads an image safely with crossOrigin enabled
 */
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for optimization: ' + err));
    img.src = url;
  });
}

/**
 * Core image optimization engine
 */
export async function optimizeProductImage(
  imageSource: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const {
    style = 'studio-clean',
    brightness = 6,
    contrast = 12,
    sharpness = 35,
    shadowIntensity = 45,
    zoom = 1.0,
    removeBackground = true,
    bgTolerance = 32,
    outputQuality = 0.90,
    targetSize = 1024,
  } = options;

  const img = await loadImageElement(imageSource);

  // 1. Analyze and extract subject bounds
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = img.naturalWidth || img.width;
  rawCanvas.height = img.naturalHeight || img.height;
  const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
  if (!rawCtx) throw new Error('Could not create canvas context');

  rawCtx.drawImage(img, 0, 0);
  const imgData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
  const { data, width, height } = imgData;

  // Background color sampling from perimeter border pixels (top, bottom, left, right)
  const samplePoints: [number, number][] = [];
  const stepX = Math.max(1, Math.floor(width / 20));
  const stepY = Math.max(1, Math.floor(height / 20));

  for (let x = 0; x < width; x += stepX) {
    samplePoints.push([x, 0]);
    samplePoints.push([x, height - 1]);
  }
  for (let y = 0; y < height; y += stepY) {
    samplePoints.push([0, y]);
    samplePoints.push([width - 1, y]);
  }

  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  for (const [sx, sy] of samplePoints) {
    const idx = (sy * width + sx) * 4;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
    count++;
  }
  const bgR = count > 0 ? totalR / count : 255;
  const bgG = count > 0 ? totalG / count : 255;
  const bgB = count > 0 ? totalB / count : 255;

  // Color distance helper
  const colorDist = (r: number, g: number, b: number, refR: number, refG: number, refB: number) => {
    return Math.sqrt(
      Math.pow(r - refR, 2) * 0.299 +
      Math.pow(g - refG, 2) * 0.587 +
      Math.pow(b - refB, 2) * 0.114
    );
  };

  // Connected flood-fill segmentation starting from image perimeter
  // Visited array: 0 = unvisited, 1 = background, 2 = subject
  const isBackground = new Uint8Array(width * height);
  const queue: number[] = [];

  const threshold = Math.max(15, Math.min(75, bgTolerance));

  // Seed boundary pixels that match the background profile
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const idx = (y * width + x) * 4;
      const d = colorDist(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);
      if (d <= threshold * 1.35 || data[idx + 3] < 30) {
        const pIdx = y * width + x;
        if (!isBackground[pIdx]) {
          isBackground[pIdx] = 1;
          queue.push(pIdx);
        }
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const idx = (y * width + x) * 4;
      const d = colorDist(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);
      if (d <= threshold * 1.35 || data[idx + 3] < 30) {
        const pIdx = y * width + x;
        if (!isBackground[pIdx]) {
          isBackground[pIdx] = 1;
          queue.push(pIdx);
        }
      }
    }
  }

  // Breadth-First-Search traversal to mark all connected exterior background
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % width;
    const cy = Math.floor(cur / width);

    // 4-neighborhood
    const neighbors = [
      cx > 0 ? cur - 1 : -1,
      cx < width - 1 ? cur + 1 : -1,
      cy > 0 ? cur - width : -1,
      cy < height - 1 ? cur + width : -1,
    ];

    for (const n of neighbors) {
      if (n >= 0 && isBackground[n] === 0) {
        const nIdx = n * 4;
        const a = data[nIdx + 3];
        if (a < 30) {
          isBackground[n] = 1;
          queue.push(n);
          continue;
        }
        const dist = colorDist(data[nIdx], data[nIdx + 1], data[nIdx + 2], bgR, bgG, bgB);
        if (dist <= threshold) {
          isBackground[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // Find tight bounding box of the non-background subject
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let subjectPixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pIdx = y * width + x;
      if (isBackground[pIdx] === 0) {
        subjectPixelCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const subjectFound = subjectPixelCount > (width * height * 0.01) && maxX > minX && maxY > minY;
  if (!subjectFound) {
    minX = 0;
    minY = 0;
    maxX = width;
    maxY = height;
  } else {
    // Subtle breathing margin
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width, maxX + pad);
    maxY = Math.min(height, maxY + pad);
  }

  const subW = maxX - minX;
  const subH = maxY - minY;

  // Create isolated canvas with transparent background and anti-aliased feathering
  const isolatedCanvas = document.createElement('canvas');
  isolatedCanvas.width = width;
  isolatedCanvas.height = height;
  const isoCtx = isolatedCanvas.getContext('2d');
  if (!isoCtx) throw new Error('Could not create isolated canvas');

  if (removeBackground && subjectFound) {
    const isoImgData = isoCtx.createImageData(width, height);
    const isoData = isoImgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pIdx = y * width + x;
        const iIdx = pIdx * 4;

        if (isBackground[pIdx] === 1) {
          isoData[iIdx] = data[iIdx];
          isoData[iIdx + 1] = data[iIdx + 1];
          isoData[iIdx + 2] = data[iIdx + 2];
          isoData[iIdx + 3] = 0; // Fully transparent
        } else {
          // Check if adjacent to background for soft edge feathering
          let bgNeighborCount = 0;
          if (x > 0 && isBackground[pIdx - 1]) bgNeighborCount++;
          if (x < width - 1 && isBackground[pIdx + 1]) bgNeighborCount++;
          if (y > 0 && isBackground[pIdx - width]) bgNeighborCount++;
          if (y < height - 1 && isBackground[pIdx + width]) bgNeighborCount++;

          isoData[iIdx] = data[iIdx];
          isoData[iIdx + 1] = data[iIdx + 1];
          isoData[iIdx + 2] = data[iIdx + 2];
          
          if (bgNeighborCount > 0) {
            isoData[iIdx + 3] = Math.round(255 * (1 - (bgNeighborCount * 0.18)));
          } else {
            isoData[iIdx + 3] = data[iIdx + 3];
          }
        }
      }
    }
    isoCtx.putImageData(isoImgData, 0, 0);
  } else {
    // Keep original image as is
    isoCtx.drawImage(rawCanvas, 0, 0);
  }

  // 2. Prepare Studio Output Canvas (Square targetSize x targetSize)
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create output canvas context');

  // 3. Paint chosen Studio Backdrop
  renderStudioBackground(ctx, style, targetSize);

  // 4. Calculate Centering & Proportional Scale
  // Standard product photography leaves ~12-14% margin around product
  const maxContentDim = targetSize * 0.76 * Math.min(Math.max(zoom, 0.6), 1.4);
  const scale = Math.min(maxContentDim / subW, maxContentDim / subH);
  const finalW = subW * scale;
  const finalH = subH * scale;

  // Center horizontally, slightly elevate vertically to allow floor shadow room
  const finalX = (targetSize - finalW) / 2;
  const finalY = (targetSize - finalH) / 2 - (targetSize * 0.02);

  // 5. Render Grounding Contact Floor Shadow
  if (shadowIntensity > 0 && style !== 'tech-dark') {
    renderFloorShadow(ctx, finalX, finalY, finalW, finalH, shadowIntensity / 100);
  } else if (style === 'tech-dark') {
    renderTechDarkShadow(ctx, finalX, finalY, finalW, finalH, shadowIntensity / 100);
  }

  // 6. Draw Isolated Subject onto Studio Canvas
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    isolatedCanvas,
    minX, minY, subW, subH,
    finalX, finalY, finalW, finalH
  );
  ctx.restore();

  // 7. Post-Processing: Sharpness, Brightness & Micro-Contrast Enhancement
  applyImageEnhancements(ctx, targetSize, {
    brightness,
    contrast,
    sharpness,
  });

  return outCanvas.toDataURL('image/jpeg', outputQuality);
}

/**
 * Paints high-end studio lighting backdrop
 */
function renderStudioBackground(
  ctx: CanvasRenderingContext2D,
  style: StudioBackgroundStyle,
  size: number
) {
  const cx = size / 2;
  const cy = size / 2;

  switch (style) {
    case 'studio-clean': {
      // Pure White Studio with subtle vignette & soft top illumination
      const grad = ctx.createRadialGradient(cx, cy * 0.7, size * 0.1, cx, cy, size * 0.85);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.55, '#FDFDFE');
      grad.addColorStop(0.85, '#F4F5F7');
      grad.addColorStop(1, '#E9EBF0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'luxury-shadow': {
      // Pristine gallery white surface
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Subtle atmospheric top gradient
      const topGlow = ctx.createLinearGradient(0, 0, 0, size * 0.4);
      topGlow.addColorStop(0, 'rgba(248, 250, 252, 0.8)');
      topGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, size, size * 0.4);
      break;
    }

    case 'studio-gradient': {
      // Modern neutral slate studio
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#F8FAFC');
      grad.addColorStop(0.4, '#F1F5F9');
      grad.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Soft central spotlight
      const spot = ctx.createRadialGradient(cx, cy * 0.65, 0, cx, cy * 0.65, size * 0.65);
      spot.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      spot.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'warm-minimalist': {
      // Warm organic studio (sand / linen)
      const grad = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, size * 0.8);
      grad.addColorStop(0, '#FDFBF7');
      grad.addColorStop(0.7, '#F7F2EA');
      grad.addColorStop(1, '#EDE5D8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'tech-dark': {
      // Deep charcoal with blue-tinted spotlight
      const grad = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, size * 0.75);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(0.5, '#0F172A');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      break;
    }
  }
}

/**
 * Realistic multi-layer grounding floor shadow
 */
function renderFloorShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number
) {
  ctx.save();

  const shadowY = y + h - (h * 0.04);
  const shadowCenterX = x + (w / 2);
  const shadowRadiusX = (w * 0.42);
  const shadowRadiusY = Math.max(12, h * 0.07);

  // 1. Occlusion Shadow (dark contact point directly below product base)
  const contactGrad = ctx.createRadialGradient(
    shadowCenterX, shadowY, 2,
    shadowCenterX, shadowY, shadowRadiusX * 0.75
  );
  contactGrad.addColorStop(0, `rgba(20, 24, 33, ${0.45 * intensity})`);
  contactGrad.addColorStop(0.4, `rgba(30, 41, 59, ${0.25 * intensity})`);
  contactGrad.addColorStop(1, 'rgba(30, 41, 59, 0)');

  ctx.fillStyle = contactGrad;
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, shadowY, shadowRadiusX * 0.8, shadowRadiusY * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Soft Diffused Ambient Floor Penumbra (spreads softly outward)
  const ambientGrad = ctx.createRadialGradient(
    shadowCenterX, shadowY + 6, shadowRadiusX * 0.2,
    shadowCenterX, shadowY + 6, shadowRadiusX * 1.3
  );
  ambientGrad.addColorStop(0, `rgba(15, 23, 42, ${0.28 * intensity})`);
  ambientGrad.addColorStop(0.5, `rgba(30, 41, 59, ${0.12 * intensity})`);
  ambientGrad.addColorStop(1, 'rgba(30, 41, 59, 0)');

  ctx.fillStyle = ambientGrad;
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, shadowY + 6, shadowRadiusX * 1.25, shadowRadiusY * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Ambient spotlight shadow for dark tech mode
 */
function renderTechDarkShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number
) {
  ctx.save();
  const shadowY = y + h - (h * 0.03);
  const shadowCenterX = x + (w / 2);
  const shadowRadiusX = (w * 0.45);
  const shadowRadiusY = Math.max(14, h * 0.08);

  // Subtle cyan/blue ambient grounding glow
  const glowGrad = ctx.createRadialGradient(
    shadowCenterX, shadowY, 0,
    shadowCenterX, shadowY, shadowRadiusX * 1.1
  );
  glowGrad.addColorStop(0, `rgba(56, 189, 248, ${0.18 * intensity})`);
  glowGrad.addColorStop(0.5, `rgba(37, 99, 235, ${0.08 * intensity})`);
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, shadowY + 2, shadowRadiusX * 1.1, shadowRadiusY * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Convolution sharpening & color enhancement filter
 */
function applyImageEnhancements(
  ctx: CanvasRenderingContext2D,
  size: number,
  opts: { brightness: number; contrast: number; sharpness: number }
) {
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // 1. Micro-contrast & Brightness curves
  const brightOffset = (opts.brightness / 100) * 255;
  const contrastFactor = (259 * (opts.contrast + 255)) / (255 * (259 - opts.contrast));

  for (let i = 0; i < data.length; i += 4) {
    // Contrast + Brightness
    let r = contrastFactor * (data[i] - 128) + 128 + brightOffset;
    let g = contrastFactor * (data[i + 1] - 128) + 128 + brightOffset;
    let b = contrastFactor * (data[i + 2] - 128) + 128 + brightOffset;

    // Slight vibrance boost
    const maxVal = Math.max(r, g, b);
    const avgVal = (r + g + b) / 3;
    const saturation = (maxVal - avgVal) / (maxVal || 1);
    const vibranceMultiplier = 1 + (0.15 * (1 - saturation));

    r = avgVal + (r - avgVal) * vibranceMultiplier;
    g = avgVal + (g - avgVal) * vibranceMultiplier;
    b = avgVal + (b - avgVal) * vibranceMultiplier;

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(imgData, 0, 0);

  // 2. Unsharp Mask Sharpening (if enabled)
  if (opts.sharpness > 0) {
    const sharpnessFactor = (opts.sharpness / 100) * 0.35;
    applyConvolutionSharpen(ctx, size, sharpnessFactor);
  }
}

/**
 * 3x3 Convolution Sharpening Kernel
 */
function applyConvolutionSharpen(
  ctx: CanvasRenderingContext2D,
  size: number,
  amount: number
) {
  const src = ctx.getImageData(0, 0, size, size);
  const dst = ctx.createImageData(size, size);
  const sData = src.data;
  const dData = dst.data;

  // Kernel weights: [ 0, -k, 0,  -k, 1+4k, -k,  0, -k, 0 ]
  const k = amount;
  const center = 1 + (4 * k);

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = (y * size + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = ((y - 1) * size + x) * 4 + c;
        const bottom = ((y + 1) * size + x) * 4 + c;
        const left = (y * size + (x - 1)) * 4 + c;
        const right = (y * size + (x + 1)) * 4 + c;
        const cur = idx + c;

        const val = 
          sData[cur] * center -
          (sData[top] + sData[bottom] + sData[left] + sData[right]) * k;

        dData[cur] = Math.min(255, Math.max(0, val));
      }
      dData[idx + 3] = sData[idx + 3]; // Preserve alpha
    }
  }

  ctx.putImageData(dst, 0, 0);
}
