import sharp from "sharp";

export async function processPhoto(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize(720, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
}

export function dataUrl(buffer: Buffer, mime = "image/webp"): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
