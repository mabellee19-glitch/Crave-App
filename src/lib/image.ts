/**
 * Bilder vor dem Speichern verkleinern.
 *
 * Fotos vom iPhone sind schnell 4 MB gross. Da die Bilder als Data-URL mit den
 * uebrigen Daten synchronisiert werden, werden sie hier auf eine sinnvolle
 * Kantenlaenge gebracht und als JPEG komprimiert.
 */
const MAX_EDGE = 1280;
const QUALITY = 0.72;

export async function fileToDataUrl(file: File): Promise<string> {
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
      const { width, height } = image;
      const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas nicht verfügbar'));
        return;
      }
      context.drawImage(image, 0, 0, targetW, targetH);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    image.src = dataUrl;
  });
}
