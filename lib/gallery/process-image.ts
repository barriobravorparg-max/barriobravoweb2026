import sharp from "sharp";

const MAX_WIDTH = 1600;

export async function downloadImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar la imagen (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function resizeImage(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Limitación deliberada: sin `{ animated: true }`, un GIF animado se aplana a
  // su primer frame. El alcance actual de la galería es "solo imágenes", así que
  // lo aceptamos; si algún día se quiere conservar la animación, hay que pasar
  // `animated: true` acá (y tener en cuenta el costo de memoria por frame).
  const { data, info } = await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
}
