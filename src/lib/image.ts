/**
 * Kamerafoto für die Übertragung verkleinern.
 *
 * Ein Foto vom iPhone ist schnell 4 MB gross. Für das Erkennen von
 * Lebensmitteln genügt deutlich weniger, und kleinere Bilder heissen kürzere
 * Wartezeit und geringere Kosten.
 */
const MAX_EDGE = 1024;
const QUALITY = 0.7;

export async function photoToDataUrl(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    return await downscale(original);
  } catch {
    return original;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

function downscale(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas nicht verfügbar'));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    image.src = dataUrl;
  });
}
