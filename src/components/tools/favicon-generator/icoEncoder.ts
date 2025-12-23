/**
 * ICO file encoder - converts multiple PNG images into a single ICO file.
 * Modern browsers accept PNG data embedded in ICO files (since IE11).
 *
 * ICO format structure:
 * - 6-byte header (reserved, type=1, image count)
 * - 16-byte directory entry per image
 * - Concatenated image data (PNG format)
 */

export interface IcoImage {
  width: number;
  height: number;
  data: ArrayBuffer;
}

/**
 * Encode multiple PNG images into a single ICO file
 */
export function encodeIco(images: IcoImage[]): Blob {
  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const directorySize = images.length * DIR_ENTRY_SIZE;

  // Calculate data offsets for each image
  let dataOffset = HEADER_SIZE + directorySize;
  const offsets: number[] = [];
  for (const img of images) {
    offsets.push(dataOffset);
    dataOffset += img.data.byteLength;
  }

  // Build ICO header
  const header = new ArrayBuffer(HEADER_SIZE);
  const headerView = new DataView(header);
  headerView.setUint16(0, 0, true); // Reserved, must be 0
  headerView.setUint16(2, 1, true); // Type: 1 = ICO
  headerView.setUint16(4, images.length, true); // Number of images

  // Build directory entries
  const directory = new ArrayBuffer(directorySize);
  const dirView = new DataView(directory);

  images.forEach((img, i) => {
    const base = i * DIR_ENTRY_SIZE;
    // Width (0 means 256)
    dirView.setUint8(base + 0, img.width < 256 ? img.width : 0);
    // Height (0 means 256)
    dirView.setUint8(base + 1, img.height < 256 ? img.height : 0);
    // Color palette size (0 for no palette)
    dirView.setUint8(base + 2, 0);
    // Reserved
    dirView.setUint8(base + 3, 0);
    // Color planes (1 for ICO)
    dirView.setUint16(base + 4, 1, true);
    // Bits per pixel (32 for RGBA PNG)
    dirView.setUint16(base + 6, 32, true);
    // Size of image data
    dirView.setUint32(base + 8, img.data.byteLength, true);
    // Offset to image data
    dirView.setUint32(base + 12, offsets[i], true);
  });

  // Combine all parts into final ICO blob
  return new Blob(
    [header, directory, ...images.map((img) => img.data)],
    { type: "image/x-icon" }
  );
}
