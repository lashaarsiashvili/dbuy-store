import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function generateFavicons() {
  const publicDir = path.join(process.cwd(), 'public');
  const svgPath = path.join(publicDir, 'favicon.svg');
  if (!fs.existsSync(svgPath)) {
    console.warn('[FAVICON] favicon.svg not found, skipping generation.');
    return;
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. High-resolution icon.png (512x512, multiple of 48, ideal for Googlebot and Social Sharing)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon.png'));
  console.log('[FAVICON] Generated public/icon.png (512x512)');

  // 2. Apple touch icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('[FAVICON] Generated public/apple-touch-icon.png (180x180)');

  // 3. Multi-size favicon.ico (16x16, 32x32, 48x48)
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(svgBuffer).resize(s, s).png().toBuffer())
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO format
  header.writeUInt16LE(sizes.length, 4); // count of images

  let offset = 6 + 16 * sizes.length;
  const dirEntries: Buffer[] = [];

  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // width
    entry.writeUInt8(s === 256 ? 0 : s, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    offset += buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('[FAVICON] Generated public/favicon.ico (16, 32, 48px)');

  // Also mirror to dist if dist exists
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.copyFileSync(path.join(publicDir, 'icon.png'), path.join(distDir, 'icon.png'));
    fs.copyFileSync(path.join(publicDir, 'apple-touch-icon.png'), path.join(distDir, 'apple-touch-icon.png'));
    fs.copyFileSync(path.join(publicDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
    console.log('[FAVICON] Mirrored favicon assets to dist/');
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-favicons.ts')) {
  generateFavicons().catch(console.error);
}
